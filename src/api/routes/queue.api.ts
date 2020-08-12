import { NextFunction, Request, Response, Router } from "express"

import { QueueItem,  VideoSubmissionRequest, QueueItemActionRequest, BoxScope } from "@teamberry/muscadine"
const auth = require("./../middlewares/auth.middleware")
const boxMiddleware = require("./../middlewares/box.middleware")

import * as Queue from 'bull'
const queueActionsQueue = new Queue("actions-queue")

export class QueueApi {
    public router: Router

    constructor() {
        this.router = Router({ mergeParams: true })
        this.init()
    }

    public init(): void {
        this.router.get("/", [auth.canBeAuthorized, boxMiddleware.boxPrivacy], this.getQueue)

        // All subsequent routes require authentication
        this.router.use([auth.isAuthorized, boxMiddleware.boxPrivacy, boxMiddleware.boxMustBeOpen])
        this.router.post("/", this.addVideo.bind(this))
        this.router.put("/:video/next", this.playNext)
        this.router.put("/:video/now", this.playNow)
        this.router.put("/:video/skip", this.skipVideo)
        this.router.delete("/:video", this.removeVideo)

        this.router.param("video", async (request: Request, response: Response, next: NextFunction) => {
            const box = response.locals.box

            const targetVideoIndex: number = box.playlist.findIndex(
                (queueItem: QueueItem) => queueItem._id.toString() === request.params.video.toString()
            )

            if (targetVideoIndex === -1) {
                return response.status(404).send('VIDEO_NOT_FOUND')
            }

            next()
        })
    }

    public async getQueue(request: Request, response: Response): Promise<Response> {
        return response.status(200).send(response.locals.box.playlist)
    }

    public async addVideo(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth

        if (!request.body.link) {
            return response.status(412).send('MISSING_PARAMETERS')
        }

        try {
            queueActionsQueue.add({
                type: 'addVideo',
                requestContents: {
                    boxToken: request.params.box,
                    userToken: decodedToken.user,
                    link: request.body.link,
                    flag: request.body.flag ?? null
                } as VideoSubmissionRequest
            })

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send(error.message)
        }
    }

    public async playNext(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth

        try {
            queueActionsQueue.add({
                type: 'playNext',
                requestContents: {
                    boxToken: request.params.box,
                    userToken: decodedToken.user,
                    item: request.params.video
                } as QueueItemActionRequest
            })

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send(error.message)
        }
    }

    public async playNow(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth

        try {
            queueActionsQueue.add({
                type: 'playNow',
                requestContents: {
                    boxToken: request.params.box,
                    userToken: decodedToken.user,
                    item: request.params.video
                } as QueueItemActionRequest
            })

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send(error.message)
        }
    }

    public async skipVideo(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth

        try {
            queueActionsQueue.add({
                type: 'skipVideo',
                requestContents: {
                    boxToken: request.params.box,
                    userToken: decodedToken.user
                } as BoxScope
            })

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send(error.message)
        }
    }

    public async removeVideo(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth

        try {
            queueActionsQueue.add({
                type: 'removeVideo',
                requestContents: {
                    boxToken: request.params.box,
                    userToken: decodedToken.user,
                    item: request.params.video
                } as QueueItemActionRequest
            })

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send(error.message)
        }
    }
}

const queueApi = new QueueApi()
export default queueApi.router
