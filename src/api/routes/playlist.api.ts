import { NextFunction, Request, Response, Router } from "express"
import * as _ from "lodash"
import { UserPlaylist, UsersPlaylist, UserPlaylistDocument } from "../../models/user-playlist.model"
const auth = require("./../auth.middleware")

export class PlaylistApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.router.use(auth.isAuthorized)
        this.init()
    }

    public init() {
        this.router.get("/:playlist", this.show)
        this.router.post("/", this.store)
        this.router.put("/:playlist", this.update)
        this.router.delete("/:playlist", this.destroy)

        // Middleware testing if the user exists. Sends a 404 'USER_NOT_FOUND' if it doesn't, or let the request through
        this.router.param("playlist", async (request: Request, response: Response, next: NextFunction): Promise<Response> => {
            const matchingPlaylist: UserPlaylist = await UsersPlaylist.findById(request.params.playlist)

            if (!matchingPlaylist) {
                return response.status(404).send("PLAYLIST_NOT_FOUND")
            }

            next()
        })
    }

    /**
     * Gets a single playlist from the collection of user playlists
     *
     * @param {Request} request Contains the ObjectId of the box as a request parameter
     * @param {Response} response
     * @returns {Promise<Response>} The playlist if it exists or one of the following error codes:
     * - 401 'UNAUTHORIZED': No JWT was given to the API
     * - 404 'PLAYLIST_NOT_FOUND': No playlist matches the given ObjectId
     * - 500 Server Error: Something wrong occurred
     * @memberof PlaylistApi
     */
    public async show(request: Request, response: Response): Promise<Response> {
        const playlistId = request.params.playlist

        try {
            const playlist: UserPlaylist = await UsersPlaylist.findById(playlistId)
                .populate("user", "name")
                .populate("videos", "name link")

            return response.status(200).send(playlist)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    /**
     * Stores a new playlist in the collection
     *
     * @param {Request} request The body contains the playlist
     * @param {Response} response
     * @returns {Promise<Response>} The created playlist is sent back as confirmation, or one of the
     * following error codes:
     * - 401 'UNAUTHORIZED': No JWT was given to the API
     * - 412 'MISSING_PARAMETERS': No body was given
     * - 500 Server Error: Something wrong occurred
     * @memberof PlaylistApi
     */
    public async store(request: Request, response: Response): Promise<Response> {
        if (_.isEmpty(request.body)) {
            return response.status(412).send('MISSING_PARAMETERS')
        }

        try {
            const createdPlaylist: UserPlaylist = await UsersPlaylist.create(request.body)

            return response.status(201).send(createdPlaylist)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    /**
     * Updates a playlist from the collection
     *
     * @param {Request} request The body contains the collection, the param contains the ObjectId of the target playlist
     * @param {Response} response
     * @returns {Promise<Response>} The updated playlist is sent back as confirmation, or one of the following codes:
     * - 401 'UNAUTHORIZED': No JWT was given to the API
     * - 404 'PLAYLIST_NOT_FOUND': No playlist matches the given ObjectId
     * - 412 'MISSING_PARAMETERS': No body was given
     * - 412 'IDENTIFIER_MIMSTACH': The id of the body and the request parameter don't match
     * - 500 Server Error: Something wrong occurred
     * @memberof PlaylistApi
     */
    public async update(request: Request, response: Response): Promise<Response> {
        if (_.isEmpty(request.body)) {
            return response.status(412).send('MISSING_PARAMETERS')
        }

        console.log(request.body)

        if (request.body._id !== request.param.playlist) {
            return response.status(412).send('IDENTIFIER_MISMATCH')
        }

        try {
            const updatedPlaylist: UserPlaylist = await UsersPlaylist.findByIdAndUpdate(
                request.param.playlist,
                {
                    $set: request.body
                },
                {
                    new: true
                }
            )

            return response.status(200).send(updatedPlaylist)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    public async destroy() {

    }
}

const playlistApi = new PlaylistApi()
export default playlistApi.router
