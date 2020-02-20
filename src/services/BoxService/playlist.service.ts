import arrayMove from 'array-move'
import * as _ from "lodash"
const axios = require("axios")
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mongoose = require("./../../config/connection")
const dotenv = require("dotenv")
dotenv.config()

const BoxSchema = require("./../../models/box.model")
const User = require("./../../models/user.model")
import {
    Message,
    PlaylistItem,
    PlaylistItemCancelRequest,
    PlaylistItemSubmissionRequest,
    PlaylistItemIgnoreRequest,
    PlaylistItemUnignoreRequest
} from "@teamberry/muscadine"
import { Box } from "../../models/box.model"
import { Video } from "../../models/video.model"

export class PlaylistService {
    /**
     * When recieving a video from an user, the service searches for it in the video database
     * and adds the video to the playlist of the box.
     *
     * If the video's not found in the database, it is created.
     *
     * Once it's done, it emits a confirmation message to the user.
     *
     * @param {PlaylistItemSubmissionRequest} request The essentials to find the video, the user and the box. The payload is a JSON of this structure:
     * @returns {Promise<{ feedback: any, updatedBox: any }>} A promise with a feedback message and the populated updated Box
     * @memberof PlaylistService
     */
    public async onVideoSubmitted(request: PlaylistItemSubmissionRequest): Promise<{ feedback: Message, updatedBox: any }> {
        try {
            // Obtaining video from database. Creating it if needed
            const video = await this.getVideoDetails(request.link)

            // Finding the user who submitted the video
            const user = await User.findById(request.userToken)

            // Adding it to the playlist of the box
            const updatedBox = await this.addVideoToPlaylist(video, request.boxToken, request.userToken)
            let message: string

            if (user) {
                message = user.name + ' has added the video "' + video.name + '" to the playlist.'
            } else {
                message = 'The video "' + video.name + '" has been added to the playlist'
            }

            const feedback = new Message({
                contents: message,
                source: "bot",
                scope: request.boxToken
            })

            return { feedback, updatedBox }
        } catch (error) {
            // If the box is closed, the error is sent back to the socket method.
            throw Error(error)
        }
    }

    public async onVideoIgnored(request: PlaylistItemIgnoreRequest): Promise<{ feedback: Message, updatedBox: any }> {
        try {
            const user = await User.findById(request.userToken)

            const box = await BoxSchema.findById(request.boxToken)

            if (!box.open) {
                throw new Error("The box is closed. The playlist cannot be modified.")
            }

            const updatedBox = await BoxSchema
                .findOneAndUpdate(
                    { '_id': request.boxToken, 'playlist._id': request.item },
                    {
                        $set: { 'playlist.$.ignored': true }
                    },
                    {
                        new: true
                    }
                )
                .populate("creator", "_id name")
                .populate("playlist.video")
                .populate("playlist.submitted_by", "_id name")

            const targetVideo: PlaylistItem = updatedBox.playlist.find(
                (item: PlaylistItem) => item._id.toString() === request.item
            )

            const feedback = new Message({
                contents: `${user.name} has marked the video '${targetVideo.video.name}' for skip.`,
                source: 'bot',
                scope: request.boxToken
            })

            return { feedback, updatedBox }
        } catch (error) {
            throw new Error(error)
        }
    }

    public async onVideoUnignored(request: PlaylistItemUnignoreRequest): Promise<{ feedback: Message, updatedBox: any }> {
        try {
            const user = await User.findById(request.userToken)

            const box = await BoxSchema.findById(request.boxToken)

            if (!box.open) {
                throw new Error("The box is closed. The playlist cannot be modified.")
            }

            const updatedBox = await BoxSchema
                .findOneAndUpdate(
                    { '_id': request.boxToken, 'playlist._id': request.item },
                    {
                        $set: { 'playlist.$.ignored': false }
                    },
                    {
                        new: true
                    }
                )
                .populate("creator", "_id name")
                .populate("playlist.video")
                .populate("playlist.submitted_by", "_id name")

            const targetVideo: PlaylistItem = updatedBox.playlist.find(
                (item: PlaylistItem) => item._id.toString() === request.item
            )

            const feedback = new Message({
                contents: `${user.name} has reinstated the video '${targetVideo.video.name}' in the playlist.`,
                source: 'bot',
                scope: request.boxToken
            })

            return { feedback, updatedBox }
        } catch (error) {
            throw new Error(error)
        }
    }

