import { Request, Response, Router } from "express"
import * as _ from "lodash"
import { BoxJob } from "../../models/box.job"
const Queue = require("bull")
const boxQueue = new Queue("box")

const Box = require("./../../models/box.schema")

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
        this.router.put("/:box", this.update)
        this.router.delete("/:box", this.destroy)
        this.router.post("/:box/close", this.close)
        this.router.post("/:box/open", this.open)
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
        const boxId = request.params.box

        try {
            const box = await Box.findById(boxId)
                .populate("creator", "_id name")
                .populate("playlist.video")
                .populate("playlist.submitted_by", "_id name")

            if (!box) {
                return response.status(404).send("BOX_NOT_FOUND")
            }

            return response.status(200).send(box)
        } catch (error) {
            return response.status(500).send(error)
        }
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

            const { _id, description, lang, name } = request.body

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
                    },
                },
                {
                    new: true,
                },
            )

            if (!updatedBox) {
                return response.status(404).send("BOX_NOT_FOUND")
            }

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
            boxApi.createJob(targetId, "close")

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
            boxApi.createJob(targetId, "open")

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
            boxApi.createJob(targetId, "destroy")

            return response.status(200).send(deletedBox)
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
