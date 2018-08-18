import { NextFunction, Request, Response, Router } from 'express';

const User = require("./../../models/user.model");

export class UserApi {
    public router: Router;

    constructor() {
        this.router = Router();
        this.init();
    }

    public init() {
        this.router.get("/:user", this.show);
        this.router.post("/", this.store);
        this.router.put("/:user", this.update);
        this.router.delete("/:user", this.destroy);
    }

    public show(req: Request, res: Response) {
        User.findOne({ _id: req.params.user })
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

    public store(req: Request, res: Response) {
        User.create(req.body, (err, document) => {
            if (err) {
                res.status(500).send(err);
            }

            res.status(201).send(document);
        });
    }

    public update(req: Request, res: Response) {

    }

    public destroy(req: Request, res: Response) {

    }
}


const userApi = new UserApi();
userApi.init();
export default userApi.router;