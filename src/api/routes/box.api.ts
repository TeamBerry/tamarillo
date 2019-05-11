import { NextFunction, Request, Response, Router } from 'express';

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
            const boxes = await Box.find({})
                .populate('creator', '_id name')
                .populate('playlist.video')
                .populate('playlist.submitted_by', '_id name');

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

    public update() {

    }

    public destroy() {

    }
}

const boxApi = new BoxApi();
export default boxApi.router;
