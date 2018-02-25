import { NextFunction, Request, Response, Router } from 'express';

const Video = require("./../../models/video.model");

export class VideoApi {
    public router: Router;

    constructor() {
        this.router = Router();
        this.init();
    }

    public init() {
        this.router.get("/", this.index);
        this.router.get("/id", this.show);
        this.router.post("/", this.store);
        console.log("Video APIs initialised");
    }

    public index(req: Request, res: Response) {
        Video.find({}, (err, collection) => {
            if (err) {
                res.status(500).send(err);
            }

            if (!collection) {
                res.status(204);
            }

            res.status(200).send(collection);
        });
    }

    public show(req: Request, res: Response) {
        Video.findOne({ _id: req.params.id }, (err, document) => {
            if(err){
                res.status(500).send(err);
            }

            if(!document){
                res.status(204);
            }

            res.status(200).send(document);
        });
    }

    public store(req: Request, res: Response) {
        Video.create(req.body, (err, document) => {
            if(err){
                res.status(500).send(err);
            }

            res.status(201).send(document);
        });
    }
}

const videoApi = new VideoApi();
videoApi.init();
export default videoApi.router;
