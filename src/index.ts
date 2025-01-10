import express from 'express';
import appRoute from "./route/app.route";
import dotenv from 'dotenv';
import morgan from "morgan";
import {setUp} from "./utils/setup";
import {connectDB} from "./utils/client";

dotenv.config();
const app = express();
app.use("/img", express.static("public"));
app.use(express.json());
app.use(morgan('dev'));
app.use('/api/v1', appRoute);
app.listen(process.env.PORT, async () => {
    await connectDB();
    const setup = await setUp();
    if (setup) {
        console.log('[+] Setup completed');
    }
    console.log(`Server is running on port ${process.env.PORT}`);
});