import arrayMove from 'array-move'
import * as _ from "lodash"
const axios = require("axios")
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mongoose = require("./../../config/connection")
const dotenv = require("dotenv")
dotenv.config()

const BoxSchema = require("./../../models/box.model")
const User = require("./../../models/user.model")
import { Message, QueueItem, QueueItemActionRequest, VideoSubmissionRequest, FeedbackMessage, PlaylistSubmissionRequest } from "@teamberry/muscadine"
import { Box } from "../../models/box.model"
import { Video } from "../../models/video.model"
import { UserPlaylist, UserPlaylistDocument } from '../../models/user-playlist.model'

export class QueueService {
    /**
     * When recieving a video from an user, the service searches for it in the video database
     * and adds the video to the playlist of the box.
     *
     * If the video's not found in the database, it is created.
     *
     * Once it's done, it emits a confirmation message to the user.
     *
     * @param {VideoSubmissionRequest} request The essentials to find the video, the user and the box. The payload is a JSON of this structure:
     * @returns {Promise<{ feedback: any, updatedBox: any }>} A promise with a feedback message and the populated updated Box
     * @memberof PlaylistService
     */
    public async onVideoSubmitted(request: VideoSubmissionRequest): Promise<{ feedback: Message, updatedBox: any }> {
        try {
            // Obtaining video from database. Creating it if needed
            const video = await this.getVideoDetails(request.link)

            // Finding the user who submitted the video
            const user = await User.findById(request.userToken)

            // Adding it to the playlist of the box
            const updatedBox = await this.addVideoToQueue(video, request.boxToken, request.userToken)
            let message: string

            if (user) {
                message = `${user.name} has added the video "${video.name}" to the playlist.`
            } else {
                message = `The video "${video.name}" has been added to the playlist.`
            }

            const feedback = new FeedbackMessage({
                contents: message,
                source: "system",
                scope: request.boxToken,
                feedbackType: 'info'
            })

            return { feedback, updatedBox }
        } catch (error) {
            // If the box is closed, the error is sent back to the socket method.
            throw new Error(error.message)
        }
    }

    public async onPlaylistSubmitted(request: PlaylistSubmissionRequest): Promise<{ feedback: Message, updatedBox: any }> {
        try {
            // Get the playlist
            const playlist = await UserPlaylist.findById(request.playlistId)

            if (!playlist) {
                throw new Error('The playlist could not be found. The submission has been rejected.')
            }

            const user = await User.findById(request.userToken)

            if (!user) {
                throw new Error('No user was found. The submission has been rejected.')
            }

            const updatedBox = await this.addPlaylistToQueue(playlist, request.boxToken, request.userToken)

            const feedback = new FeedbackMessage({
                contents: `${user.name} has added the playlist "${playlist.name}" to the queue.`,
                source: "system",
                scope: request.boxToken,
                feedbackType: 'info'
            })

            return { feedback, updatedBox }
        } catch (error) {
            throw Error(error.message)
        }
    }

