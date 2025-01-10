import {PrismaClient} from '@prisma/client';

let prisma = new PrismaClient();
export const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log('✅  Database connected successfully');
    } catch (error) {
        console.log('❌  Database connection failed');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}
export default prisma;