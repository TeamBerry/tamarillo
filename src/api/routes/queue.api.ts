import { NextFunction, Request, Response, Router } from "express"
const axios = require("axios")
import moment = require("moment")

import { QueueItem, BoxScope } from "@teamberry/muscadine"
import aclService, { ACLResult } from "../services/acl.service"
import { Video, VideoDocument } from "../../models/video.model"
import { YoutubeVideoListResponse } from "../../models/youtube.model"
import { Subscriber } from "../../models/subscriber.model"
import berriesService from "../services/berries.service"
const auth = require("./../middlewares/auth.middleware")
const boxMiddleware = require("./../middlewares/box.middleware")
const BoxSchema = require("./../../models/box.model")

const PLAY_NEXT_BERRY_COST = 10
const SKIP_BERRY_COST = 30
const PLAY_NOW_BERRY_COST = 50

export class QueueApi {
    public router: Router

    constructor() {
        this.router = Router({ mergeParams: true })
        this.init()
    }

    public init(): void {
        this.router.get("/", [auth.canBeAuthorized, boxMiddleware.boxPrivacy], this.getQueue)

        // All subsequent routes require authentication
        this.router.use([auth.isAuthorized, boxMiddleware.boxPrivacy, boxMiddleware.boxMustBeOpen])
        this.router.post("/", this.addVideo.bind(this))
        this.router.put("/:video/next", this.playNext)
        this.router.put("/:video/now", this.playNow)
        this.router.put("/:video/skip", this.skipVideo)
        this.router.delete("/:video", this.removeVideo)

        this.router.param("video", async (request: Request, response: Response, next: NextFunction) => {
            const box = response.locals.box

            const targetVideoIndex: number = box.playlist.findIndex(
                (queueItem: QueueItem) => queueItem._id.toString() === request.params.video.toString()
            )

            if (targetVideoIndex === -1) {
                return response.status(404).send('VIDEO_NOT_FOUND')
            }

            next()
        })
    }

    public async getQueue(request: Request, response: Response): Promise<Response> {
        return response.status(200).send(response.locals.box.playlist)
    }

    public async addVideo(request: Request, response: Response): Promise<Response> {
        const box = response.locals.box
        const decodedToken = response.locals.auth
        const requestScope: BoxScope = { boxToken: request.params.box, userToken: decodedToken.user }

        const { link }: { link: string } = request.body ?? null

        if (!link) {
            return response.status(412).send('MISSING_PARAMETERS')
        }

        if (await aclService.isAuthorized(requestScope, 'addVideo') === ACLResult.NO) {
            return response.status(403).send()
        }

        try {
            let updatedBox
            const video = await this.getVideoDetails(link)

            if (box.options.videoMaxDurationLimit !== 0
                && await aclService.isAuthorized(requestScope, 'bypassVideoDurationLimit') === ACLResult.NO
                && moment.duration(video.duration).asSeconds() > box.options.videoMaxDurationLimit * 60
            ) {
                return response.status(403).send('DURATION_EXCEEDED')
            }

            const isVideoAlreadyInQueue = box.playlist.find((queueItem: QueueItem) => queueItem.video._id.toString() === video._id.toString())
            if (isVideoAlreadyInQueue) {
                updatedBox = await BoxSchema
                    .findById(request.params.box)
                    .populate("creator", "_id name")
                    .populate("playlist.video")
                    .populate("playlist.submitted_by", "_id name")
            } else {
                const submission: QueueItem = {
                    video: video._id,
                    startTime: null,
                    endTime: null,
                    submittedAt: new Date(),
                    submitted_by: decodedToken.user,
                    isPreselected: false,
                    stateForcedWithBerries: false
                }

                box.playlist.unshift(submission)

                // Increase berry count
                await berriesService.increaseBerryCount(requestScope)

                updatedBox = await BoxSchema
                    .findOneAndUpdate(
                        { _id: request.params.box },
                        { $set: { playlist: box.playlist } },
                        { new: true }
                    )
                    .populate("creator", "_id name")
                    .populate("playlist.video")
                    .populate("playlist.submitted_by", "_id name")
            }

            return response.status(200).send(updatedBox)
        } catch (error) {
            switch (error.message) {
                case 'VIDEO_NOT_FOUND':
                    return response.status(404).send(error.message)

                case 'EMBED_NOT_ALLOWED':
                    return response.status(403).send(error.message)

                default:
                    return response.status(500).send()
            }
        }
    }

