import { NextFunction, Request, Response, Router } from "express"

const User = require("./../../models/user.model")
const Box = require("./../../models/box.schema")

import { UserPlaylist, UsersPlaylist } from "../../models/user-playlist.model"
const auth = require("./../auth.middleware")

export class UserApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.router.use(auth.isAuthorized)
        this.init()
    }

    public init() {
        this.router.get("/:user", this.show)
        this.router.get("/:user/boxes", this.boxes)
        this.router.get('/:user/playlists', this.playlists)
        this.router.post("/", this.store)
        this.router.put("/:user", this.update)
        this.router.patch("/:user/favorites", this.patchFavorites)
        this.router.delete("/:user", this.destroy)

        // Middleware testing if the user exists. Sends a 404 'USER_NOT_FOUND' if it doesn't, or let the request through
        this.router.param("user", async (request: Request, response: Response, next: NextFunction): Promise<Response> => {
            const matchingUser = await User.findById(request.params.user)

            if (!matchingUser) {
                return response.status(404).send("USER_NOT_FOUND")
            }

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

    public patchFavorites(req: Request, res: Response) {
        console.log("PATCHING USER: " + req.params.user + "WITH DATA: ", req.body)

        const favoritesList = []
        req.body.forEach((favorite) => {
            favoritesList.push(favorite._id)
        })

        User.findByIdAndUpdate(
            req.params.user,
            { $set: { favorites: favoritesList } },
            { new: true })
            .populate("favorites")
            .exec((err, document) => {
                if (err) {
                    res.status(500).send(err)
                }

                if (document) {
                    res.status(200).send(document)
                }

                res.status(204)
            })
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

            const userPlaylists: UserPlaylist[] = await UsersPlaylist
                .find(filters)
                .populate("videos")

            return response.status(200).send(userPlaylists)
        } catch (error) {
            console.log('ERROR: ', error)
            return response.status(500).send(error)
        }
    }
}

const userApi = new UserApi()
export default userApi.router
