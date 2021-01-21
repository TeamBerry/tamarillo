const axios = require("axios")
import moment = require("moment")
const dotenv = require("dotenv")
dotenv.config()
import * as Queue from 'bull'
const syncQueue = new Queue("sync")

const BoxSchema = require("./../../models/box.model")
import { QueueItem, QueueItemActionRequest, VideoSubmissionRequest, PlaylistSubmissionRequest, SyncPacket, SystemMessage, BoxScope, PlayingItem, ACLEvaluationResult, FeedbackMessage } from "@teamberry/muscadine"
import { Box } from "../../models/box.model"
import { Video, VideoDocument } from "../../models/video.model"
import { UserPlaylist, UserPlaylistDocument } from '../../models/user-playlist.model'
import { Subscriber } from '../../models/subscriber.model'
import berriesService from './berries.service'
import { User } from '../../models/user.model'
import { YoutubeVideoListResponse } from '../../models/youtube.model'
import aclService from './acl.service'
import { QueueItemDocument, QueueItemModel } from "../../models/queue-item.model"

const PLAY_NEXT_BERRY_COST = 10
const SKIP_BERRY_COST = 20
const PLAY_NOW_BERRY_COST = 30


export class QueueService {
    /**
     * When recieving a video from an user, the service searches for it in the video database
     * and adds the video to the queue of the box.
     *
     * If the video's not found in the database, it is created.
     *
     * Once it's done, it emits a confirmation message to the user.
     *
     * TODO: Fuse with @function addVideoToQueue
     *
     * @param {VideoSubmissionRequest} request The essentials to find the video, the user and the box. The payload is a JSON of this structure:
     * @returns {Promise<{ systemMessage: SystemMessage, feedbackMessage: FeedbackMessage }>} A promise with a feedback message
     * @memberof PlaylistService
     */
    public async onVideoSubmitted(request: VideoSubmissionRequest): Promise<{ systemMessage: SystemMessage, feedbackMessage: FeedbackMessage, addedVideo: QueueItem }> {
        try {
            if (await aclService.isAuthorized({userToken: request.userToken, boxToken: request.boxToken}, 'addVideo') === ACLEvaluationResult.NO) {
                throw new Error("You do not have the authorization to do this.")
            }

            // Obtaining video from database. Creating it if needed
            const video = await this.getVideoDetails(request.link)

            // Finding the user who submitted the video
            const user = await User.findById(request.userToken)

            // Adding it to the queue of the box
            const addedVideo = await this.addVideoToQueue(video, request.boxToken, request.userToken)

            const systemMessage = new SystemMessage({
                contents: `${user.name} has added the video "${video.name}" to the queue.`,
                scope: request.boxToken,
                context: 'info'
            })

            const feedbackMessage = new FeedbackMessage({
                contents: `Your video "${video.name}" has been added to the queue.`,
                scope: request.boxToken,
                context: 'success'
            })

            return { systemMessage, feedbackMessage, addedVideo }
        } catch (error) {
            // If the box is closed, the error is sent back to the socket method.
            throw new Error(error.message)
        }
    }

    /**
     * TODO: Fuse with @function addPlaylistToQueue
     */
    public async onPlaylistSubmitted(request: PlaylistSubmissionRequest): Promise<{ systemMessage: SystemMessage, feedbackMessage: FeedbackMessage }> {
        try {
            if (await aclService.isAuthorized({userToken: request.userToken, boxToken: request.boxToken}, 'addVideo') === ACLEvaluationResult.NO) {
                throw new Error("You do not have the authorization to do this.")
            }

            // Get the playlist
            const playlist = await UserPlaylist.findById(request.playlistId)

            if (!playlist) {
                throw new Error('The playlist could not be found. The submission has been rejected.')
            }

            // Finding the user who submitted the video
            const user = await User.findById(request.userToken)

            await this.addPlaylistToQueue(playlist, request.boxToken, request.userToken)

            const systemMessage = new SystemMessage({
                contents: `${user.name} has added his playlist "${playlist.name}" (${playlist.videos.length} videos) to the queue.`,
                scope: request.boxToken,
                context: 'info'
            })

            const feedbackMessage = new FeedbackMessage({
                contents: `Your playlist "${playlist.name}" has been added to the queue.`,
                scope: request.boxToken,
                context: 'success'
            })

            return { systemMessage, feedbackMessage }
        } catch (error) {
            throw Error(error.message)
        }
    }

