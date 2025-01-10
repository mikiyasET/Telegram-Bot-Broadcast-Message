import {Router} from "express";

import {Queue, JobScheduler, Worker, Job} from "bullmq";

import Bottleneck from "bottleneck";
import axios from "axios";
import prisma from "../utils/client";
import {broadcast_status, user} from "@prisma/client";
import multer from "multer";

const botRoute = Router();
// Redis Configuration
const redisConfig = {connection: {host: '127.0.0.1', port: 6379}};
const taskQueue = new Queue('send-messages', redisConfig);
let activeTaskId: any = null;
let cancelTask = false;
let seenProgress: any[] = [];
let currentProgress = 0;
let canceled = false;

const usersPerSecond = 20;

const limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 1000 / usersPerSecond,
});

// Helper: Send Telegram Message
async function sendTelegramMessage(data: user, mid: any, jobId: any) {
    try {
        await axios(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/copyMessage`, {
            method: "POST",
            data: {
                from_chat_id: 353575758,
                chat_id: data.tg_id,
                message_id: mid
            },
        });
    } catch (e:any) {
        console.log("Error")
        console.log(e)
        const description = e.description;
        if (e.message.includes('429')) {
            try {
                await prisma.broadcast.update({
                    where: {
                        id: jobId
                    },
                    data: {
                        status: broadcast_status.errorPaused
                    }
                })
                const seconds = parseInt(e.message.split(" ")[e.message.split(" ").length - 1]);
                await new Promise(resolve => setTimeout(resolve, (1000 * seconds) + 2000));

                    await axios(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/copyMessage`, {
                        method: "POST",
                        data: {
                            from_chat_id: 353575758,
                            chat_id: data.tg_id,
                            message_id: mid
                        },
                    });

            } catch (e) {
                await new Promise(resolve => setTimeout(resolve, 20000));
            }
        }
        if (description === "Forbidden: bot was blocked by the user") {
            await prisma.user.update({
                where: {
                    id: data.id
                },
                data: {
                    status: false
                }
            })
            console.log("User " + data.first_name + " banned")
        }
    }
}

const setProgress = async (id: any, progress: number) => {
    seenProgress.push(progress);
    currentProgress = progress;
    await prisma.broadcast.update({
        where: {
            id: id
        },
        data: {
            progress: progress,
            status: broadcast_status.inProgress,
        }
    })
}
const clearValues = () => {
    activeTaskId = null;
    cancelTask = false;
    canceled = false;
    seenProgress = [];
    currentProgress = 0;
}

// Worker to Process the Queue
const worker = new Worker(
    'send-messages',
    async (job) => {
        const {batchSize, mid} = job.data;
        let offset = 0;
        const totalUsers = await prisma.user.count();

        while (true) {
            const users = await prisma.user.findMany({
                where: {
                    status: true,
                },
                skip: offset,
                take: batchSize,
            });
            if (users.length === 0 || cancelTask) {
                if (cancelTask) {
                    cancelTask = false;
                    canceled = true;
                    console.log('Task canceled');
                } else {
                    console.log('No users left');
                }
                break;
            }
            let counter = 0;
            for (const user of users) {
                await limiter.schedule(() => sendTelegramMessage(user, mid, job.id));
                counter++;
            }
            // update progress
            offset += counter;
            await job.updateProgress(offset / totalUsers * 100);
        }
        if (canceled) {
            console.log(`Job token: ${job.token}`);
            canceled = false;
            throw new Error('TASK_CANCELED');
        }

    },
    redisConfig
);

worker.on('completed', async (job: Job) => {
    console.log(`Job ${job.id} completed`);
    await prisma.broadcast.update({
        where: {
            id: job!.id
        },
        data: {
            progress: 100,
            status: broadcast_status.completed,
        }
    })
    clearValues();
});

worker.on('progress', async (job: Job) => {
    // console.log(job)
    if (typeof job.progress === 'number') {
        if (Math.floor(job.progress) > 0 && Math.floor(job.progress) > currentProgress) {
            if (Math.floor(job.progress) > 1 && !seenProgress.includes(1)) {
                await setProgress(job.id, 1);
            } else if (Math.floor(job.progress) > 5 && !seenProgress.includes(5)) {
                await setProgress(job.id, 5);
            }else if (Math.floor(job.progress) > 10 && !seenProgress.includes(10)) {
                await setProgress(job.id, 10);
            } else if (Math.floor(job.progress) > 50 && !seenProgress.includes(50)) {
                await setProgress(job.id, 25)
            } else if (Math.floor(job.progress) > 75 && !seenProgress.includes(75)) {
                await setProgress(job.id, 75)
            } else if (Math.floor(job.progress) > 90 && !seenProgress.includes(90)) {
                await setProgress(job.id, 90)
            } else if (Math.floor(job.progress) >= 100 && !seenProgress.includes(100)) {
                await setProgress(job.id, 100)
            }
        }
    }
});

