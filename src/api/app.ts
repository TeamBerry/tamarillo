import * as bodyParser from "body-parser";
import * as express from "express";

import BoxApi from './../api/routes/box.api';

class App {
    public app: express.Application;

    constructor(){
        this.app = express();

        this.middlewares();
        this.routes();
    }

    private middlewares(): void {
        this.app.use(bodyParser.json());
    }

    private routes(): void {
        this.app.use('/box', BoxApi);
    }
}

export default new App().app;