    /**
     * Removing a video from the queue of a box.
     *
     * @param {QueueItemActionRequest} request
     * @returns {Promise<{ feedbackMessage: SystemMessage }>}
     * @memberof PlaylistService
     */
    public async onVideoCancelled(request: QueueItemActionRequest): Promise<{ systemMessage: SystemMessage, feedbackMessage: FeedbackMessage }> {
        try {
            const user = await User.findById(request.userToken)

            if (await aclService.isAuthorized({userToken: request.userToken, boxToken: request.boxToken}, 'removeVideo') === ACLEvaluationResult.NO) {
                throw new Error("You do not have the authorization to do this.")
            }

            const targetVideo = await QueueItemModel
                .findOneAndDelete({ box: request.boxToken, _id: request.item })
                .populate('video', 'name')

            const message = `${user.name} has removed the video "${targetVideo.video.name}" from the queue.`

            const systemMessage = new SystemMessage({
                contents: message,
                scope: request.boxToken,
                context: 'info'
            })

            const feedbackMessage = new FeedbackMessage({
                contents: `You have removed the video "${targetVideo.video.name}" from the queue.`,
                scope: request.boxToken,
                context: 'success'
            })

            return { systemMessage, feedbackMessage }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    /**
     * Preselects a video in the queue. The preselected video will be the next one to be played regardless of
     * all the other parameters of the box
     *
     * @param {QueueItemActionRequest} request
     * @returns {Promise<{ feedbackMessage: SystemMessage }>}
     * @memberof QueueService
     */
    public async onVideoPreselected(request: QueueItemActionRequest): Promise<{ systemMessage: SystemMessage, feedbackMessage: FeedbackMessage }> {
        try {
            const user = await User.findById(request.userToken)

            const box = await BoxSchema.findById(request.boxToken)

            let areBerriesSpent = false

            const ACLEvaluation = await aclService.isAuthorized({ userToken: request.userToken, boxToken: request.boxToken }, 'forceNext')
            if (ACLEvaluation === ACLEvaluationResult.NO) {
                throw new Error("You do not have the authorization to do this.")
            } else if (ACLEvaluation === ACLEvaluationResult.BERRIES) {
                const subscriber = await Subscriber.findOne({ userToken: request.userToken, boxToken: request.boxToken })
                if (subscriber.berries < PLAY_NEXT_BERRY_COST) {
                    throw new Error(`You do not have enough berries to use this action. You need ${PLAY_NEXT_BERRY_COST - subscriber.berries} more.`)
                }
                areBerriesSpent = true
            }

            const nextVideos: Array<string> = (await QueueItemModel
                .find({ box: request.boxToken, setToNext: { $ne: null } })
                .populate('video', 'name')
            ).map(queueItem => queueItem._id.toString())

            const targetVideo = await QueueItemModel
                .findOne({ box: request.boxToken, _id: request.item })
                .populate('video', 'name')

            // Before we do anything, securities:
            // - The target video has to exist
            // - The target video has to not be either playing or passed
            if (!targetVideo) {
                throw new Error("The video you selected could not be found.")
            }

            if (targetVideo.startTime !== null && targetVideo.endTime === null) {
                throw new Error("The video you selected is currently playing.")
            }

            if (targetVideo.startTime !== null && targetVideo.endTime !== null && !box.options.loop) {
                throw new Error("The video you selected has already been played.")
            }

            const systemMessage = new SystemMessage({
                contents: '',
                scope: request.boxToken,
                context: 'info'
            })

            const feedbackMessage = new FeedbackMessage({
                contents: '',
                scope: request.boxToken,
                context: 'success'
            })

            // Unselect the video if it was already set to next
            if (nextVideos && nextVideos.includes(targetVideo._id.toString())) {
                // But not if it has been done with berries
                if (targetVideo.stateForcedWithBerries && await aclService.isAuthorized({ userToken: request.userToken, boxToken: request.boxToken }, 'bypassBerries') === ACLEvaluationResult.NO) {
                    throw new Error("This video has been prioritised with the use of berries. You cannot remove it.")
                }

                targetVideo.setToNext = null

                if (areBerriesSpent) {
                    systemMessage.contents = `${user.name} has spent ${PLAY_NEXT_BERRY_COST} berries to remove the priority on "${targetVideo.video.name}".`
                    feedbackMessage.contents = `You spent ${PLAY_NEXT_BERRY_COST} berries to remove the priority on "${targetVideo.video.name}".`
                    systemMessage.context = 'berries'
                } else {
                    systemMessage.contents = `${user.name} has removed the priority on "${targetVideo.video.name}".`
                    feedbackMessage.contents = `You removed the priority on "${targetVideo.video.name}".`
                }
            } else {
                targetVideo.setToNext = new Date()

                if (areBerriesSpent) {
                    targetVideo.stateForcedWithBerries = true
                    systemMessage.contents = `${user.name} has spent ${PLAY_NEXT_BERRY_COST} berries to select the video "${targetVideo.video.name}" to play in priority.`
                    feedbackMessage.contents = `You spent ${PLAY_NEXT_BERRY_COST} berries to play "${targetVideo.video.name}" in priority.`
                    systemMessage.context = 'berries'
                } else {
                    systemMessage.contents = `${user.name} has selected the video "${targetVideo.video.name}" to play in priority.`
                    feedbackMessage.contents = `You selected "${targetVideo.video.name}" to play in priority.`
                }
            }

            await targetVideo.save()

            if (areBerriesSpent) {
                await berriesService.decreaseBerryCount({ userToken: request.userToken, boxToken: request.boxToken }, PLAY_NEXT_BERRY_COST)
            }

            return { systemMessage, feedbackMessage }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    public async onVideoForcePlayed(request: QueueItemActionRequest): Promise<{ systemMessage: SystemMessage, feedbackMessage: FeedbackMessage, syncPacket: SyncPacket }> {
        try {
            const user = await User.findById(request.userToken)

            const box = await BoxSchema.findById(request.boxToken)

            let areBerriesSpent = false

            const ACLEvaluation = await aclService.isAuthorized({ userToken: request.userToken, boxToken: request.boxToken }, 'forcePlay')
            if (ACLEvaluation === ACLEvaluationResult.NO) {
                throw new Error("You do not have the authorization to do this.")
            } else if (ACLEvaluation === ACLEvaluationResult.BERRIES) {
                const subscriber = await Subscriber.findOne({ userToken: request.userToken, boxToken: request.boxToken })
                if (subscriber.berries < PLAY_NOW_BERRY_COST) {
                    throw new Error(`You do not have enough berries to use this action. You need ${PLAY_NOW_BERRY_COST - subscriber.berries} more.`)
                }
                areBerriesSpent = true
            }

            // If the already preselected video was forced with berries and the user cannot bypass it, the operation cannot continue
            if (
                await QueueItemModel.exists({ box: request.boxToken, startTime: { $ne: null }, endTime: null, stateForcedWithBerries: true })
                && await aclService.isAuthorized({ userToken: request.userToken, boxToken: request.boxToken }, 'bypassBerries') === ACLEvaluationResult.NO
            ) {
                throw new Error("An user has used berries to play the currently playing video. You cannot overwrite it.")
            }

            const targetVideo = await QueueItemModel.findOne({ box: request.boxToken, _id: request.item }).lean()

            if (!targetVideo) {
                throw new Error('The video you selected could not be found.')
            }

            const isPlaying = targetVideo.startTime !== null && targetVideo.endTime === null
            const wasPlayed = targetVideo.startTime !== null && targetVideo.endTime !== null

            if (isPlaying) {
                throw new Error("The video you selected is currently playing.")
            }

            if (wasPlayed && !box.options.loop) {
                throw new Error("The video you selected has already been played.")
            }

            const { syncPacket, systemMessage } = await this.transitionToNextVideo(request.boxToken, request.item, areBerriesSpent)

            const playingVideo = syncPacket.item

            if (areBerriesSpent) {
                await berriesService.decreaseBerryCount({ userToken: request.userToken, boxToken: request.boxToken }, PLAY_NOW_BERRY_COST)

                systemMessage.context = 'berries'
                systemMessage.contents = `${user.name} has spent ${PLAY_NOW_BERRY_COST} berries to play "${playingVideo.video.name}" now.`
            }

            const feedbackMessage = new FeedbackMessage({
                contents: areBerriesSpent
                    ? `You spent ${PLAY_NOW_BERRY_COST} berries to play "${playingVideo.video.name}" now.`
                    : `You force played "${playingVideo.video.name}".`,
                scope: request.boxToken,
                context: 'success'
            })

            return {
                syncPacket,
                systemMessage,
                feedbackMessage
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    public async onVideoSkipped(scope: BoxScope): Promise<{ syncPacket: SyncPacket, systemMessage: SystemMessage, feedbackMessage: FeedbackMessage}> {
        try {
            const user = await User.findById(scope.userToken)

            let areBerriesSpent = false

            const ACLEvaluation = await aclService.isAuthorized(scope, 'skipVideo')
            if (ACLEvaluation === ACLEvaluationResult.NO) {
                throw new Error("You do not have the authorization to do this.")
            } else if (ACLEvaluation === ACLEvaluationResult.BERRIES) {
                const subscriber = await Subscriber.findOne(scope)
                if (subscriber.berries < PLAY_NOW_BERRY_COST) {
                    throw new Error(`You do not have enough berries to use this action. You need ${SKIP_BERRY_COST - subscriber.berries} more.`)
                }
                areBerriesSpent = true
            }

            if (
                await QueueItemModel.exists({ box: scope.boxToken, startTime: { $ne: null }, endTime: null, stateForcedWithBerries: true })
                && await aclService.isAuthorized(scope, 'bypassBerries') === ACLEvaluationResult.NO
            ) {
                // If the already preselected video was forced with berries, the operation cannot continue
                throw new Error("An user has used berries to play the currently playing video. You cannot skip it.")
            }

            const { syncPacket, systemMessage } = await this.transitionToNextVideo(scope.boxToken, null, areBerriesSpent)

            const playingVideo = syncPacket.item

            const feedbackMessage = new FeedbackMessage({
                contents: areBerriesSpent ? `You spent ${SKIP_BERRY_COST} berries to skip the previous video.`: `You skipped the previous video.`,
                scope: scope.boxToken,
                context: "success"
            })

            if (areBerriesSpent) {
                await berriesService.decreaseBerryCount(scope, SKIP_BERRY_COST)

                systemMessage.context = 'berries'
                systemMessage.contents = `${user.name} has spent ${SKIP_BERRY_COST} berries to skip the previous video. Currently playing: "${playingVideo.video.name}".`
            } else {
                systemMessage.contents = `${user.name} has skipped the previous video. Currently playing: "${playingVideo.video.name}".`
            }

            return {
                syncPacket,
                systemMessage,
                feedbackMessage
            }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    public async onVideoReplayed(request: QueueItemActionRequest): Promise<{ systemMessage: SystemMessage, feedbackMessage: FeedbackMessage }> {
        try {
            if (await aclService.isAuthorized({userToken: request.userToken, boxToken: request.boxToken}, 'addVideo') === ACLEvaluationResult.NO) {
                throw new Error("You do not have the authorization to do this.")
            }

            const user = await User.findById(request.userToken)

            const replayedVideo = await QueueItemModel
                .findOneAndUpdate(
                    { box: request.boxToken, _id: request.item },
                    {
                        $set: {
                            startTime: null,
                            endTime: null,
                            submittedAt: new Date()
                        }
                    },
                    {
                        new: true
                    }
                )
                .populate('video', 'name')
                .lean()

            const systemMessage = new SystemMessage({
                contents: `${user.name} has re-added the video "${replayedVideo.video.name}" to the queue.`,
                scope: request.boxToken,
                context: 'info'
            })

            const feedbackMessage = new FeedbackMessage({
                contents: `The video "${replayedVideo.video.name}" has been re-added to the queue.`,
                scope: request.boxToken,
                context: 'success'
            })

            return { systemMessage, feedbackMessage }
        } catch (error) {
            throw new Error(error.message)
        }
    }

    /**
     * Adds the obtained video to the queue of the box
     *
     * @param {VideoDocument} video The video to add to the queue
     * @param {string} boxToken The doucment ID of the box
     * @param {string} userToken The document ID of the user who submitted the video
     * @returns {Promise<boolean>} A true if everything went well
     * @memberof PlaylistService
     */
    public async addVideoToQueue(video: Partial<VideoDocument>, boxToken: string, userToken: string): Promise<QueueItemDocument> {
        const box = await BoxSchema.findById(boxToken)

        if (box.options.videoMaxDurationLimit !== 0
            && await aclService.isAuthorized({ userToken, boxToken }, 'bypassVideoDurationLimit') === ACLEvaluationResult.NO
            && moment.duration(video.duration).asSeconds() > box.options.videoMaxDurationLimit * 60
        ) {
            throw new Error(`This video exceeds the limit of ${box.options.videoMaxDurationLimit} minutes. Please submit a shorter video.`)
        }

        if (!await QueueItemModel.exists({ box: boxToken, video: video._id })) {
            const addedVideo = await QueueItemModel.create({
                box: boxToken,
                video: video._id,
                startTime: null,
                endTime: null,
                submittedAt: new Date(),
                submitted_by: userToken,
                isPreselected: false,
                setToNext: null,
                stateForcedWithBerries: false
            })

            // Increase berry count
            await berriesService.increaseBerryCount({ userToken, boxToken })

            return addedVideo
        }

        return null
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
    public async addPlaylistToQueue(playlist: UserPlaylistDocument, boxToken: string, userToken: string): Promise<boolean> {

        const box = await BoxSchema.findById(boxToken)

        const playlistVideos = playlist.videos as unknown as Array<string>

        const videos = await Video.find({ _id: { $in: playlistVideos } }).lean()

        let addableVideos: Array<string> = playlistVideos

        // If there's a max duration limit to enforce and the user cannot bypass it
        if (box.options.videoMaxDurationLimit !== 0 && !await aclService.isAuthorized({ boxToken, userToken }, 'bypassVideoDurationLimit')) {
            addableVideos = videos
                .filter(video => moment.duration(video.duration).asSeconds() < box.options.videoMaxDurationLimit * 60)
                .map(v => v._id)
        }

        const queueItems = []
        addableVideos.forEach(video => queueItems.push({
            box: boxToken,
            video,
            startTime: null,
            endTime: null,
            submittedAt: new Date(),
            submitted_by: userToken,
            isPreselected: false,
            setToNext: null,
            stateForcedWithBerries: false
        } as QueueItem))

        await QueueItemModel.create(queueItems)

        return true
    }

    /**
     * Gets the currently playing video of the box and returns it
     *
     * @param {string} boxToken The document id of the box
     * @returns the video. The structure is the same as a playlist entry
     * @memberof PlaylistService
     */
    public async getCurrentVideo(boxToken: string): Promise<PlayingItem> {
        const box = await BoxSchema.findById(boxToken).lean()

        if (!box.open) {
            throw new Error("This box is closed. Video play is disabled.")
        }

        const currentVideo: QueueItem = await QueueItemModel
            .findOne({ box: boxToken, startTime: { $ne: null }, endTime: null })
            .populate('video', '_id link name duration')
            .populate('submitted_by', '_id name settings.picture')
            .lean()

        if (!currentVideo) {
            return null
        }

        (currentVideo as PlayingItem).position = Math.round((Date.now() - Date.parse(currentVideo.startTime.toString())) / 1000)

        return currentVideo as PlayingItem
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
     * @returns {(Promise<PlayingItem | null>)}
     * @memberof QueueService
     */
    public async getNextVideo(boxToken: string, targetVideo?: string, withBerries = false): Promise<PlayingItem | null> {
        const transitionTime = new Date()

        const box: Box = await BoxSchema.findById(boxToken).lean()

        if (!box) {
            return null
        }

        let updateQuery = {}

        // If the box is looping, the video is put back in queue with submittedAt to now, so it's the last one that will play
        if (box.options.loop) {
            updateQuery = {
                startTime: null,
                endTime: null,
                stateForcedWithBerries: false,
                isPreselected: false,
                setToNext: null,
                submittedAt: transitionTime
            }
        } else {
            updateQuery = {
                endTime: transitionTime,
                stateForcedWithBerries: false,
                isPreselected: false,
                setToNext: null
            }
        }

        const previousVideo = await QueueItemModel.findOneAndUpdate(
            { box: boxToken, startTime: { $ne: null }, endTime: null },
            { $set: updateQuery },
            { new: true }
        )

        const availableVideos = await QueueItemModel
            .find({ box: boxToken, startTime: null, _id: { $ne: previousVideo?._id } })
            .sort({ submittedAt: 1 })
            .lean()

        // Test if there are some videos remaining
        if (availableVideos.length === 0) {
            return null
        }

        let nextVideoToPlay: QueueItem = null

        // Look for a target video if it's specified
        if (targetVideo) {
            nextVideoToPlay = await QueueItemModel.findOne({ box: boxToken, _id: targetVideo }).lean()
        }

        // Look for a preselected video if it exists
        if (!nextVideoToPlay) {
            nextVideoToPlay = await QueueItemModel
                .findOne({ box: boxToken, setToNext: { $ne: null } })
                .sort({ setToNext: 1 })
                .lean()
        }

        // Get a video the normal way
        if (!nextVideoToPlay) {
            if (box.options.random) {
                nextVideoToPlay = availableVideos[Math.floor(Math.random() * availableVideos.length)]
            } else {
                // Get the next video in line
                nextVideoToPlay = availableVideos[0]
            }
        }

        // If we finally get something
        if (nextVideoToPlay) {
            const readiedVideoToPlay = await QueueItemModel.findByIdAndUpdate(
                nextVideoToPlay._id,
                {
                    $set: {
                        startTime: transitionTime,
                        endTime: null,
                        isPreselected: false,
                        setToNext: null,
                        stateForcedWithBerries: nextVideoToPlay.stateForcedWithBerries ? nextVideoToPlay.stateForcedWithBerries : withBerries
                    }
                },
                {
                    new: true
                }
            )
                .populate('video', '_id link name duration')
                .lean()

            const nextVideo: PlayingItem = {
                ...readiedVideoToPlay,
                position: 0
            }

            return nextVideo
        }

        return null
    }

    public async transitionToNextVideo(boxToken: string, targetVideo?: string, withBerries = false): Promise<{ syncPacket: SyncPacket, systemMessage: SystemMessage }> {
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

        const nextVideo = await this.getNextVideo(boxToken, targetVideo, withBerries)

        const systemMessage: SystemMessage = new SystemMessage({
            scope: boxToken,
            contents: 'The queue has no upcoming videos.',
            context: 'info'
        })

        if (nextVideo) {
            // Send chat message for subscribers
            systemMessage.contents = `Currently playing: "${nextVideo.video.name}".`

            // Create a new sync job
            syncQueue.add(
                { boxToken, order: 'next' },
                {
                    priority: 1,
                    delay: moment.duration(nextVideo.video.duration).asMilliseconds(),
                    attempts: 5,
                    removeOnComplete: true
                }
            )
        }

        return {
            syncPacket: {
                box: boxToken,
                item: nextVideo
            },
            systemMessage
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
