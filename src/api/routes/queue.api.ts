import { NextFunction, Request, Response, Router } from "express"
import { QueueItem } from "@teamberry/muscadine"
const auth = require("./../auth.middleware")

const Box = require("./../../models/box.model")

export class QueueApi {
    public router: Router

    constructor() {
        this.router = Router({ mergeParams: true })
        this.init()
    }

    public init(): void {
        this.router.post("/", this.submitVideo)
        this.router.put("/:video/next", this.playNext)
        this.router.put("/:video/now", this.playNow)
        this.router.put("/:video/skip", this.skipVideo)
        this.router.delete("/:video", this.removeVideo)

        this.router.param("video", async (request: Request, response: Response, next: NextFunction) => {
            const box = response.locals.box

            const matchingVideo: QueueItem = box.playlist.find((video: QueueItem) => video._id === request.params.video)

            if (!matchingVideo) {
                return response.status(404).send('VIDEO_NOT_FOUND')
            }

            response.locals.video = matchingVideo

            next()
        })
    }

    public async submitVideo(request: Request, response: Response): Promise<Response> {
        return response.status(503).send('UNDER_CONSTRUCTION')
    }

    public async playNext(request: Request, response: Response): Promise<Response> {

    }

    public async playNow(request: Request, response: Response): Promise<Response> { }

    public async skipVideo(request: Request, response: Response): Promise<Response> { }

    public async removeVideo(request: Request, response: Response): Promise<Response> {    }
}

const queueApi = new QueueApi()
export default queueApi.router