    public async playNext(request: Request, response: Response): Promise<Response> {
        const box = response.locals.box
        const decodedToken = response.locals.auth
        const requestScope: BoxScope = { boxToken: request.params.box, userToken: decodedToken.user }

        try {
            let areBerriesSpent = false

            const ACLEvaluation = await aclService.isAuthorized(requestScope, 'forceNext')
            if (ACLEvaluation === ACLResult.NO) {
                return response.status(403)
            } else if (ACLEvaluation === ACLResult.BERRIES) {
                const subscriber = await Subscriber.findOne(requestScope)
                if (subscriber.berries < PLAY_NEXT_BERRY_COST) {
                    return response.status(403).send('BERRIES_INSUFFICIENT')
                }
                areBerriesSpent = true
            }

            const alreadySelectedVideoIndex: number = box.playlist.findIndex((queueItem: QueueItem) => queueItem.isPreselected)
            const targetVideoIndex: number = box.playlist.findIndex(
                (queueItem: QueueItem) => queueItem._id.toString() === request.params.video.toString()
            )

            // Before we do anything, securities:
            // - The target video has to not be either playing or passed

            const isPlaying = box.playlist[targetVideoIndex].startTime !== null && box.playlist[targetVideoIndex].endTime === null
            const wasPlayed = box.playlist[targetVideoIndex].startTime !== null && box.playlist[targetVideoIndex].endTime !== null

            if (isPlaying) {
                return response.status(409).send('VIDEO_ALREADY_PLAYING')
            }

            if (wasPlayed && !box.options.loop) {
                return response.status(409).send('VIDEO_ALREADY_PLAYED')
            }

            // Unselect already selected video if it exists
            if (alreadySelectedVideoIndex !== -1) {
            // If the already preselected video was forced with berries, the operation cannot continue
                if (box.playlist[alreadySelectedVideoIndex].stateForcedWithBerries === true) {
                    return response.status(403).send('ANOTHER_TRACK_PRESELECTED')
                }

                box.playlist[alreadySelectedVideoIndex].isPreselected = false
            }

            // Preselect new video if it's not the same as the one that just got deselected
            if (alreadySelectedVideoIndex !== targetVideoIndex) {
                box.playlist[targetVideoIndex].isPreselected = true
                if (areBerriesSpent) {
                    box.playlist[targetVideoIndex].stateForcedWithBerries = true
                }
            }

            await BoxSchema
                .findByIdAndUpdate(
                    requestScope.boxToken,
                    { $set: { playlist: box.playlist } },
                    { new: true }
                )
                .populate("creator", "_id name")
                .populate("playlist.video")
                .populate("playlist.submitted_by", "_id name")

            if (areBerriesSpent) {
                await berriesService.decreaseBerryCount(requestScope, PLAY_NEXT_BERRY_COST)
            }

            return response.status(200).send()
        } catch (error) {
            console.log(error)
            return response.status(500).send(error.message)
        }
    }

    public async playNow(request: Request, response: Response): Promise<Response> {
        return response.status(503).send('UNDER_CONSTRUCTION')
    }

    public async skipVideo(request: Request, response: Response): Promise<Response> {
        return response.status(503).send('UNDER_CONSTRUCTION')
    }

    public async removeVideo(request: Request, response: Response): Promise<Response> {
        return response.status(503).send('UNDER_CONSTRUCTION')
    }

    /**
     * Gets the video from the database. If it doesn't exist, it will create the new video and send it back.
     *
     * @param {string} link the unique YouTube ID of the video
     * @returns {any} The video
     * @memberof PlaylistService
     */
    public async getVideoDetails(link: string): Promise<VideoDocument> {
        let video = await Video.findOne({ link })

        try {
            if (!video) {
                const youtubeRequest = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${link}&key=${process.env.YOUTUBE_API_KEY}`)

                const youtubeResponse: YoutubeVideoListResponse = youtubeRequest.data

                if (youtubeResponse.items.length === 0) {
                    throw Error('VIDEO_NOT_FOUND')
                }

                if (!youtubeResponse.items[0].status.embeddable) {
                    throw Error(`EMBED_NOT_ALLOWED`)
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

const queueApi = new QueueApi()
export default queueApi.router