    /**
     * Removing a video from the playlist of a box.
     *
     * @param {QueueItemActionRequest} request
     * @returns {Promise<{ feedback: Message, updatedBox: any }>}
     * @memberof PlaylistService
     */
    public async onVideoCancelled(request: QueueItemActionRequest): Promise<{ feedback: Message, updatedBox: any }> {
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

            const feedback = new FeedbackMessage({
                contents: message,
                source: 'system',
                scope: request.boxToken,
                feedbackType: 'info'
            })

            return { feedback, updatedBox }
        } catch (error) {
            throw new Error(error)
        }
    }

    /**
     * Preselects a video in the queue. The preselected video will be the next one to be played regardless of
     * all the other parameters of the box
     *
     * @param {QueueItemActionRequest} request
     * @returns {Promise<{ feedback: FeedbackMessage, updatedBox: any }>}
     * @memberof QueueService
     */
    public async onVideoPreselected(request: QueueItemActionRequest): Promise<{ feedback: FeedbackMessage, updatedBox: any }>{
        try {
            const user = await User.findById(request.userToken)

            const box = await BoxSchema.findById(request.boxToken)

            if (!box.open) {
                throw new Error("The box is closed. The playlist cannot be modified.")
            }

            const alreadySelectedVideoIndex: number = box.playlist.findIndex((video: QueueItem) => video.isPreselected)
            const targetVideoIndex: number = box.playlist.findIndex((video: QueueItem) => video._id.toString() === request.item)

            // Before we do anything, securities:
            // - The target video has to exist
            // - The target video has to not be either playing or passed
            if (targetVideoIndex === -1) {
                throw new Error("The video you selected could not be found.")
            }

            if (box.playlist[targetVideoIndex].startTime !== null) {
                if (box.playlist[targetVideoIndex].endTime !== null) {
                    throw new Error("The video you selected has already been played.")
                } else {
                    throw new Error("The video you selected is currently playing.")
                }
            }

            let contents = ''

            // Unselect already selected video if it exists
            if (alreadySelectedVideoIndex !== -1) {
                box.playlist[alreadySelectedVideoIndex].isPreselected = false
                contents = `${user.name} has removed the preselection on "$OLD_VIDEO$".`
            }

            // Preselect new video if it's not the same as the one that just got deselected
            if (alreadySelectedVideoIndex !== targetVideoIndex) {
                box.playlist[targetVideoIndex].isPreselected = true
                contents = `${user.name} has preselected the video "$NEW_VIDEO$". It will be the next video to play.`
            }

            const updatedBox = await BoxSchema
                .findByIdAndUpdate(
                    request.boxToken,
                    { $set: { playlist: box.playlist } },
                    { new: true }
                )
                .populate("creator", "_id name")
                .populate("playlist.video")
                .populate("playlist.submitted_by", "_id name")

            // Feedback messages
            if (contents.includes('$OLD_VIDEO$')) {
                contents = contents.replace(/\$OLD_VIDEO\$/gm, `${updatedBox.playlist[alreadySelectedVideoIndex].video.name}`)
            }

            if (contents.includes('$NEW_VIDEO$')) {
                contents = contents.replace(/\$NEW_VIDEO\$/gm, `${updatedBox.playlist[targetVideoIndex].video.name}`)
            }

            const feedback = new FeedbackMessage({
                contents,
                source: 'system',
                scope: request.boxToken,
                feedbackType: 'info'
            })

            return { feedback, updatedBox }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    /**
     * Adds the obtained video to the queue of the box
     *
     * @param {any} video The video to add to the queue
     * @param {string} boxToken The doucment ID of the box
     * @param {string} userToken The document ID of the user who submitted the video
     * @returns
     * @memberof PlaylistService
     */
    public async addVideoToQueue(video, boxToken: string, userToken: string) {
        const box = await BoxSchema.findById(boxToken)

        if (box.open === false) {
            throw new Error("This box is closed. Submission is disallowed.")
        }

        const submission: QueueItem = {
            video: video._id,
            startTime: null,
            endTime: null,
            submittedAt: new Date(),
            submitted_by: userToken,
            isPreselected: false
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
     * Adds a playlist to the queue of the box
     *
     * @param {UserPlaylistDocument} playlist
     * @param {string} boxToken
     * @param {string} userToken
     * @returns
     * @memberof QueueService
     */
    public async addPlaylistToQueue(playlist: UserPlaylistDocument, boxToken: string, userToken: string) {

        const box = await BoxSchema.findById(boxToken)

        if (!box.open) {
            throw new Error("This box is closed. Submission is disallowed.")
        }

        console.log(playlist);

        (playlist.videos as unknown as Array<string>).forEach((video: string) => {
            box.playlist.unshift({
                video,
                startTime: null,
                endTime: null,
                submittedAt: new Date(),
                submitted_by: userToken
            })
        })

        const updatedBox = await BoxSchema
            .findByIdAndUpdate(
                boxToken,
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
    public async getNextVideo(boxToken: string): Promise<{ nextVideo: QueueItem, updatedBox: Box } | null> {
        const transitionTime = new Date()
        const response = {
            nextVideo: null,
            updatedBox: null
        }

        const box: Box = await BoxSchema
            .findById(boxToken)
            .populate("playlist.video")
            .populate("playlist.submitted_by", "_id name")
            .lean()

        if (!box) {
            return null
        }

        const currentVideoIndex = _.findIndex(box.playlist, (video: QueueItem) => video.startTime !== null && video.endTime === null)

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
        let nextVideoIndex = -1

        // Look for a preselected video
        const preselectedVideoIndex = box.playlist.findIndex(video => video.isPreselected)
        if (preselectedVideoIndex !== -1) {
            nextVideoIndex = preselectedVideoIndex
        } else {
            // Look for a video, either randomly or not
            if (box.options.random === true) {
                const availableVideos = box.playlist.filter(video => video.startTime === null)

                if (availableVideos.length > 0) {
                    const nextVideo = availableVideos[Math.floor(Math.random() * availableVideos.length)]
                    nextVideoIndex = _.findLastIndex(box.playlist, (video: QueueItem) => video._id === nextVideo._id)
                }
            } else {
                // Non-random
                nextVideoIndex = _.findLastIndex(box.playlist, video => video.startTime === null)
            }
        }

        if (nextVideoIndex !== -1) {
            box.playlist[nextVideoIndex].startTime = transitionTime
            box.playlist[nextVideoIndex].isPreselected = false
            response.nextVideo = box.playlist[nextVideoIndex]

            // Puts the starting video between the upcoming & played videos
            box.playlist = arrayMove(box.playlist, nextVideoIndex, currentVideoIndex - 1)
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

        let newBatch: Array<QueueItem> = []

        playlist.forEach((item: QueueItem) => {
            const submission = {
                video: item.video,
                startTime: null,
                endTime: null,
                submittedAt: new Date(),
                submitted_by: item.submitted_by,
                isPreselected: false
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

                if (youtubeResponse.items.length === 0) {
                    throw Error('The link does not match any video.')
                }

                video = await Video.create({
                    link,
                    name: youtubeResponse.items[0].snippet.title,
                    duration: youtubeResponse.items[0].contentDetails.duration
                })
            }

            return video
        } catch (error) {
            throw new Error(error.message)
        }
    }
}

const queueService = new QueueService()
export default queueService