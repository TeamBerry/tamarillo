import { NextFunction, Request, Response, Router } from "express"

import { VideoSubmissionRequest, QueueItemActionRequest, BoxScope, PlaylistSubmissionRequest } from "@teamberry/muscadine"
const auth = require("./../middlewares/auth.middleware")
const boxMiddleware = require("./../middlewares/box.middleware")

import * as Queue from 'bull'
import { QueueItemModel } from "../../models/queue-item.model"
const queueActionsQueue = new Queue("actions-queue")

const router = Router({ mergeParams: true })

router.param("video", async (request: Request, response: Response, next: NextFunction) => {
    const box = response.locals.box

    if (!await QueueItemModel.exists({ box: box._id, _id: request.params.video})) {
        return response.status(404).send('VIDEO_NOT_FOUND')
    }

    next()
})

router.get("/", [auth.canBeAuthorized, boxMiddleware.publicOrPrivateWithSubscription], async (request: Request, response: Response) => {
    const queue = await QueueItemModel
        .find({
            box: request.params.box
        })
        .sort({ submittedAt: -1 })
        .lean()

    return response.status(200).send(queue)
})

router.post("/video", [auth.isAuthorized, boxMiddleware.publicOrPrivateWithSubscription, boxMiddleware.openOnly], async (request: Request, response: Response) => {
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
        }, {
            attempts: 10,
            removeOnComplete: true
        })

        return response.status(200).send()
    } catch (error) {
        return response.status(500).send(error.message)
    }
})

router.post("/playlist", [auth.isAuthorized, boxMiddleware.publicOrPrivateWithSubscription, boxMiddleware.openOnly], async (request: Request, response: Response) => {
    const decodedToken = response.locals.auth

    if (!request.body._id) {
        return response.status(412).send('MISSING_PARAMETERS')
    }

    try {
        queueActionsQueue.add({
            type: 'addPlaylist',
            requestContents: {
                boxToken: request.params.box,
                userToken: decodedToken.user,
                playlistId: request.body._id
            } as PlaylistSubmissionRequest
        }, {
            attempts: 10,
            removeOnComplete: true
        })

        return response.status(200).send()
    } catch (error) {
        return response.status(500).send(error.message)
    }
})

router.put("/skip", [auth.isAuthorized, boxMiddleware.publicOrPrivateWithSubscription, boxMiddleware.openOnly], async (request: Request, response: Response) => {
    const decodedToken = response.locals.auth

    try {
        queueActionsQueue.add({
            type: 'skipVideo',
            requestContents: {
                boxToken: request.params.box,
                userToken: decodedToken.user
            } as BoxScope
        }, {
            attempts: 3,
            removeOnComplete: true
        })

        return response.status(200).send()
    } catch (error) {
        return response.status(500).send(error.message)
    }
})

router.put("/:video/next", [auth.isAuthorized, boxMiddleware.publicOrPrivateWithSubscription, boxMiddleware.openOnly], async (request: Request, response: Response) => {
    const decodedToken = response.locals.auth

    try {
        queueActionsQueue.add({
            type: 'playNext',
            requestContents: {
                boxToken: request.params.box,
                userToken: decodedToken.user,
                item: request.params.video
            } as QueueItemActionRequest
        }, {
            attempts: 5,
            removeOnComplete: true
        })

        return response.status(200).send()
    } catch (error) {
        return response.status(500).send(error.message)
    }
})

router.put("/:video/now", [auth.isAuthorized, boxMiddleware.publicOrPrivateWithSubscription, boxMiddleware.openOnly], async (request: Request, response: Response) => {
    const decodedToken = response.locals.auth

    try {
        queueActionsQueue.add({
            type: 'playNow',
            requestContents: {
                boxToken: request.params.box,
                userToken: decodedToken.user,
                item: request.params.video
            } as QueueItemActionRequest
        }, {
            attempts: 5,
            removeOnComplete: true
        })

        return response.status(200).send()
    } catch (error) {
        return response.status(500).send(error.message)
    }
})

router.put("/:video/replay", [auth.isAuthorized, boxMiddleware.publicOrPrivateWithSubscription, boxMiddleware.openOnly], async (request: Request, response: Response) => {
    const decodedToken = response.locals.auth

    try {
        queueActionsQueue.add({
            type: 'replayVideo',
            requestContents: {
                boxToken: request.params.box,
                userToken: decodedToken.user,
                item: request.params.video
            } as QueueItemActionRequest
        }, {
            attempts: 5,
            removeOnComplete: true
        })

        return response.status(200).send()
    } catch (error) {
        return response.status(500).send(error.message)
    }
})

router.delete("/:video", [auth.isAuthorized, boxMiddleware.publicOrPrivateWithSubscription, boxMiddleware.openOnly], async (request: Request, response: Response) => {
    const decodedToken = response.locals.auth

    try {
        queueActionsQueue.add({
            type: 'removeVideo',
            requestContents: {
                boxToken: request.params.box,
                userToken: decodedToken.user,
                item: request.params.video
            } as QueueItemActionRequest
        }, {
            attempts: 5,
            removeOnComplete: true
        })

        return response.status(200).send()
    } catch (error) {
        return response.status(500).send(error.message)
    }
})

export const QueueApi = router
