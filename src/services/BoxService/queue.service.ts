import arrayMove from 'array-move'
import * as _ from "lodash"
const axios = require("axios")
import moment = require("moment")
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mongoose = require("./../../config/connection")
const dotenv = require("dotenv")
dotenv.config()
import * as Queue from 'bull'
const syncQueue = new Queue("sync")

const BoxSchema = require("./../../models/box.model")
import { QueueItem, QueueItemActionRequest, VideoSubmissionRequest, PlaylistSubmissionRequest, SyncPacket, SystemMessage, BoxScope, PlayingItem } from "@teamberry/muscadine"
import { Box } from "../../models/box.model"
import { Video } from "../../models/video.model"
import { UserPlaylist, UserPlaylistDocument } from '../../models/user-playlist.model'
import { Subscriber } from '../../models/subscriber.model'
import berriesService from './berries.service'
import { User } from '../../models/user.model'
import { YoutubeVideoListResponse } from '../../models/youtube.model'
import aclService from './acl.service'

const PLAY_NEXT_BERRY_COST = 10
const SKIP_BERRY_COST = 30
const PLAY_NOW_BERRY_COST = 50

export class QueueService {
    /**
     * When recieving a video from an user, the service searches for it in the video database
     * and adds the video to the queue of the box.
     *
     * If the video's not found in the database, it is created.
     *
     * Once it's done, it emits a confirmation message to the user.
     *
     * @param {VideoSubmissionRequest} request The essentials to find the video, the user and the box. The payload is a JSON of this structure:
     * @returns {Promise<{ feedbackMessage: SystemMessage, updatedBox: any }>} A promise with a feedback message and the populated updated Box
     * @memberof PlaylistService
     */
    public async onVideoSubmitted(request: VideoSubmissionRequest): Promise<{ feedbackMessage: SystemMessage, updatedBox: any }> {
        try {
            // Obtaining video from database. Creating it if needed
            const video = await this.getVideoDetails(request.link)

            // Finding the user who submitted the video
            const user = await User.findById(request.userToken)

            // Adding it to the queue of the box
            const updatedBox = await this.addVideoToQueue(video, request.boxToken, request.userToken)
            let message: string

            if (user) {
                message = `${user.name} has added the video "${video.name}" to the queue.`
            } else {
                message = `The video "${video.name}" has been added to the queue.`
            }

            const feedbackMessage = new SystemMessage({
                contents: message,
                scope: request.boxToken,
                context: 'info'
            })

            return { feedbackMessage, updatedBox }
        } catch (error) {
            // If the box is closed, the error is sent back to the socket method.
            throw new Error(error.message)
        }
    }

