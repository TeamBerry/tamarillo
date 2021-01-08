import { QueueItem } from "@teamberry/muscadine"
import { NextFunction, Request, Response, Router } from "express"
import * as _ from "lodash"
import { BoxJob } from "../../models/box.job"
import { UserPlaylist, UserPlaylistDocument } from "../../models/user-playlist.model"
import { Subscriber, ActiveSubscriber, PopulatedSubscriberDocument } from "../../models/subscriber.model"
import QueueApi from "./queue.api"
import { Invite } from "../../models/invite.model"
import { QueueItemModel } from "../../models/queue-item.model"
const Queue = require("bull")
const boxQueue = new Queue("box")
const auth = require("./../middlewares/auth.middleware")
const boxMiddleware = require("./../middlewares/box.middleware")

const Box = require("./../../models/box.model")

export class BoxApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.init()
    }

    public init(): void {
        this.router.get("/", auth.canBeAuthorized, this.index)
        this.router.get("/:box", auth.canBeAuthorized, this.show)
        this.router.use("/:box/queue", QueueApi)

        // All subsequent routes require authentication
        this.router.use(auth.isAuthorized)
        this.router.post("/", this.store)
        this.router.put("/:box", this.update.bind(this))
        this.router.put("/:box/feature", [boxMiddleware.boxMustBeOpen, boxMiddleware.boxMustBePublic], this.feature)
        this.router.patch('/:box', this.patchSettings.bind(this))
        this.router.delete("/:box", this.destroy.bind(this))
        this.router.post("/:box/close", this.close.bind(this))
        this.router.post("/:box/open", this.open.bind(this))
        this.router.get("/:box/users", this.users)
        this.router.post("/:box/invite", boxMiddleware.boxMustBeOpen, this.generateInvite.bind(this))

        this.router.post('/:box/convert', this.convertPlaylist)

        this.router.param("box", async (request: Request, response: Response, next: NextFunction) => {
            const matchingBox = await Box.findById(request.params.box)
                .select('-playlist')
                .populate("creator", "_id name settings.picture")

            if (!matchingBox) {
                return response.status(404).send("BOX_NOT_FOUND")
            }

            // Give the found box to APIs so they don't have to search for it themselves
            response.locals.box = matchingBox

            next()
        })
    }

    /**
     * Gets all boxes from the collection
     *
     * @param {Response} response
     * @returns {Promise<Response>} The list of boxes
     * @memberof BoxApi
     */
    public async index(request: Request, response: Response): Promise<Response> {
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
    }

    /**
     * Gets a single box from the collection of boxes from its ObjectId
     *
     * @param {Request} request Contains the ObjectId if the box as a request parameter
     * @param {Response} response
     * @returns {Promise<Response>} The box if it exists or one of the following error codes:
     * - 404 'BOX_NOT_FOUND': No box matches the ObjectId given
     * - 500 Server Error: Something wrong occurred
     * @memberof BoxApi
     */
    public async show(request: Request, response: Response): Promise<Response> {
        return response.status(200).send(response.locals.box)
    }

    /**
     * Stores a document as a box in the collection
     *
     * @param {Request} request Body contains the box to store
     * @param {Response} response
     * @returns {Promise<Response>} The created box is sent back as confirmation with a 201.
     * @memberof BoxApi
     */
    public async store(request: Request, response: Response): Promise<Response> {
        try {
            const createdBox = await Box.create(request.body)

            return response.status(201).send(createdBox)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    /**
     * Updates a box from the collection
     *
     * @param {Request} request Body contains the box to update
     * @param {Response} response
     * @returns {Promise<Response>} The updated box is sent back as confirmation with a 200.
     * If something goes wrong, one of the following error codes will be sent:
     * - 412 'MISSING_PARAMETERS' if no request body is given
     * - 404 'BOX_NOT_FOUND' if the id given does not match any box in the collection
     * - 500 Server Error if something else happens
     * @memberof BoxApi
     */
    public async update(request: Request, response: Response): Promise<Response> {
        try {
            if (_.isEmpty(request.body)) {
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
                .select('_id name creator description lang open private options featured')
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

            this.createJob(_id, 'update')

            return response.status(200).send(updatedBox)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    public async patchSettings(request: Request, response: Response): Promise<Response> {
        if (_.isEmpty(request.body)) {
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

            this.createJob(request.params.box, 'update')

            return response.status(200).send(updatedBox.options)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    public async generateInvite(request: Request, response: Response): Promise<Response> {
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
    }

    /**
     * Closes a box. Closed boxes will be automatically removed from the featured section
     *
     * @param {Request} request Body contains the box to close
     * @param {Response} response
     * @returns {Promise<Response>} The closed box is sent back as confirmation with a 200.
     * Subscribers of the chat channel in the box are also alerted via a redis job that the box has been closed.
     *
     * If something goes wrong, one of the following error codes will be sent instead:
     * - 404 'BOX_NOT_FOUND' if the id given does not match any box in the collection
     * - 500 Server Error if something else happens
     * @memberof BoxApi
     */
    public async close(request: Request, response: Response): Promise<Response> {
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
            this.createJob(targetId, "close")

            return response.status(200).send(closedBox)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    /**
     * Opens a box.
     *
     * @param {Request} request Body contains the box to open
     * @param {Response} response
     * @returns {Promise<Response>} The opened box is sent back as confirmation with a 200.
     * Subscribers of the chat channel in the box are also alerted via a redis job that the box has been (re)opened.
     *
     * If something goes wrong, one of the following error codes will be sent instead:
     * - 404 'BOX_NOT_FOUND' if the id given does not match any box in the collection
     * - 500 Server Error if something else happens
     * @memberof BoxApi
     */
    public async open(request: Request, response: Response): Promise<Response> {
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
            this.createJob(targetId, "open")

            return response.status(200).send(openedBox)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    /**
     * Deletes a box from the collection. Will also create a job for the box microservice to remove subscribers
     * from the list of subscribers.
     *
     * @param {Request} request Parameters contain the box ID
     * @param {Response} response
     * @returns {Promise<Response>} The deleted box is sent back as confirmation with a 200.
     * If something goes wrong, one of the following error codes will be sent:
     * - 403 Forbidden if the user attempting to delete the box is not the creator (NOT YET)
     * - 404 'BOX_NOT_FOUND' if the id given does not match any box in the collection
     * - 412 'BOX_IS_OPEN' if the box is still open when attempting to delete it
     * - 500 Server Error if something else happens
     * @memberof BoxApi
     */
    public async destroy(request: Request, response: Response): Promise<Response> {
        try {
            const targetId = request.params.box

            const targetBox = await Box.findById(targetId)

            if (!targetBox) {
                return response.status(404).send("BOX_NOT_FOUND")
            }

            if (targetBox.open) {
                return response.status(412).send("BOX_IS_OPEN")
            }

            // TODO: Restrict deletion to box creator
            const deletedBox = await Box.findOneAndRemove({ _id: targetId })

            // Create job to alert people in the box and have them removed
            this.createJob(targetId, "destroy")

            return response.status(200).send(deletedBox)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    /**
     * Creates a new user playlist from the playlist of the box.
     *
     * @param {Request} request Contains a Partial object of an UserPlaylistDocument
     * @param {Response} response
     * @returns {Promise<Response>} The newly created playlist is sent back as confirmation with a 200.
     * If something goes wrong, one of the following error codes will be sent:
     * - 401 Unauthorized is no auth is given, or an auth is given but doesn't match the owner of an existing playlist
     * - 412 'EMPTY_PLAYLIST' If the box has no videos yet
     * - 412 'MISSING_PARAMETERS' if the request body is not complete (mainly missing a title or an user)
     * - 500 Server Error if something else happens
     * @memberof BoxApi
     */
    public async convertPlaylist(request: Request, response: Response): Promise<Response> {
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
    }

    public async users(request: Request, response: Response): Promise<Response> {
        try {

            const activeSubscribers: Array<PopulatedSubscriberDocument> = await Subscriber
                .find({
                    "boxToken": request.params.box,
                    "userToken": { $not: /^user-[a-zA-Z0-9]{20}/ },
                    "connexions.0": { $exists: true }
                })
                .populate('userToken', 'name settings.picture', 'User')
                .lean()

            const subscribers: Array<ActiveSubscriber> = activeSubscribers.map(activeSubscriber => ({
                ...activeSubscriber.userToken,
                origin: activeSubscriber.connexions[0].origin,
                role: activeSubscriber.role
            }))

            return response.status(200).send(subscribers)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    public async feature(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth

        if (!decodedToken.physalis) {
            return response.status(401).send('UNAUTHORIZED')
        }

        try {
            if (_.isEmpty(request.body)) {
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
    }

    /**
     * Adds a job to the box queue, that will be handled by the BoxService Microservice
     *
     * @private
     * @param {string} boxToken The token of the box
     * @param {string} subject The subject of the job
     * @memberof BoxApi
     */
    public createJob(boxToken: string, subject: string): void {
        const alertJob: BoxJob = { boxToken, subject }
        boxQueue.add(alertJob)
    }
}

const boxApi = new BoxApi()
export default boxApi.router
