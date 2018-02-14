import { NextFunction, Request, Response, Router } from 'express';

const Box = require("./../../models/box.model");

export class BoxApi {
    public router: Router;

    constructor() {
        this.router = Router();
    }

    public init() {
        console.log("Box APIs initialised.");
        this.router.get("/", this.index);
        this.router.post("/", this.store);
    }

    public index(req: Request, res: Response) {
        console.log("INDEX OF BOXES");
        Box.find({}, (err, collection) => {
            if (err) {
                res.status(500).send(err);
            }

            if (collection) {
                res.status(200).send(collection);
            }

            res.status(204);
        });
    }

    public show(req: Request, res: Response) {

    }

    public store(req: Request, res: Response, next: NextFunction) {
        Box.create(req.body, (err, document) => {
            if (err) {
                res.status(500).send(err);
            }
            res.status(201).send(document);
        });
    }

    public update() {

    }

    public destroy() {

    }
}

const boxApi = new BoxApi();
boxApi.init();
export default boxApi.router;