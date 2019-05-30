import { NextFunction, Request, Response, Router } from 'express';
import * as _ from 'lodash';

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
        this.router.put("/:box", this.update);
        this.router.post("/:box/close", this.close);
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
            const boxes = await Box.find({ open: true })
                .populate('creator', '_id name')
                .populate('playlist.video');

            return response.status(200).send(boxes);
        } catch (error) {
            return response.status(500).send(error);
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
        const boxId = request.params.box;

        try {
            const box = await Box.findById(boxId)
                .populate('creator', '_id name')
                .populate('playlist.video')
                .populate('playlist.submitted_by', '_id name');

            if (!box) {
                return response.status(404).send('BOX_NOT_FOUND');
            }

            return response.status(200).send(box);
        } catch (error) {
            return response.status(500).send(error);
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
            const createdBox = await Box.create(request.body);

            return response.status(201).send(createdBox);
        } catch (error) {
            return response.status(500).send(error);
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
                return response.status(412).send('MISSING_PARAMETERS');
            }

            const targetId = request.params.box;

            const { _id, description, lang, name } = request.body;

            if (targetId !== _id) {
                return response.status(412).send('IDENTIFIER_MISMATCH');
            }

            const updatedBox = await Box.findByIdAndUpdate(
                _id,
                {
                    $set: {
                        description,
                        lang,
                        name
                    }
                },
                {
                    new: true
                }
            );

            if (!updatedBox) {
                return response.status(404).send('BOX_NOT_FOUND');
            }

            return response.status(200).send(updatedBox);
        } catch (error) {
            return response.status(500).send(error);
        }
    }

    public destroy() {

    }

    public async close(request: Request, response: Response): Promise<Response> {
        return response.status(200).send(request.box);
    }
}

const boxApi = new BoxApi();
export default boxApi.router;
