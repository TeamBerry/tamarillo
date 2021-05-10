import { NextFunction, Request, Response, Router } from "express"
const axios = require("axios")

import { UserPlaylist, UserPlaylistClass, UserPlaylistDocument } from "../../models/user-playlist.model"
import { Video } from "../../models/video.model"
import { User } from "../../models/user.model"
const auth = require("./../middlewares/auth.middleware")

const router = Router()

const verifyPlaylistOwnership = (decodedToken, playlist: UserPlaylistClass) => {
    if (playlist.user instanceof User) {
        return decodedToken.user.toString() === playlist.user._id.toString()
    } else {
        return decodedToken.user.toString() === playlist.user.toString()
    }
}

router.param("playlist", async (request: Request, response: Response, next: NextFunction): Promise<Response> => {
    const matchingPlaylist = await UserPlaylist
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

router.get("/", auth.canBeAuthorized, async (_: Request, response: Response) => {
    const filters: Partial<{ isPrivate: boolean, user: any }> = { isPrivate: false }

    // Excluding the user from the search to display only playlists to "discover"
    // The user can go to "My Playlists" to see his own playlists
    const decodedToken = response.locals.auth
    if (decodedToken) {
        filters.user = { $ne: decodedToken.user }
    }

    const playlists = await UserPlaylist
        .find(filters)
        .populate("user", "name")
        .populate("videos", "name link")
        .lean()

    return response.status(200).send(playlists)
})

router.get("/:playlist", auth.isAuthorized, async (_: Request, response: Response) => {
    const decodedToken = response.locals.auth
    const playlist: UserPlaylistDocument = response.locals.playlist

    if (!verifyPlaylistOwnership(decodedToken, playlist)) {
        return response.status(401).send('UNAUTHORIZED')
    }

    return response.status(200).send(response.locals.playlist)
})

router.post("/", auth.isAuthorized, async (request: Request, response: Response) => {
    {
        if (Object.keys(request.body).length === 0) {
            return response.status(412).send('MISSING_PARAMETERS')
        }

        try {
            const createdPlaylist = await UserPlaylist.create(request.body)

            return response.status(201).send(createdPlaylist)
        } catch (error) {
            return response.status(500).send(error)
        }
    }
})

router.put("/:playlist", auth.isAuthorized, async (request: Request, response: Response) => {
    if (Object.keys(request.body).length === 0) {
        return response.status(412).send('MISSING_PARAMETERS')
    }

    const decodedToken = response.locals.auth
    const playlist: UserPlaylistDocument = response.locals.playlist

    if (!verifyPlaylistOwnership(decodedToken, playlist)) {
        return response.status(401).send('UNAUTHORIZED')
    }

    const clientPlaylist: Partial<UserPlaylistClass> = request.body

    if (request.body._id !== request.params.playlist) {
        return response.status(412).send('IDENTIFIER_MISMATCH')
    }

    try {
        const updatedPlaylist = await UserPlaylist
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
            .lean()

        return response.status(200).send(updatedPlaylist)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.delete("/:playlist", auth.isAuthorized, async (request: Request, response: Response) => {
    const decodedToken = response.locals.auth
    const playlist: UserPlaylistDocument = response.locals.playlist

    if (!verifyPlaylistOwnership(decodedToken, playlist)) {
        return response.status(401).send('UNAUTHORIZED')
    }

    if (!playlist.isDeletable) {
        return response.status(403).send('NOT_PERMITTED')
    }

    try {
        const deletedPlaylist = await UserPlaylist.findByIdAndRemove(request.params.playlist)

        return response.status(200).send(deletedPlaylist)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.post("/:playlist/videos", auth.isAuthorized, async (request: Request, response: Response) => {
    const decodedToken = response.locals.auth
    const playlist: UserPlaylistDocument = response.locals.playlist

    if (!verifyPlaylistOwnership(decodedToken, playlist)) {
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
})

router.delete("/:playlist/videos/:video", auth.isAuthorized, async (request: Request, response: Response) => {
    const decodedToken = response.locals.auth
    const playlist: UserPlaylistDocument = response.locals.playlist

    if (!verifyPlaylistOwnership(decodedToken, playlist)) {
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
            .lean()

        return response.status(200).send(updatedPlaylist)
    } catch (error) {
        return response.status(500).send(error)
    }
})

export const PlaylistApi = router
