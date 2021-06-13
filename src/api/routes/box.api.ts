import { QueueItem } from "@teamberry/muscadine"
import { Request, Response, Router } from "express"
import { BoxJob } from "../../models/box.job"
import { UserPlaylist, UserPlaylistDocument } from "../../models/user-playlist.model"
import { Subscriber, ActiveSubscriber, PopulatedSubscriberDocument } from "../../models/subscriber.model"
import { QueueApi } from "./queue.api"
import { Invite } from "../../models/invite.model"
import { QueueItemModel } from "../../models/queue-item.model"
import { BoxInviteApi } from "./box-invites.api"
const Queue = require("bull")
const boxQueue = new Queue("box")
const auth = require("./../middlewares/auth.middleware")
const boxMiddleware = require("./../middlewares/box.middleware")

const Box = require("./../../models/box.model")

const router = Router()

router.param("box", async (request, response, next) => {
    const matchingBox = await Box.findById(request.params.box)
        .populate("creator", "_id name settings.picture")

    if (!matchingBox) {
        return response.status(404).send("BOX_NOT_FOUND")
    }

    // Give the found box to APIs so they don't have to search for it themselves
    response.locals.box = matchingBox

    next()
})

router.get("/", auth.canBeAuthorized, async (_, response) => {
    try {
        let query: unknown = { open: true, private: { $ne: true } }

        const decodedToken = response.locals.auth ?? null

        if (decodedToken && decodedToken.physalis && decodedToken.physalis === 1) {
            query = { }
        } else if (decodedToken) {
            const foreignBoxTokens: Array<string> = (
                await Subscriber
                    .find({
                        userToken: decodedToken.user,
                        role: { $ne: 'admin' }
                    })
                    .select('boxToken')
                    .lean()
            ).map(result => result.boxToken)

            query = {
                open: true,
                $or: [
                    // Public boxes
                    { private: { $ne: true } },
                    // Private boxes belonging to the user
                    {
                        $and: [
                            { private: { $ne: false } },
                            { creator: decodedToken.user }
                        ]
                    },
                    // Foreign private boxes where the user has a subscription (meaning they already have access to)
                    {
                        _id: { $in: foreignBoxTokens }
                    }
                ]
            }
        }

        const boxes: Array<any> = await Box.find(query)
            .select('_id name creator description lang open private options featured')
            .populate("creator", "_id name settings.picture")
            .lean()

        const boxTokens: Array<string> = boxes.map(box => box._id)

        // Get currently playing video
        const currentVideos = await QueueItemModel
            .find({
                box: { $in: boxTokens },
                startTime: { $ne: null },
                endTime: null
            })
            .populate('video', 'link duration name')

        boxes.forEach(box => {
            const currentVideo = currentVideos.find(video => video.box.toString() === box._id.toString())

            box.currentVideo = currentVideo ?? null
        })

        // Get watchers in each box
        const users: Array<{ _id: string, count: number }> = await Subscriber.aggregate([
            {
                $match: { "boxToken": { $in: boxTokens }, 'connexions.0': { $exists: true } }
            },
            {
                $group: {
                    _id: "$boxToken",
                    count: { $sum: 1 }
                }
            }
        ])

        users.forEach(user => {
            const boxIndex = boxes.findIndex(box => box._id.toString() === user._id.toString())

            if (boxIndex !== -1) {
                boxes[boxIndex].users = user.count
            }
        })

        return response.status(200).send(boxes)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.get("/:box", [auth.canBeAuthorized, boxMiddleware.publicOrPrivateWithSubscription], (_: Request, response: Response) => response.status(200).send(response.locals.box))

router.get("/:box/users", [auth.canBeAuthorized, boxMiddleware.publicOrPrivateWithSubscription], async (request: Request, response: Response) => {
    try {
        const activeSubscribers: Array<PopulatedSubscriberDocument> = await Subscriber
            .find({
                boxToken: request.params.box,
                userToken: { $not: /^user-[a-zA-Z0-9]{20}/ }
            })
            .populate('userToken', 'name settings.picture', 'User')
            .lean()

        const subscribers: Array<ActiveSubscriber> = activeSubscribers
            .filter(activeSubscriber => activeSubscriber.userToken)
            .map(activeSubscriber => ({
                ...activeSubscriber.userToken,
                origin: activeSubscriber?.connexions[0]?.origin ?? null,
                role: activeSubscriber.role
            }))

        return response.status(200).send(subscribers)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.use("/:box/queue", QueueApi)

router.post("/", auth.isAuthorized, async (request, response) => {
    try {
        const createdBox = await Box.create(request.body)

        return response.status(201).send(createdBox)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.put("/:box", auth.isAuthorized, async (request: Request, response: Response) => {
    try {
        if (Object.keys(request.body).length === 0) {
            return response.status(412).send("MISSING_PARAMETERS")
        }

        const originalBox = response.locals.box

        const targetId = request.params.box

        const { _id, description, lang, name, options, acl, private: isPrivate } = request.body

        if (targetId !== _id) {
            return response.status(412).send("IDENTIFIER_MISMATCH")
        }

        const updatedBox = await Box.findByIdAndUpdate(
            _id,
            {
                $set: {
                    description: description ?? originalBox.description,
                    lang: lang ?? originalBox.lang,
                    name: name ?? originalBox.name,
                    options: options ?? originalBox.options,
                    acl: acl ?? originalBox.acl,
                    private: isPrivate ?? originalBox.private
                }
            },
            {
                new: true
            }
        )
            .populate("creator", "_id name settings.picture")
            .lean()

        // If the box is set to loop, all played videos are reset
        if (options && originalBox.options.loop !== options.loop && options.loop === true) {
            await QueueItemModel.updateMany(
                { box: _id, startTime: { $ne: null }, endTime: { $ne: null } },
                {
                    $set: {
                        startTime: null,
                        endTime: null,
                        submittedAt: new Date()
                    }
                }
            )
        }

        createJob(_id, 'update')

        return response.status(200).send(updatedBox)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.patch("/:box", auth.isAuthorized, async (request: Request, response: Response) => {
    if (Object.keys(request.body).length === 0) {
        return response.status(412).send("MISSING_PARAMETERS")
    }

    if (!['random', 'loop', 'berries', 'videoMaxDurationLimit'].includes(Object.keys(request.body)[0])) {
        return response.status(412).send('UNKNOWN_PARAMETER')
    }

    const settingToUpdate = Object.keys(request.body)[0]

    const updateQuery = {}
    updateQuery[`options.${settingToUpdate}`] = request.body[settingToUpdate]

    try {

        const updatedBox = await Box.findByIdAndUpdate(
            request.params.box,
            {
                $set: updateQuery
            },
            {
                new: true
            }
        )

        createJob(request.params.box, 'update')

        return response.status(200).send(updatedBox.options)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.use("/:box/invites", BoxInviteApi)

router.post("/:box/invite", [auth.isAuthorized, boxMiddleware.openOnly], async (request: Request, response: Response) => {
    // TODO: Estimate ACL power

    try {
        const expiration = request.body.expiration ?? 900
        const invite = await Invite.create({
            boxToken: request.params.box,
            userToken: response.locals.auth.user,
            expiresAt: new Date(Date.now() + expiration * 1000)
        })

        return response.status(200).send(invite)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.post("/:box/close", auth.isAuthorized, async (request: Request, response: Response) => {
    try {
        const targetId = request.params.box

        const closedBox = await Box.findByIdAndUpdate(
            targetId,
            {
                $set: {
                    open: false,
                    featured: null
                }
            },
            {
                new: true
            }
        )

        if (!closedBox) {
            return response.status(404).send("BOX_NOT_FOUND")
        }

        // Create job to alert people in the box that the box has been closed
        createJob(targetId, "close")

        return response.status(200).send(closedBox)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.post("/:box/open", auth.isAuthorized, async (request: Request, response: Response) => {
    try {
        const targetId = request.params.box

        const openedBox = await Box.findByIdAndUpdate(
            targetId,
            {
                $set: { open: true }
            },
            {
                new: true
            }
        )

        if (!openedBox) {
            return response.status(404).send("BOX_NOT_FOUND")
        }

        // Create a job to alert subscribers that the box has been opened
        createJob(targetId, "open")

        return response.status(200).send(openedBox)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.delete("/:box", [auth.isAuthorized, boxMiddleware.closedOnly], async (request: Request, response: Response) => {
    try {
        const targetId = request.params.box

        // TODO: Restrict deletion to box creator
        const deletedBox = await Box.findOneAndRemove({ _id: targetId })

        // Create job to alert people in the box and have them removed
        createJob(targetId, "destroy")

        return response.status(200).send(deletedBox)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.post("/:box/convert", auth.isAuthorized, async (request: Request, response: Response) => {
    // Don't instanciate anything yet because the model will add an objectId when we need to compare against
    // its existence
    const inputPlaylist: UserPlaylistDocument = await UserPlaylist.findById(request.body._id)

    if (!inputPlaylist) {
        return response.status(412).send('PLAYLIST_DOES_NOT_EXIST')
    }

    const decodedToken = response.locals.auth

    if (inputPlaylist.user.toString() !== decodedToken.user.toString()) {
        return response.status(401).send('UNAUTHORIZED')
    }

    const queue = await QueueItemModel.find({ box: response.locals.box._id })

    if (queue.length === 0) {
        return response.status(412).send('EMPTY_PLAYLIST')
    }

    try {
        queue.forEach((queueItem: QueueItem) => {
            // If the playlist doesn't have the video, we add it to the playlist
            const { video }: QueueItem['video'] = queueItem
            if (!inputPlaylist.videos.includes(video._id)) {
                inputPlaylist.videos.push(video._id)
            }
        })

        const createdPlaylist: UserPlaylistDocument = await (await inputPlaylist.save())
            .populate({ path: 'user', select: 'name' })
            .populate({ path: 'videos', select: 'link name' })
            .execPopulate()

        return response.status(200).send(createdPlaylist)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.put("/:box/feature", [auth.isAuthorized, boxMiddleware.openOnly, boxMiddleware.publicOnly], async (request: Request, response: Response) => {
    const decodedToken = response.locals.auth

    if (!decodedToken.physalis) {
        return response.status(401).send('UNAUTHORIZED')
    }

    try {
        if (Object.keys(request.body).length === 0) {
            return response.status(412).send("MISSING_PARAMETERS")
        }

        const targetId = request.params.box

        const { featured } = request.body

        const updatedBox = await Box.findByIdAndUpdate(
            targetId,
            {
                $set: { featured }
            },
            {
                new: true
            }
        )

        return response.status(200).send(updatedBox)
    } catch (error) {
        return response.status(500).send(error)
    }
})

/**
 * Adds a job to the box queue, that will be handled by the BoxService Microservice
 *
 * @private
 * @param {string} boxToken The token of the box
 * @param {string} subject The subject of the job
 * @memberof BoxApi
 */
const createJob = (boxToken: string, subject: string) => {
    const alertJob: BoxJob = { boxToken, subject }
    boxQueue.add(alertJob)
}

export const BoxApi = router