    /**
     * Removing a video from the playlist of a box.
     *
     * @param {PlaylistItemCancelRequest} request
     * @returns {Promise<{ feedback: Message, updatedBox: any }>}
     * @memberof PlaylistService
     */
    public async onVideoCancelled(request: PlaylistItemCancelRequest): Promise<{ feedback: Message, updatedBox: any }> {
        try {
            const user = await User.findById(request.userToken)

            const box = await BoxSchema.findById(request.boxToken)

            if (!box.open) {
                throw new Error("The box is closed. The playlist cannot be modified.")
            }

            // Pull the video from the paylist
            const updatedBox = await BoxSchema
                .findByIdAndUpdate(
                    request.boxToken,
                    {
                        $pull: { playlist: { _id: request.item } }
                    },
                    {
                        new: true
                    }
                )
                .populate("creator", "_id name")
                .populate("playlist.video")
                .populate("playlist.submitted_by", "_id name")

            const message = `${user.name} has removed a submission from the playlist`

            const feedback = new Message({
                contents: message,
                source: 'bot',
                scope: request.boxToken
            })

            return { feedback, updatedBox }
        } catch (error) {
            throw new Error(error)
        }
    }

    /**
     * Adds the obtained video to the playlist of the box
     *
     * @param {any} video The video to add to the playlist
     * @param {string} boxToken The doucment ID of the box
     * @param {string} userToken The document ID of the user who submitted the video
     * @returns
     * @memberof PlaylistService
     */
    public async addVideoToPlaylist(video, boxToken: string, userToken: string) {
        const box = await BoxSchema.findById(boxToken)

        if (box.open === false) {
            throw new Error("This box is closed. Submission is disallowed.")
        }

        const submission = {
            video: video._id,
            startTime: null,
            endTime: null,
            ignored: false,
            submittedAt: new Date(),
            submitted_by: userToken
        }

        box.playlist.unshift(submission)

        const updatedBox = await BoxSchema
            .findOneAndUpdate(
                { _id: boxToken },
                { $set: { playlist: box.playlist } },
                { new: true }
            )
            .populate("creator", "_id name")
            .populate("playlist.video")
            .populate("playlist.submitted_by", "_id name")

        return updatedBox
    }

    /**
     * Gets the currently playing video of the box and returns it
     *
     * @param {string} boxToken The document id of the box
     * @returns the video. The structure is the same as a playlist entry
     * @memberof PlaylistService
     */
    public async getCurrentVideo(boxToken: string) {
        const box = await BoxSchema
            .findById(boxToken)
            .populate("playlist.video", "_id link name")
            .populate("playlist.submitted_by", "_id name")
            .lean()

        if (box.open === false) {
            throw new Error("This box is closed. Video play is disabled.")
        }

        if (box.playlist.length === 0) {
            return null
        }

        const currentVideo = _.find(box.playlist, video => video.startTime !== null && video.endTime === null)

        return currentVideo ? currentVideo : null
    }

