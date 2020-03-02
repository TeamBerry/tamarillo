import { NextFunction, Request, Response, Router } from "express"
import * as _ from "lodash"
const axios = require("axios")

import { UserPlaylist, UserPlaylistClass, UserPlaylistDocument } from "../../models/user-playlist.model"
import { Video } from "../../models/video.model"
const auth = require("./../auth.middleware")

export class PlaylistApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.init()
    }

    public init() {
        // This API is public but the results might change depending on the presence of a JWT
        this.router.get('/', auth.canBeAuthorized, this.index)

        // All next APIs require authentication
        this.router.use(auth.isAuthorized)
        this.router.get("/:playlist", this.show)
        this.router.post("/", this.store)
        this.router.put("/:playlist", this.update)
        this.router.delete("/:playlist", this.destroy)

        // Manipulate videos in playlists
        this.router.post("/:playlist/videos", this.addVideoToPlaylist)
        this.router.delete("/:playlist/videos/:video", this.removeVideoFromPlaylist)

        // Middleware testing if the user exists. Sends a 404 'USER_NOT_FOUND' if it doesn't, or let the request through
        this.router.param("playlist", async (request: Request, response: Response, next: NextFunction): Promise<Response> => {
            const matchingPlaylist: UserPlaylistClass = await UserPlaylist
                .findById(request.params.playlist)
                .populate("user", "name")
                .populate("videos", "name link")

            if (!matchingPlaylist) {
                return response.status(404).send("PLAYLIST_NOT_FOUND")
            }

            // Give the found playlist to APIs so they don't have to search a second time
            response.locals.playlist = matchingPlaylist

            next()
        })
    }

    public async index(request: Request, response: Response): Promise<Response> {
        const filters: Partial<{ isPrivate: boolean, user: any }> = { isPrivate: false }

        // Excluding the user from the search to display only playlists to "discover"
        // The user can go to "My Playlists" to see his own playlists
        const decodedToken = response.locals.auth
        if (decodedToken) {
            filters.user = { $ne: decodedToken.user }
        }

        const playlists: Array<UserPlaylistClass> = await UserPlaylist
            .find(filters)
            .populate("user", "name")
            .populate("videos", "name link")

        return response.status(200).send(playlists)
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
        const decodedToken = response.locals.auth
        const playlist: UserPlaylistClass = response.locals.playlist

        if (decodedToken.user.toString() !== playlist.user._id.toString()) {
            return response.status(401).send('UNAUTHORIZED')
        }

        return response.status(200).send(response.locals.playlist)
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
            const createdPlaylist: UserPlaylistClass = await UserPlaylist.create(request.body)

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

        const decodedToken = response.locals.auth
        const playlist: UserPlaylistClass = response.locals.playlist

        if (decodedToken.user.toString() !== playlist.user._id.toString()) {
            return response.status(401).send('UNAUTHORIZED')
        }

        const clientPlaylist: Partial<UserPlaylistClass> = request.body

        if (request.body._id !== request.params.playlist) {
            return response.status(412).send('IDENTIFIER_MISMATCH')
        }

        try {
            const updatedPlaylist: UserPlaylistClass = await UserPlaylist
                .findByIdAndUpdate(
                    request.params.playlist,
                    {
                        $set: clientPlaylist
                    },
                    {
                        new: true
                    }
                )
                .populate("user", "name")
                .populate("videos", "name link")

            return response.status(200).send(updatedPlaylist)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    /**
     * Deletes a playlist from the collection
     *
     * @param {Request} request Contains the ObjectId of the box as a request parameter
     * @param {Response} response
     * @returns {Promise<Response>} The deleted playlist is sent back as confirmation, or one of the following codes:
     * - 401 'UNAUTHORIZED': No JWT was given to the API
     * - 404 'PLAYLIST_NOT_FOUND': No playlist matches the given ObjectId
     * - 500 Server Error: Something wrong occurred
     * @memberof PlaylistApi
     */
    public async destroy(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth
        const playlist: UserPlaylistClass = response.locals.playlist

        if (decodedToken.user.toString() !== playlist.user._id.toString()) {
            return response.status(401).send('UNAUTHORIZED')
        }

        if (!playlist.isDeletable) {
            return response.status(403).send('NOT_PERMITTED')
        }

        try {
            const deletedPlaylist = await UserPlaylist.findByIdAndRemove(request.param.playlist)

            return response.status(200).send(deletedPlaylist)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    /**
     * Adds a video to an existing playlist
     *
     * @param {Request} request
     * @param {Response} response
     * @returns {Promise<Response>} The updated playlist is sent back
     * @memberof PlaylistApi
     */
    public async addVideoToPlaylist(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth
        const playlist: UserPlaylistClass = response.locals.playlist

        if (decodedToken.user.toString() !== playlist.user._id.toString()) {
            return response.status(401).send('UNAUTHORIZED')
        }

        try {
            let video = request.body.videoId || null

            if (!video) {
                const youtubeRequest = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails&id=${request.body.videoLink}&key=${process.env.YOUTUBE_API_KEY}`)

                const youtubeResponse = youtubeRequest.data

                video = (await Video.create({
                    link: request.body.videoLink,
                    name: youtubeResponse.items[0].snippet.title,
                    duration: youtubeResponse.items[0].contentDetails.duration
                }))._id
            }

            const updatedPlaylist: UserPlaylistDocument = await UserPlaylist
                .findByIdAndUpdate(
                    request.params.playlist,
                    {
                        $push: { videos: video }
                    },
                    {
                        new: true
                    }
                )
                .populate("user", "name")
                .populate("videos", "name link")


            return response.status(200).send(updatedPlaylist)
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    /**
     * Removes a video from a playlist
     *
     * @param {Request} request
     * @param {Response} response
     * @returns {Promise<Response>} The updated playlist
     * @memberof PlaylistApi
     */
    public async removeVideoFromPlaylist(request: Request, response: Response): Promise<Response> {
        const decodedToken = response.locals.auth
        const playlist: UserPlaylistClass = response.locals.playlist

        if (decodedToken.user.toString() !== playlist.user._id.toString()) {
            return response.status(401).send('UNAUTHORIZED')
        }

        try {
            const updatedPlaylist: UserPlaylistDocument = await UserPlaylist
                .findByIdAndUpdate(
                    request.params.playlist,
                    {
                        $pull: { videos: request.params.video }
                    },
                    {
                        new: true
                    }
                )
                .populate("user", "name")
                .populate("videos", "name link")

            return response.status(200).send(updatedPlaylist)
        } catch (error) {
            return response.status(500).send(error)
        }
    }
}

const playlistApi = new PlaylistApi()
export default playlistApi.router
