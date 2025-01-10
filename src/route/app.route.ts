import {Router} from "express";
import botRoute from "./bot.route";

const appRoute = Router();

appRoute.get('/', (req, res) => {
    res.send('Well done you have found our API');
});

appRoute.use('/bot', botRoute);

export default appRoute;