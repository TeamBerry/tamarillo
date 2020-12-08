import { NextFunction, Request, Response, Router } from "express"
import * as _ from "lodash"
const multer = require('multer')
const upload = multer({ dest: 'upload/' })

const Box = require("./../../models/box.model")

import { UserPlaylist, UserPlaylistClass, UserPlaylistDocument } from "../../models/user-playlist.model"
import { Video } from "../../models/video.model"
import uploadService, { MulterFile } from "../services/upload.service"
import { User, UserClass } from "../../models/user.model"
const auth = require("./../middlewares/auth.middleware")

export class UserApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.router.use(auth.isAuthorized)
        this.init()
    }

    public init(): void {
        this.router.get("/favorites", this.favorites)
        this.router.post("/favorites", this.updateFavorites)
        this.router.patch("/settings", this.patchSettings)
        this.router.post('/picture', [upload.single('picture')], this.uploadProfilePicture)
        this.router.delete('/picture', this.deleteProfilePicture)
        this.router.patch('/acl', this.patchACL)
        this.router.get("/:user", this.show)
        this.router.get("/:user/boxes", this.boxes)
        this.router.get('/:user/playlists', this.playlists)

        // Middleware testing if the user exists. Sends a 404 'USER_NOT_FOUND' if it doesn't, or let the request through
        this.router.param("user", async (request: Request, response: Response, next: NextFunction): Promise<Response> => {
            const matchingUser = await User
                .findById(request.params.user)
                .select('-password')

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
        return response.status(200).send(response.locals.user)
    }

    /**
     * Gets the contents of the 'Favorites' playlist
     *
     * @param {Request} request
     * @param {Response} response
     * @returns {Promise<Response>}
     * @memberof UserApi
     */
    public async favorites(request: Request, response: Response): Promise<Response> {
        const favorites = await UserPlaylist
            .findOne({ user: response.locals.auth.user, name: 'Favorites' })
            .populate("user", "name")
            .populate("videos", "name link")

        return response.status(200).send(favorites.videos)
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
                query = { $push: { videos: command.target } }
            } else {
                query = { $pull: { videos: command.target } }
            }

            if (!await Video.exists({ _id: command.target })) {
                return response.status(404).send('VIDEO_NOT_FOUND')
            }

            const updatedFavorites: UserPlaylistDocument = await UserPlaylist.findOneAndUpdate(
                { name: 'Favorites', user: response.locals.auth.user },
                query,
                {
                    new: true
                }
            )
                .populate("user", "name")
                .populate("videos", "name link")

            return response.status(200).send(updatedFavorites)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    public async patchSettings(request: Request, response: Response): Promise<Response> {
        try {
            const settings: Partial<UserClass['settings']> = request.body

            if (_.isEmpty(request.body)) {
                return response.status(412).send("MISSING_PARAMETERS")
            }

            const updateFields = {}
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    public async patchACL(request: Request, response: Response): Promise<Response> {
        try {
            const acl: UserClass['acl'] = request.body

            if (_.isEmpty(request.body)) {
                return response.status(412).send("MISSING_PARAMETERS")
            }

            const updatedUser = await User.findByIdAndUpdate(
                response.locals.auth.user,
                {
                    $set: { acl }
                },
                {
                    new: true
                }
            )

            return response.status(200).send(updatedUser.acl)
        } catch (error) {
            return response.status(500).send()
        }
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
                .populate("creator", "_id name settings.picture")
                .populate("playlist.video")
                .populate("playlist.submitted_by", "_id name settings.picture")

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
            isPrivate: false
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
        const userToken: string = response.locals.auth.user

        try {
            if (!request.file) {
                return response.status(404).send('FILE_NOT_FOUND')
            }

            const user = await User.findById(userToken)

            const fileToUpload: MulterFile = request.file as MulterFile

            // Uploads file
            const uploadedFile = await uploadService.storeProfilePicture(user._id, fileToUpload)

            if (!uploadedFile) {
                return response.status(400).send("CORRUPTED_FILE")
            }

            // Deletes previous picture if it's not the default one
            if (user.settings.picture !== 'default-picture') {
                await uploadService.deleteProfilePicture(user.settings.picture)
            }

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

    public async deleteProfilePicture(request: Request, response: Response): Promise<Response> {
        const userToken: string = response.locals.auth.user

        try {
            const user = await User.findById(userToken)

            if (user.settings.picture === 'default-picture') {
                return response.status(412).send("CANNOT_DELETE_DEFAULT")
            }

            await uploadService.deleteProfilePicture(user.settings.picture)

            await User.findByIdAndUpdate(
                user._id,
                {
                    $set: { 'settings.picture': 'default-picture' }
                }
            )

            return response.status(200).send({ file: 'default-picture' })
        } catch (error) {
            return response.status(500).send(error)
        }
    }
}

const userApi = new UserApi()
export default userApi.router