    public async onPlaylistSubmitted(request: PlaylistSubmissionRequest): Promise<{ feedbackMessage: SystemMessage, updatedBox: any }> {
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

            const feedbackMessage = new SystemMessage({
                contents: `${user.name} has added his playlist "${playlist.name}" (${playlist.videos.length} videos) to the queue.`,
                scope: request.boxToken,
                context: 'info'
            })

            return { feedbackMessage, updatedBox }
        } catch (error) {
            throw Error(error.message)
        }
    }

    /**
     * Removing a video from the queue of a box.
     *
     * @param {QueueItemActionRequest} request
     * @returns {Promise<{ feedbackMessage: SystemMessage, updatedBox: any }>}
     * @memberof PlaylistService
     */
    public async onVideoCancelled(request: QueueItemActionRequest): Promise<{ feedbackMessage: SystemMessage, updatedBox: any }> {
        try {
            const user = await User.findById(request.userToken)

            const box: Box = await BoxSchema.findById(request.boxToken)

            if (!box.open) {
                throw new Error("The box is closed. The queue cannot be modified.")
            }

            // Get the video details
            const targetItem: QueueItem = box.playlist.find((item: QueueItem) => item._id.toString() === request.item)

            const targetVideo = await Video.findById(targetItem.video)

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

            const message = `${user.name} has removed the video "${targetVideo.name}" from the queue.`

            const feedbackMessage = new SystemMessage({
                contents: message,
                scope: request.boxToken,
                context: 'info'
            })

            return { feedbackMessage, updatedBox }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    /**
     * Preselects a video in the queue. The preselected video will be the next one to be played regardless of
     * all the other parameters of the box
     *
     * @param {QueueItemActionRequest} request
     * @returns {Promise<{ feedbackMessage: SystemMessage, updatedBox: any }>}
     * @memberof QueueService
     */
    public async onVideoPreselected(request: QueueItemActionRequest): Promise<{ feedbackMessage: SystemMessage, updatedBox: any }> {
        try {
            const user = await User.findById(request.userToken)

            const box = await BoxSchema.findById(request.boxToken)

            const areBerriesSpent = user._id.toString() !== box.creator.toString()

            if (!box.open) {
                throw new Error("The box is closed. The queue cannot be modified.")
            }

            if (areBerriesSpent) {
                const subscriber = await Subscriber.findOne({ userToken: request.userToken, boxToken: request.boxToken })
                if (subscriber.berries < PLAY_NEXT_BERRY_COST) {
                    throw new Error(`You do not have enough berries to use this action. You need ${PLAY_NEXT_BERRY_COST - subscriber.berries} more.`)
                }
            }

            const alreadySelectedVideoIndex: number = box.playlist.findIndex((video: QueueItem) => video.isPreselected)
            const targetVideoIndex: number = box.playlist.findIndex((video: QueueItem) => video._id.toString() === request.item.toString())

            // Before we do anything, securities:
            // - The target video has to exist
            // - The target video has to not be either playing or passed
            if (targetVideoIndex === -1) {
                throw new Error("The video you selected could not be found.")
            }

            const isPlaying = box.playlist[targetVideoIndex].startTime !== null && box.playlist[targetVideoIndex].endTime === null
            const wasPlayed = box.playlist[targetVideoIndex].startTime !== null && box.playlist[targetVideoIndex].endTime !== null

            if (isPlaying) {
                throw new Error("The video you selected is currently playing.")
            }

            if (wasPlayed && !box.options.loop) {
                throw new Error("The video you selected has already been played.")
            }

            const feedbackMessage = new SystemMessage({
                contents: '',
                scope: request.boxToken,
                context: 'info'
            })

            // Unselect already selected video if it exists
            if (alreadySelectedVideoIndex !== -1) {
                // If the already preselected video was forced with berries, the operation cannot continue
                if (box.playlist[alreadySelectedVideoIndex].stateForcedWithBerries === true) {
                    throw new Error("Another video has already been preselected with berries. You cannot overwrite the preselected video.")
                }

                box.playlist[alreadySelectedVideoIndex].isPreselected = false
                if (areBerriesSpent) {
                    feedbackMessage.contents = `${user.name} has spent ${PLAY_NEXT_BERRY_COST} berries to remove the preslection on "$OLD_VIDEO$".`
                    feedbackMessage.context = 'berries'
                } else {
                    feedbackMessage.contents = `${user.name} has removed the preselection on "$OLD_VIDEO$".`
                }
            }

            // Preselect new video if it's not the same as the one that just got deselected
            if (alreadySelectedVideoIndex !== targetVideoIndex) {
                box.playlist[targetVideoIndex].isPreselected = true
                if (areBerriesSpent) {
                    box.playlist[targetVideoIndex].stateForcedWithBerries = true
                    feedbackMessage.contents = `${user.name} has spent ${PLAY_NEXT_BERRY_COST} berries to preselect the video "$NEW_VIDEO$". It will be the next video to play.`
                    feedbackMessage.context = 'berries'
                } else {
                    feedbackMessage.contents = `${user.name} has preselected the video "$NEW_VIDEO$". It will be the next video to play.`
                }
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

            if (areBerriesSpent) {
                berriesService.decreaseBerryCount({ userToken: request.userToken, boxToken: request.boxToken }, PLAY_NEXT_BERRY_COST)
            }

            // Feedback messages
            if (feedbackMessage.contents.includes('$OLD_VIDEO$')) {
                feedbackMessage.contents = feedbackMessage.contents.replace(/\$OLD_VIDEO\$/gm, `${updatedBox.playlist[alreadySelectedVideoIndex].video.name}`)
            }

            if (feedbackMessage.contents.includes('$NEW_VIDEO$')) {
                feedbackMessage.contents = feedbackMessage.contents.replace(/\$NEW_VIDEO\$/gm, `${updatedBox.playlist[targetVideoIndex].video.name}`)
            }

            return { feedbackMessage, updatedBox }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    public async onVideoForcePlayed(request: QueueItemActionRequest): Promise<{ feedbackMessage: SystemMessage, updatedBox: any, syncPacket: SyncPacket }> {
        try {
            const user = await User.findById(request.userToken)

            const box = await BoxSchema.findById(request.boxToken)

            const areBerriesSpent = user._id.toString() !== box.creator.toString()

            if (!box.open) {
                throw new Error("The box is closed. The queue cannot be modified.")
            }

            if (areBerriesSpent) {
                const subscriber = await Subscriber.findOne({ userToken: request.userToken, boxToken: request.boxToken })
                if (subscriber.berries < PLAY_NOW_BERRY_COST) {
                    throw new Error(`You do not have enough berries to use this action. You need ${PLAY_NOW_BERRY_COST - subscriber.berries} more.`)
                }
            }

            const alreadyPlayingVideoIndex = box.playlist.findIndex(video => video.startTime !== null && video.endTime === null && video.stateForcedWithBerries === true)

            if (alreadyPlayingVideoIndex !== -1) {
                // If the already preselected video was forced with berries, the operation cannot continue
                throw new Error("An user has used berries to play the currently playing video. You cannot overwrite it.")
            }

            const targetVideoIndex = box.playlist.findIndex(video => video._id.toString() === request.item)

            if (targetVideoIndex === -1) {
                throw new Error('The video you selected could not be found.')
            }

            const isPlaying = box.playlist[targetVideoIndex].startTime !== null && box.playlist[targetVideoIndex].endTime === null
            const wasPlayed = box.playlist[targetVideoIndex].startTime !== null && box.playlist[targetVideoIndex].endTime !== null

            if (isPlaying) {
                throw new Error("The video you selected is currently playing.")
            }

            if (wasPlayed && !box.options.loop) {
                throw new Error("The video you selected has already been played.")
            }

            const { syncPacket, feedbackMessage, updatedBox } = await this.transitionToNextVideo(request.boxToken, request.item, areBerriesSpent)

            if (areBerriesSpent) {
                berriesService.decreaseBerryCount({ userToken: request.userToken, boxToken: request.boxToken }, PLAY_NOW_BERRY_COST)

                const playingVideo = updatedBox.playlist.find(video => video._id.toString() === request.item)
                feedbackMessage.context = 'berries'
                feedbackMessage.contents = `${user.name} has spent ${PLAY_NOW_BERRY_COST} berries to play "${playingVideo.video.name}".`
            }

            return {
                syncPacket,
                feedbackMessage,
                updatedBox
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    public async onVideoSkipped(scope: BoxScope) {
        try {
            const user = await User.findById(scope.userToken)

            const box = await BoxSchema.findById(scope.boxToken)

            if (!box.open) {
                throw new Error("The box is closed. The queue cannot be modified.")
            }

            const areBerriesSpent = user._id.toString() !== box.creator.toString()

            if (areBerriesSpent) {
                const subscriber = await Subscriber.findOne({ userToken: scope.userToken, boxToken: scope.boxToken })
                if (subscriber.berries < SKIP_BERRY_COST) {
                    throw new Error(`You do not have enough berries to use this action. You need ${SKIP_BERRY_COST - subscriber.berries} more.`)
                }
            }

            const alreadyPlayingVideoIndex = box.playlist.findIndex(video => video.startTime !== null && video.endTime === null && video.stateForcedWithBerries === true)

            if (alreadyPlayingVideoIndex !== -1) {
                // If the already preselected video was forced with berries, the operation cannot continue
                throw new Error("An user has used berries to play the currently playing video. You cannot skip it.")
            }

            const { syncPacket, updatedBox, feedbackMessage } = await this.transitionToNextVideo(scope.boxToken, null, areBerriesSpent)

            const playingVideo = updatedBox.playlist.find(video => video.startTime !== null && video.endTime === null)

            if (areBerriesSpent) {
                berriesService.decreaseBerryCount({ userToken: scope.userToken, boxToken: scope.boxToken }, SKIP_BERRY_COST)

                feedbackMessage.context = 'berries'
                feedbackMessage.contents = `${user.name} has spent ${SKIP_BERRY_COST} berries to skip the current video. Currently playing: "${playingVideo.video.name}".`
            } else {
                feedbackMessage.contents = `The previous video has been skipped. Currently playing: "${playingVideo.video.name}".`
            }

            return {
                syncPacket,
                updatedBox,
                feedbackMessage
            }
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

        if (!box.open) {
            throw new Error("This box is closed. Submission is disallowed.")
        }

        let updatedBox

        if (box.options.videoMaxDurationLimit !== 0
            && !await aclService.isAuthorized({ userToken, boxToken }, 'bypassVideoDurationLimit')
            && moment.duration(video.duration).asSeconds() > box.options.videoMaxDurationLimit * 60
        ) {
            throw new Error(`This video exceeds the limit of ${box.options.videoMaxDurationLimit} minutes. Please submit a shorter video.`)
        }

        const isVideoAlreadyInQueue = box.playlist.find((queueItem: QueueItem) => queueItem.video.toString() === video._id.toString())
        if (isVideoAlreadyInQueue) {
            updatedBox = await BoxSchema
                .findById(boxToken)
                .populate("creator", "_id name")
                .populate("playlist.video")
                .populate("playlist.submitted_by", "_id name")
        } else {
            const submission: QueueItem = {
                video: video._id,
                startTime: null,
                endTime: null,
                submittedAt: new Date(),
                submitted_by: userToken,
                isPreselected: false,
                stateForcedWithBerries: false
            }

            box.playlist.unshift(submission)

            updatedBox = await BoxSchema
                .findOneAndUpdate(
                    { _id: boxToken },
                    { $set: { playlist: box.playlist } },
                    { new: true }
                )
                .populate("creator", "_id name")
                .populate("playlist.video")
                .populate("playlist.submitted_by", "_id name")
        }

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
    public async getCurrentVideo(boxToken: string): Promise<PlayingItem> {
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

        const currentVideo: PlayingItem = _.find(box.playlist, video => video.startTime !== null && video.endTime === null)
        currentVideo.position = Math.round((Date.now() - Date.parse(currentVideo.startTime.toString())) / 1000)

        return currentVideo ?? null
    }

    /**
     * Gets the next video from the queue to play. Will
     * update the queue of the box, and send JSON containing all the info for subscribers
     * in the box
     *
     * @param {string} boxToken
     * @param {string} [targetVideo] If there's a target video, it will be the one selected (preselection / play now)
     * @param {boolean} [withBerries=false] Indicates if the action is caused by a play now or skip. In that case,
     * the playing video bears the "stateForceWithBerries" flag so that it cannot be skipped itself.
     * @returns {(Promise<{ nextVideo: QueueItem, updatedBox: Box } | null>)}
     * @memberof QueueService
     */
    public async getNextVideo(boxToken: string, targetVideo?: string, withBerries = false): Promise<{ nextVideo: PlayingItem, updatedBox: Box } | null> {
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
            box.playlist[currentVideoIndex].stateForcedWithBerries = false
        }

        // Test if there are some videos remaining
        const remainingVideos = box.playlist.filter(video => video.startTime === null).length

        // Loop Mode if no more videos are upcoming and the loop is active
        if (remainingVideos === 0 && box.options.loop === true) {
            box.playlist = await this.loopPlaylist(box)
        }

        // Search for a new video
        let nextVideoIndex = -1

        let preselectedVideoIndex = -1
        if (targetVideo) {
            preselectedVideoIndex = box.playlist.findIndex(video => video._id.toString() === targetVideo)
        } else {
            preselectedVideoIndex = box.playlist.findIndex(video => video.isPreselected)
        }

        // Look for a preselected video
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
            box.playlist[nextVideoIndex].endTime = null
            box.playlist[nextVideoIndex].isPreselected = false
            // If the state is true (the video was preselected with berries), it stays true
            // If the video was skipped/played now with berries, the 'withBerries' flag will be true
            // Else, it's false
            box.playlist[nextVideoIndex].stateForcedWithBerries = box.playlist[nextVideoIndex].stateForcedWithBerries ? box.playlist[nextVideoIndex].stateForcedWithBerries : withBerries
            response.nextVideo = box.playlist[nextVideoIndex]
            response.nextVideo.position = 0

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
     * If there are no more videos in the upcoming pool, the entire queue is resubmitted in order
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
                submittedAt: item.submittedAt,
                submitted_by: item.submitted_by,
                isPreselected: false,
                stateForcedWithBerries: false
            }

            newBatch.push(submission)
        })

        newBatch = _.uniqBy(newBatch, 'video')

        box.playlist = newBatch

        return box.playlist
    }

    public async transitionToNextVideo(boxToken: string, targetVideo?: string, withBerries = false): Promise<{ syncPacket: SyncPacket, feedbackMessage: SystemMessage, updatedBox: Box }> {
        try {
            // Clean jobs to avoid a "double skip"
            const jobs = await syncQueue.getJobs(['delayed'])

            jobs.map((job: Queue.Job) => {
                if (job.data.boxToken === boxToken) {
                    job.remove()
                }
            })
        } catch (error) {
            console.log('SILENT JOB CLEANUP ERROR')
        }

        const response = await queueService.getNextVideo(boxToken, targetVideo, withBerries)

        const message: SystemMessage = new SystemMessage({
            scope: boxToken,
            contents: 'The queue has no upcoming videos.',
            context: 'info'
        })

        if (response.nextVideo) {
            // Send chat message for subscribers
            message.contents = `Currently playing: "${response.nextVideo.video.name}".`

            // Create a new sync job
            syncQueue.add(
                { boxToken, order: 'next' },
                {
                    priority: 1,
                    delay: moment.duration(response.nextVideo.video.duration).asMilliseconds(),
                    attempts: 5,
                    removeOnComplete: true
                }
            )
        }

        return {
            syncPacket: {
                box: boxToken,
                item: response.nextVideo
            },
            feedbackMessage: message,
            updatedBox: response.updatedBox
        }
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
                const youtubeRequest = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${link}&key=${process.env.YOUTUBE_API_KEY}`)

                const youtubeResponse: YoutubeVideoListResponse = youtubeRequest.data

                if (youtubeResponse.items.length === 0) {
                    throw Error('The link does not match any video.')
                }

                if (!youtubeResponse.items[0].status.embeddable) {
                    throw Error(`This video unfortunately cannot be played outside of YouTube. Please try to find another video not restricted.`)
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
