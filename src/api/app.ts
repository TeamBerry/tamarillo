import * as bodyParser from "body-parser";
import * as express from "express";


class App {
    public express: express.Application;

    constructor(){
        this.express = express();

        this.middlewares();
        this.routes();
    }

    private middlewares(): void {
        this.express.use(bodyParser.json());
    }

    private routes(): void {

    }
}

export default new App().express;