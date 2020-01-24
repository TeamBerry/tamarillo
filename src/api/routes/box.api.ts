import { PlaylistItem } from "@teamberry/muscadine"
import { NextFunction, Request, Response, Router } from "express"
import * as _ from "lodash"
import { BoxJob } from "../../models/box.job"
import { UserPlaylist, UserPlaylistClass, UserPlaylistDocument } from "../../models/user-playlist.model"
const Queue = require("bull")
const boxQueue = new Queue("box")
const auth = require("./../auth.middleware")

const Box = require("./../../models/box.model")
const User = require("./../../models/user.model")
const SubscriberSchema = require("./../../models/subscriber.schema")

export class BoxApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.init()
    }

    public init() {
        this.router.get("/", this.index)
        this.router.get("/:box", this.show)
        this.router.post("/", this.store)
        this.router.put("/:box", this.update.bind(this))
        this.router.delete("/:box", this.destroy.bind(this))
        this.router.post("/:box/close", this.close.bind(this))
        this.router.post("/:box/open", this.open.bind(this))
        this.router.get("/:box/users", this.users)

        this.router.use(auth.isAuthorized)
        this.router.post('/:box/convert', this.convertPlaylist)

        this.router.param("box", async (request: Request, response: Response, next: NextFunction) => {
            const matchingBox = await Box.findById(request.params.box)
                .populate("creator", "_id name")
                .populate("playlist.video")
                .populate("playlist.submitted_by", "_id name")

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
            const boxes = await Box.find({ open: { $ne: false } })
                .populate("creator", "_id name")
                .populate("playlist.video")

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

            const targetId = request.params.box

            const { _id, description, lang, name, options } = request.body

            if (targetId !== _id) {
                return response.status(412).send("IDENTIFIER_MISMATCH")
            }

            const updatedBox = await Box.findByIdAndUpdate(
                _id,
                {
                    $set: {
                        description,
                        lang,
                        name,
                        options
                    },
                },
                {
                    new: true,
                },
            )

            if (!updatedBox) {
                return response.status(404).send("BOX_NOT_FOUND")
            }

            this.createJob(_id, 'update')

            return response.status(200).send(updatedBox)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    /**
     * Closes a box
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
                    $set: { open: false },
                },
                {
                    new: true,
                },
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
                    $set: { open: true },
                },
                {
                    new: true,
                },
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
        let inputPlaylist: Partial<UserPlaylistDocument> = request.body

        const decodedToken = response.locals.auth
        const box = response.locals.box

        // If the playlist given as the _id property, then it's an existing one
        if (inputPlaylist.hasOwnProperty('_id')) {
            inputPlaylist = await UserPlaylist
                .findById(inputPlaylist._id)
                .populate('videos', 'name link')
                .populate('user', 'name')
        } else {
            inputPlaylist = new UserPlaylistClass(request.body)
        }

        // If there's no user, the request is rejected
        if (inputPlaylist.user._id === null || inputPlaylist.name === null) {
            return response.status(412).send('MISSING_PARAMETERS')
        }

        if (inputPlaylist.user._id.toString() !== decodedToken.user.toString()) {
            return response.status(401).send('UNAUTHORIZED')
        }

        if (box.playlist.length === 0) {
            return response.status(412).send('EMPTY_PLAYLIST')
        }

        try {
            box.playlist.forEach((playlistItem: PlaylistItem) => {
                // If the playlist doesn't have the video, we add it to the playlist
                const { video }: PlaylistItem['video'] = playlistItem
                if (_.findIndex(inputPlaylist.videos, { _id: video._id }) === -1) {
                    inputPlaylist.videos.push({
                        _id: video._id,
                        name: video.name,
                        link: video.link
                    })
                }
            })

            let createdPlaylist: UserPlaylistDocument = await UserPlaylist.create(inputPlaylist)
            createdPlaylist = await createdPlaylist
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
            const subscribersOfBox: Array<string> = (await SubscriberSchema.find({ boxToken: request.params.box, userToken: { $not: /^user-[a-zA-Z0-9]{20}/ } }))
                .map((subscriber) => {
                    return subscriber.userToken
                })

            const users = await User
                .find({ _id: { $in: subscribersOfBox } })
                .select('-password')

            return response.status(200).send(users)
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
