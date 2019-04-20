import { NextFunction, Request, Response, Router } from 'express';

const Box = require("./../../models/box.schema");

export class BoxApi {
    public router: Router;

    constructor() {
        this.router = Router();
        this.init();
    }

    public init() {
        this.router.get("/", this.index);
        this.router.get("/:box", this.show);
        this.router.post("/", this.store);
        console.log("Box APIs initialised.");
    }

    public index(req: Request, res: Response) {
        console.log("INDEX OF BOXES");
        Box.find({})
            .populate('creator', '_id name')
            .populate('playlist.video')
            .populate('playlist.submitted_by', '_id name')
            .exec((err, collection) => {
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
        Box.findById(req.params.box)
            .populate('creator', '_id name')
            .populate('playlist.video')
            .populate('playlist.submitted_by', '_id name')
            .exec((err, document) => {
                if (err) {
                    res.status(500).send(err);
                }

                if (document) {
                    res.status(200).send(document);
                }

                res.status(204);
            });
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
export default boxApi.router;
