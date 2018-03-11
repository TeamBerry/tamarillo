import * as bodyParser from "body-parser";
import * as express from "express";
import cors = require("cors");

import BoxApi from './../api/routes/box.api';
import VideoApi from './../api/routes/video.api';
import UserApi from "./routes/user.api";

class App {
    public app: express.Application;

    constructor(){
        this.app = express();

        this.app.use(cors());

        this.middlewares();
        this.routes();
    }

    private middlewares(): void {
        this.app.use(bodyParser.json());
    }

    private routes(): void {
        this.app.use('/box', BoxApi);
        this.app.use('/video', VideoApi);
        this.app.use('/user', UserApi);
    }
}

export default new App().app;