worker.on('failed', async (job, err: Error) => {
    await prisma.broadcast.update({
        where: {
            id: job!.id
        },
        data: {
            status: err.message == 'TASK_CANCELED' ? broadcast_status.cancelled : broadcast_status.failed,
        }
    })
    clearValues();
})

// Express Endpoints
botRoute.post('/start', multer().any(), async (req, res) => {
    const id = req.body.mid;
    if (id) {
        if (activeTaskId) {
            return res.status(400).send('Task already running.');
        }
        const broadcast = await prisma.broadcast.create({
            data: {
                mid: id,
            }
        })
        const job = await taskQueue.add('send-messages', {batchSize: usersPerSecond, mid: id}, {
            jobId: broadcast.id,
        });
        activeTaskId = job.id;
        res.send({message: 'Task started', taskId: job.id});
    } else {
        res.status(400).send({
            message: "Message Id is required",
        })
    }
});

botRoute.get('/status', async (req, res) => {
    if (!activeTaskId) {
        return res.status(200).send({status: 'No active task'});
    }

    const job = await taskQueue.getJob(activeTaskId);
    if (!job) {
        return res.status(404).send({status: 'Task not found'});
    }
    res.send({status: job.isActive() ? `Running ${Math.floor(job.progress)}%` : 'Completed', taskId: activeTaskId});
});

botRoute.post('/cancel', async (req, res) => {
    const job = await taskQueue.getJob(activeTaskId);
    if (job) {
        try {
            await job.remove();
            clearValues();
            return res.send({message: 'Task canceled'});
        } catch (e) {
            cancelTask = true;
            return res.send({
                message: 'Task cancellation requested. Please try again in a few seconds.',
            });
        }
    } else {
        cancelTask = false;
        activeTaskId = null;
        console.log('Job not found');
    }

    activeTaskId = null;
    return res.status(404).send({message: 'Job not found'});
});

botRoute.post('/cancelAny', async (req, res) => {
    try {
        taskQueue.getActive().then(async (job) => {
            for (const j of job) {
                await j.remove();
                const broadcast = await prisma.broadcast.findUnique({
                    where: {
                        id: j.id,
                    }
                });
                if (broadcast && broadcast.status === broadcast_status.inProgress) {
                    await prisma.broadcast.update({
                        where: {
                            id: j.id,
                        },
                        data: {
                            status: broadcast_status.cancelled,
                        }
                    })
                }
            }
        });
        clearValues();
        return res.send({
            message: 'All tasks canceled',
        });
    } catch (e) {
        return res.status(500).send({
            message: 'Error canceling tasks',
        });
    }
})

// gp treading message

// await axios(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
//         method: "POST",
//         data: {
//             chat_id: "353575758",
//             text: "🚨 Important Update: This Bot is No Longer Active 🚨\n" +
//                 "\n" +
//                 "We’re excited to announce a new way to join our exclusive community!\n" +
//                 "\n" +
//                 "💎 JOIN GP VIP 💎\n\n" +
//                 "Unlock access to multiple VIP Telegram channels packed with premium trading signals across all markets, plus powerful TradingView indicators to elevate your trading game.\n" +
//                 "\n" +
//                 "✨ Enjoy a 100% Free Trial!\n\n" +
//                 "Sign up now and experience the benefits firsthand:\n" +
//                 "👉 www.whop.com/gp-free-signals\n" +
//                 "\n" +
//                 "📈 Don’t miss out—thousands of pips are waiting for you. Take your trading to the next level today! 🚀",
//             parse_mode: "HTML",
//         },
//     });

// dragon message
//     await axios(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`, {
//         method: "POST",
//         data: {
//             chat_id: "353575758",
//             caption: "<b>🐉 Dragon is Back Online! 🚀</b>\n" +
//                 "\n" +
//                 "We’re thrilled to announce that the Dragon Game is live once again! After some downtime, it’s time to jump back into the action and prepare for the upcoming airdrop event.\n" +
//                 "\n" +
//                 "If you’ve been missing the excitement, now is your chance to return, collect more coins, and get ready for incredible rewards. Visit the Earn Page to claim your progress and complete tasks to make the most out of this opportunity.\n" +
//                 "\n" +
//                 "<b>🎁 The Airdrop is Coming Soon!</b>\n\n" +
//                 "Your hard work will pay off! All the coins you’ve earned will determine the rewards you’ll receive during the airdrop. The more you collect, the better your rewards.\n" +
//                 "\n" +
//                 "<i>Start tapping and collecting coins now. Let’s make this airdrop the biggest yet! 🐲✨</i>",
//             parse_mode: "HTML",
//             photo: "https://media.licdn.com/dms/image/v2/D4E12AQF0MZ_5nAmafg/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1708708888047?e=1741824000&v=beta&t=3g_O8Miz_QIFG257GCPOBPah_JBZO0ka4zSKaL2A9qk",
//             reply_markup: {
//                 inline_keyboard: [
//                     [
//                         {
//                             text: "🎮 Play Now",
//                             web_app: {
//                                 url: "https://game.drgn.bot"
//                             }
//                         }
//                     ]
//                 ]
//             }
//         },
//     });


export default botRoute;