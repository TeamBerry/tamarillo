import { NextFunction, Request, Response, Router } from "express"
import * as _ from "lodash"
const multer = require('multer')
const upload = multer({ dest: 'upload/' })

const User = require("./../../models/user.model")
const Box = require("./../../models/box.model")

import { UserPlaylist, UserPlaylistClass } from "../../models/user-playlist.model"
import { Video } from "../../models/video.model"
import uploadService, { MulterFile } from "../services/upload.service"
const auth = require("./../auth.middleware")

export class UserApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.router.use(auth.isAuthorized)
        this.init()
    }

    public init() {
        this.router.get("/favorites", this.favorites)
        this.router.post("/favorites", this.updateFavorites)
        this.router.patch("/settings", this.patchSettings)
        this.router.post("/", this.store)
        this.router.put("/:user", this.update)
        this.router.get("/:user", this.show)
        this.router.get("/:user/boxes", this.boxes)
        this.router.get('/:user/playlists', this.playlists)
        this.router.post('/:user/picture', [auth.isAuthorized, upload.single('picture')], this.uploadProfilePicture)
        this.router.delete("/:user", this.destroy)

        // Middleware testing if the user exists. Sends a 404 'USER_NOT_FOUND' if it doesn't, or let the request through
        this.router.param("user", async (request: Request, response: Response, next: NextFunction): Promise<Response> => {
            const matchingUser = await User.findById(request.params.user)

            if (!matchingUser) {
                return response.status(404).send("USER_NOT_FOUND")
            }

            response.locals.user = matchingUser

            next()
        })
    }

    /**
     * Gets a single user based on the given id
     *
     * @param {Request} request The request, containing the id as a parameter
     * @param {Response} response
     * @returns {Promise<Response>} The user or the following error code:
     * - 500 Server Error if something else happens
     * @memberof UserApi
     */
    public async show(request: Request, response: Response): Promise<Response> {
        const userId = request.params.user

        try {
            const user = await User.findById(userId)
                .populate("favorites")

            return response.status(200).send(user)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    /**
     * Stores a new user in the database
     *
     * @param {Request} request The request body contains the user to create
     * @param {Response} response
     * @returns {Promise<Response>} The newly created user or the following error code:
     * - 500 Server Error if something happens
     * @memberof UserApi
     */
    public async store(request: Request, response: Response): Promise<Response> {
        try {
            const newUser = await User.create(request.body)

            return response.status(201).send(newUser)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    public update(req: Request, res: Response) {

    }

    public async favorites(request: Request, response: Response): Promise<Response> {
        let user

        if (request.query.title) {
            user = await User.findById(response.locals.auth.user)
                .populate({
                    path: 'favorites',
                    match: { name: { $regex: request.query.title, $options: "i" } }
                })
        } else {
            user = await User.findById(response.locals.auth.user)
                .populate('favorites')
        }

        return response.status(200).send(user.favorites)
    }

    /**
     * Updates the favorites of an user
     *
     * @param {Request} request
     * @param {Response} response
     * @returns {Promise<Response>}
     * @memberof UserApi
     */
    public async updateFavorites(request: Request, response: Response): Promise<Response> {
        const command: { action: 'like' | 'unlike', target: string } = request.body

        if (_.isEmpty(command)) {
            return response.status(412).send()
        }

        try {
            let query = {}

            if (command.action === 'like') {
                query = { $push: { favorites: command.target } }
            } else {
                query = { $pull: { favorites: command.target } }
            }

            if (!await Video.exists({ _id: command.target })) {
                return response.status(404).send('VIDEO_NOT_FOUND')
            }

            const updatedUser = await User.findByIdAndUpdate(
                response.locals.auth.user,
                query,
                {
                    new: true
                }
            )
                .populate("favorites")

            return response.status(200).send(updatedUser.favorites)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    public async patchSettings(request: Request, response: Response): Promise<Response> {
        try {
            const settings = request.body

            if (_.isEmpty(request.body)) {
                return response.status(412).send("MISSING_PARAMETERS")
            }

            const updateFields = {}
            Object.keys(settings).map((value, index) => {
                updateFields[`settings.${value}`] = settings[value]
            })

            await User.findByIdAndUpdate(
                response.locals.auth.user,
                {
                    $set: updateFields
                }
            )

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send()
        }
    }

    public destroy(req: Request, res: Response) {

    }

    /**
     * Gets the boxes of the user
     *
     * @param {Request} request The request, containing the user as a parameter
     * @param {Response} response
     * @returns {Promise<Response>} The boxes of the user or one of the following error codes:
     * - 404 'USER_NOT_FOUND' if the user doesn't exist in the database
     * - 500 Server Error if something happens
     * @memberof UserApi
     */
    public async boxes(request: Request, response: Response): Promise<Response> {
        const userId = request.params.user

        try {
            const boxes = await Box.find({ creator: userId })
                .populate("creator", "_id name")

            return response.status(200).send(boxes)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    /**
     * Gets the playlists of an user. Will serve only public or public and private boxes depending
     * on who pings the API:
     * - Only public playlists will be shown if the authentication shows a different user than the creator
     * - All playlists if the user is requesting his own playlists
     * @param request The request, containing the user as a parameter
     * @param response
     * @returns {Promise<Response>} An array of user playlists or one of the following error codes:
     * - 404 'USER_NOT_FOUND' if no user matches the given ObjectId in parameter
     */
    public async playlists(request: Request, response: Response): Promise<Response> {
        const filters = {
            user: request.params.user,
            isPrivate: false,
        }

        const decodedToken = response.locals.auth

        try {
            // If the token is decoded correctly and the user inside matches the request parameters, the privacy filter
            // is removed so that the API serves private and public playlists.
            if (decodedToken && decodedToken.user === request.params.user) {
                delete filters.isPrivate
            }

            const userPlaylists: UserPlaylistClass[] = await UserPlaylist
                .find(filters)
                .populate("videos")

            return response.status(200).send(userPlaylists)
        } catch (error) {
            console.log('ERROR: ', error)
            return response.status(500).send(error)
        }
    }

    /**
     * Uploads a new profile picture for the user
     *
     * @param {Request} request
     * @param {Response} response
     * @returns {Promise<Response>}
     * @memberof UserApi
     */
    public async uploadProfilePicture(request: Request, response: Response): Promise<Response> {
        const user = response.locals.user

        try {
            if (!request.file) {
                return response.status(404).send('FILE_NOT_FOUND')
            }

            const fileToUpload: MulterFile = request.file as MulterFile

            // Uploads file
            const uploadedFile = await uploadService.storeProfilePicture(user._id, fileToUpload)

            if (!uploadedFile) {
                return response.status(400).send("CORRUPTED_FILE")
            }

            console.log(uploadedFile)

            // Updates entity
            await User.findByIdAndUpdate(
                user._id,
                {
                    $set: { 'settings.picture': uploadedFile }
                }
            )

            return response.status(200).send({ file: uploadedFile })
        } catch (error) {
            return response.status(500).send(error)
        }
    }
}

const userApi = new UserApi()
export default userApi.router
