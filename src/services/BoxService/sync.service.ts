import * as _ from "lodash"
import * as moment from "moment"
const axios = require("axios")
const mongoose = require("./../../config/connection")
const querystring = require("querystring")
const dotenv = require("dotenv")
dotenv.config()

const BoxSchema = require("./../../models/box.model")
const User = require("./../../models/user.model")
import { Box } from "../../models/box.model"
import { PlaylistItem } from "../../models/playlist-item.model"
import { SyncPacket } from "../../models/sync-packet.model"
import { SubmissionPayload, CancelPayload } from "../../models/video-payload.model"
import { Video } from "../../models/video.model"
import { Message } from "./../../models/message.model"

export class SyncService {
    /**
     * After the client auth themselves, they need to caught up with the others in the box. It means they will ask for the
     * current video playing and must have an answer.
     *
     * This has to only send the link and its timestamp. If non-sockets want to know what's playing in a box, they'll listen to
     * a webhook. This is only for in-box requests.
     *
     * @param {string} boxToken The token of the box
     * @returns {Promise<SyncPacket>} The packet for sync
     * @memberof SyncService
     */
    public async onStart(boxToken: string): Promise<SyncPacket> {
        const response: SyncPacket = { item: null, box: boxToken }

        try {
            response.item = await this.getCurrentVideo(boxToken)
            return response
        } catch (error) {
            throw error
        }
    }

    /**
     * When recieving a video from an user, the service searches for it in the video database
     * and adds the video to the playlist of the box.
     *
     * If the video's not found in the database, it is created.
     *
     * Once it's done, it emits a confirmation message to the user.
     *
     * @param {SubmissionPayload} payload The essentials to find the video, the user and the box. The payload is a JSON of this structure:
     * @returns {Promise<{ feedback: any, updatedBox: any }>} A promise with a feedback message and the populated updated Box
     * @memberof SyncService
     */
    public async onVideo(payload: SubmissionPayload): Promise<{ feedback: Message, updatedBox: any }> {
        try {
            // Obtaining video from database. Creating it if needed
            const video = await this.getVideo(payload.link)

            // Finding the user who submitted the video
            const user = await User.findById(payload.userToken)

            // Adding it to the playlist of the box
            const updatedBox = await this.postToBox(video, payload.boxToken, payload.userToken)
            let message: string

            if (user) {
                message = user.name + ' has added the video "' + video.name + '" to the playlist.'
            } else {
                message = 'The video "' + video.name + '" has been added to the playlist'
            }

            const feedback = new Message({
                contents: message,
                source: "bot",
                scope: payload.boxToken,
            })

            return { feedback, updatedBox }
        } catch (error) {
            // If the box is closed, the error is sent back to the socket method.
            throw Error(error)
        }
    }

    /**
     * Removing a video from the playlist of a box.
     *
     * @param {{ boxToken, userToken, playlistItem }} payload
     * @returns {Promise<{ feedback: Message, updatedBox: any }>}
     * @memberof SyncService
     */
    public async onVideoCancel(payload: CancelPayload): Promise<{ feedback: Message, updatedBox: any }> {
        try {
            const user = await User.findById(payload.userToken)

            const box = await BoxSchema.findById(payload.boxToken)

            if (!box.open) {
                throw new Error("The box is closed. The playlist cannot be modifieds.")
            }

            // Pull the video from the paylist
            const updatedBox = await BoxSchema
                .findByIdAndUpdate(
                    payload.boxToken,
                    {
                        $pull: { playlist: { _id: payload.item } }
                    },
                    {
                        new: true
                    }
                )
                .populate("playlist.video")
                .populate("playlist.submitted_by", "_id name")

            const message: string = `${user.name} has removed a submission from the playlist`

            const feedback = new Message({
                contents: message,
                source: 'bot',
                scope: payload.boxToken
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
     * @memberof SyncService
     */
    public async postToBox(video, boxToken: string, userToken: string) {
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
            submitted_by: userToken,
        }

        box.playlist.unshift(submission)

        const updatedBox = await BoxSchema
            .findOneAndUpdate(
                { _id: boxToken },
                { $set: { playlist: box.playlist } },
                { new: true },
            ).populate("playlist.video")
            .populate("playlist.submitted_by", "_id name")

        return updatedBox
    }

    /**
     * Gets the currently playing video of the box and returns it
     *
     * @param {string} boxToken The document id of the box
     * @returns the video. The structure is the same as a playlist entry
     * @memberof SyncService
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

        const currentVideo = _.find(box.playlist, (video) => {
            return video.startTime !== null && video.endTime === null
        })

        return currentVideo ? currentVideo : null
    }

    /**
     * Gets the next video from the playlist to play. Will
     * update the playlist of the box, and send JSON containing all the info for subscribers
     * in the box
     *
     * @param {string} boxToken The document ID of the box
     * @returns JSON of the nextVideo and the updatedBox, or null
     * @memberof SyncService
     */
    public async getNextVideo(boxToken: string): Promise<{ nextVideo: PlaylistItem, updatedBox: Box } | null> {
        const transitionTime = new Date()
        const response = null

        const box: Box = await BoxSchema.findById(boxToken)

        // TODO: Find last index to skip ignored videos
        const currentVideoIndex = _.findIndex(box.playlist, (video: PlaylistItem) => {
            return video.startTime !== null && video.endTime === null
        })

        // A video was playing and just ended
        if (currentVideoIndex !== -1) {
            // Ends the current video, the one that just ended
            box.playlist[currentVideoIndex].endTime = transitionTime

            // Searches for a new one
            if (currentVideoIndex !== 0) {
                box.playlist[currentVideoIndex - 1].startTime = transitionTime
            }

            // Updates the box
            const updatedBox: Box = await BoxSchema
                .findOneAndUpdate(
                    { _id: boxToken },
                    { $set: { playlist: box.playlist } },
                    { new: true },
                )
                .populate("playlist.video")
                .populate("playlist.submitted_by", "_id name")

            let nextVideo = null
            if (currentVideoIndex !== 0) {
                nextVideo = updatedBox.playlist[currentVideoIndex - 1]
            }

            return {
                nextVideo,
                updatedBox,
            }
        } else {
            // No video was playing before, the playlist was over (which means the service already entered the if condition once but found nothing)
            const nextVideoIndex = _.findLastIndex(box.playlist, (video) => {
                return video.startTime === null
            })

            if (nextVideoIndex !== -1) {
                box.playlist[nextVideoIndex].startTime = transitionTime

                const updatedBox = await BoxSchema
                    .findOneAndUpdate(
                        { _id: boxToken },
                        { $set: { playlist: box.playlist } },
                        { new: true },
                    )
                    .populate("playlist.video")
                    .populate("playlist.submitted_by", "_id name")

                const nextVideo = updatedBox.playlist[nextVideoIndex]

                return {
                    nextVideo,
                    updatedBox,
                }
            }
        }

        return null
    }

    /**
     * Gets the video from the database. If it doesn't exist, it will create the new video and send it back.
     *
     * @param {string} link the unique YouTube ID of the video
     * @returns {any} The video
     * @memberof SyncService
     */
    private async getVideo(link: string) {
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
            throw new Error(error)
        }
    }
}

const syncService = new SyncService()
export default syncService