    /**
     * Gets the next video from the playlist to play. Will
     * update the playlist of the box, and send JSON containing all the info for subscribers
     * in the box
     *
     * @param {string} boxToken The document ID of the box
     * @returns JSON of the nextVideo and the updatedBox, or null
     * @memberof PlaylistService
     */
    public async getNextVideo(boxToken: string): Promise<{ nextVideo: PlaylistItem, updatedBox: Box } | null> {
        const transitionTime = new Date()
        const response = {
            nextVideo: null,
            updatedBox: null
        }

        const box: Box = await BoxSchema
            .findById(boxToken)
            .populate("playlist.video")
            .lean()

        let currentVideoIndex = _.findIndex(box.playlist, (video: PlaylistItem) => video.startTime !== null && video.endTime === null)
        let nextVideoIndex = -1

        let hasFoundVideo = false
        let hasNoMoreVideos = false

        while (!hasFoundVideo && !hasNoMoreVideos) {
            console.log('Finding new video.', hasFoundVideo, nextVideoIndex, currentVideoIndex)
            // Ends the current video, the one that just ended
            if (currentVideoIndex !== -1) {
                box.playlist[currentVideoIndex].endTime = transitionTime
            }

            // Test if there are some videos remaining
            const remainingVideos = box.playlist.filter(video => video.startTime === null).length

            // Loop Mode if no more videos are upcoming and the loop is active
            if (remainingVideos === 0 && box.options.loop === true) {
                box.playlist = await this.loopPlaylist(box)
            }

            // Search for a new video
            if (box.options.random === true) {
                const availableVideos = box.playlist.filter(video => video.startTime === null)

                if (availableVideos.length > 0) {
                    const nextVideo = availableVideos[Math.floor(Math.random() * availableVideos.length)]
                    nextVideoIndex = _.findLastIndex(box.playlist, (video: PlaylistItem) => video._id === nextVideo._id)
                }
            } else {
                // Non-random
                nextVideoIndex = _.findLastIndex(box.playlist, video => video.startTime === null)
            }

            // A video has been found!
            if (nextVideoIndex !== -1) {
                box.playlist[nextVideoIndex].startTime = transitionTime
                response.nextVideo = box.playlist[nextVideoIndex]

                // Puts the starting video between the upcoming & played videos
                box.playlist = arrayMove(box.playlist, nextVideoIndex, currentVideoIndex - 1)
                currentVideoIndex = nextVideoIndex

                // Leaves the process if the video is not marked as ignored
                if (!box.playlist[nextVideoIndex].ignored) {
                    hasFoundVideo = true
                }
            } else {
                hasNoMoreVideos = true
            }
        }

        // Updates the box
        response.updatedBox = await BoxSchema
            .findOneAndUpdate(
                { _id: boxToken },
                { $set: { playlist: box.playlist } },
                { new: true }
            )
            .populate("creator", "_id name")
            .populate("playlist.video")
            .populate("playlist.submitted_by", "_id name")

        return response
    }

    /**
     * Called if Loop Mode is enabled.
     *
     * If there are no more videos in the upcoming pool, the entire playlist is resubmitted in order
     *
     * @private
     * @param {Box} box
     * @memberof PlaylistService
     */
    public async loopPlaylist(box: Box): Promise<Box['playlist']> {
        const playlist = box.playlist

        let newBatch: Array<PlaylistItem> = []

        playlist.forEach((item: PlaylistItem) => {
            const submission = {
                video: item.video,
                startTime: null,
                endTime: null,
                ignored: item.ignored,
                submittedAt: new Date(),
                submitted_by: item.submitted_by
            }

            newBatch.push(submission)
        })

        newBatch = _.uniqBy(newBatch, 'video')

        box.playlist = newBatch

        return box.playlist
    }

    /**
     * Gets the video from the database. If it doesn't exist, it will create the new video and send it back.
     *
     * @param {string} link the unique YouTube ID of the video
     * @returns {any} The video
     * @memberof PlaylistService
     */
    private async getVideoDetails(link: string) {
        let video = await Video.findOne({ link })

        try {
            if (!video) {
                const youtubeRequest = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails&id=${link}&key=${process.env.YOUTUBE_API_KEY}`)

                const youtubeResponse = youtubeRequest.data

                video = await Video.create({
                    link,
                    name: youtubeResponse.items[0].snippet.title,
                    duration: youtubeResponse.items[0].contentDetails.duration
                })
            }

            return video
        } catch (error) {
            console.error(error)
            throw new Error(error)
        }
    }
}

const playlistService = new PlaylistService()
export default playlistService
