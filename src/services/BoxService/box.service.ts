// Utils imports
import * as _ from "lodash"

// MongoDB & Sockets
const express = require("express")()
const http = require("http").Server(express)
const io = require("socket.io")(http)
io.set("transports", ["websocket"])
import * as Queue from 'bull'
const syncQueue = new Queue("sync")
const boxQueue = new Queue("box")
const berriesQueue = new Queue("berries")
const queueActionsQueue = new Queue("actions-queue")

// Models
import { Subscriber, ConnectionRequest, BerryCount, PopulatedSubscriberDocument, Connection } from "../../models/subscriber.model"
import { Message, FeedbackMessage, QueueItemActionRequest, VideoSubmissionRequest, PlaylistSubmissionRequest, SyncPacket, BoxScope, SystemMessage, QueueItem } from "@teamberry/muscadine"

// Import services that need to be managed
import chatService from "./chat.service"
import queueService from "./queue.service"
import { BoxJob } from "../../models/box.job"
import berriesService from "./berries.service"
import { RoleChangeRequest } from "../../models/role-change.model"
import aclService from "./acl.service"
const BoxSchema = require("./../../models/box.model")

const PLAY_NEXT_BERRY_COST = 10
const SKIP_BERRY_COST = 20
const PLAY_NOW_BERRY_COST = 30

/**
 * Manager service. The role of this is to manage the other services, like chat and playlist, to ensure
 * communication is possible between them. It will create mainly start them, and send data from one to the other
 */
class BoxService {
    public init() {
        console.log("Box service initialisation...")

        // Start listening on port 8008.
        http.listen(8008, async () => {
            // Empty all connexions
            await Subscriber.update({}, { $set: { connexions: [] } }, { multi: true })
        })

        io.on("connection", socket => {
            /**
             * When an user joins the box, they will have to auth themselves.
             */
            socket.on("auth", async authRequest => {
                const connexionRequest: ConnectionRequest = {
                    origin: authRequest.origin,
                    boxToken: authRequest.boxToken,
                    userToken: authRequest.userToken,
                    socket: socket.id
                }

                // Connection check. If the user is not valid, he's refused
                if (!connexionRequest.boxToken) {
                    const message = {
                        status: "ERROR_NO_TOKEN",
                        message: "No token has been given to the socket. Access has been denied.",
                        scope: connexionRequest.boxToken
                    }
                    socket.emit("denied", message)
                } else {
                    // Cleaning collection to avoid duplicates (safe guard)
                    let userSubscription = await Subscriber.findOne(
                        { boxToken: connexionRequest.boxToken, userToken: connexionRequest.userToken }
                    )

                    const box = await BoxSchema.findById(authRequest.boxToken)

                    if (!box) {
                        const boxErrorMessage: FeedbackMessage = new FeedbackMessage({
                            context: 'error',
                            contents: 'The box you are trying to join does not exist. Please check your access link or URL.',
                            scope: connexionRequest.boxToken
                        })
                        socket.emit("denied", boxErrorMessage)
                    }


                    if (!userSubscription) {
                        userSubscription = await Subscriber.create({
                            boxToken: connexionRequest.boxToken,
                            userToken: connexionRequest.userToken,
                            connexions: [
                                {
                                    origin: connexionRequest.origin,
                                    socket: connexionRequest.socket
                                }
                            ],
                            berries: 0,
                            role: (box.creator.toString() === authRequest.userToken || connexionRequest.userToken === process.env.ADMIN_TOKEN) ? 'admin' : 'simple'
                        })
                    } else {
                        userSubscription = await Subscriber.findByIdAndUpdate(
                            userSubscription._id,
                            {
                                $push: { connexions: { origin: connexionRequest.origin, socket: connexionRequest.socket } }
                            }
                        )
                    }

                    const message: FeedbackMessage = new FeedbackMessage({
                        contents: "You are now connected to the box! Click the ? icon in the menu for help on how to submit videos.",
                        source: "feedback",
                        scope: connexionRequest.boxToken,
                        context: 'success'
                    })

                    // Join Box room
                    socket.join(connexionRequest.boxToken)

                    // Emit permissions for the simple role.
                    socket.emit('permissions', userSubscription.role === 'admin' ?
                        ['addVideo', 'removeVideo', 'forceNext', 'forcePlay', 'skipVideo', 'editBox', 'promoteVIP', 'demoteVIP', 'bypassVideoDurationLimit', 'inviteUser']
                        : box.acl[userSubscription.role])

                    // Emit confirmation message
                    socket.emit("confirm", message)

                    if (connexionRequest.origin === 'Cranberry') {
                        // Emit Youtube Key for mobile
                        socket.emit('bootstrap', {
                            boxKey: process.env.CRANBERRY_KEY
                        })
                    }

                    // Berries
                    const berryCount: BerryCount = {
                        userToken: userSubscription.userToken,
                        boxToken: userSubscription.boxToken,
                        berries: userSubscription.berries
                    }

                    socket.emit('berries', berryCount)

                    berriesService.startNaturalIncrease({ userToken: userSubscription.userToken, boxToken: userSubscription.boxToken })
                }
            })

            /**
             * After the client auth themselves, they need to be caught up with the others in the box. It means they will ask for the
             * current video playing and must have an answer.
             *
             * This has to only send the link and its timestamp. If non-sockets want to know what's playing in a box, they'll listen to
             * a webhook. This is only for in-box requests.
             *
             * @param {BoxScope} request
             */
            socket.on("start", async (startSyncRequest: BoxScope) => {
                const message = new FeedbackMessage({
                    context: 'info',
                    scope: startSyncRequest.boxToken
                })

                try {
                    const response = await this.onUserJoined(startSyncRequest.boxToken)

                    if (response.item !== null) {
                        message.contents = `Currently playing: ${response.item.video.name}`

                        // Emit the response back to the client
                        socket.emit("sync", response)
                    } else {
                        message.contents = "No video is currently playing in the box."
                        message.context = 'warning'
                    }

                    socket.emit("chat", message)
                } catch (error) {
                    // Emit the box closed message to the recipient
                    message.contents = "This box is closed. Video play is disabled."
                    message.context = 'warning'
                    socket.emit("chat", message)
                }
            })

            /**
             * The user left the box
             */
            socket.on("disconnect", async () => {
                try {
                    const targetSubscriber = await Subscriber.findOneAndUpdate(
                        { 'connexions.socket': socket.id },
                        { $pull: { connexions: { socket: socket.id } } }
                    )
                    void berriesService.stopNaturalIncrease({ userToken: targetSubscriber.userToken, boxToken: targetSubscriber.boxToken })
                } catch (error) {
                    // Graceful catch (silent)
                }
            })

            /**
             * Every in-box communication regarding video sync between clients will go through this event.
             */
            socket.on("sync", async (syncCommand: { boxToken: string, userToken: string, order: string }) => {
                if (syncCommand.order === 'next') {
                    void this.onVideoSkipRequest({boxToken: syncCommand.boxToken, userToken: syncCommand.userToken})
                }
            })

            // Handling chat messages
            socket.on("chat", async (message: Message) => {
                if (await chatService.isMessageValid(message)) {
                    // We get the author of the message
                    const author: PopulatedSubscriberDocument = await Subscriber
                        .findOne({ userToken: message.author._id, boxToken: message.scope })
                        .populate('userToken', 'name settings', 'User')
                        .lean()

                    if (!author) {
                        const errorMessage = new FeedbackMessage({
                            contents: "An error occurred, your message could not be sent.",
                            scope: message.scope,
                            context: 'error'
                        })

                        socket.emit("chat", errorMessage)
                    } else {
                        const dispatchedMessage: Message = new Message({
                            author: {
                                _id: author.userToken._id,
                                name: author.userToken.name,
                                color: author.userToken.settings.color,
                                role: author.role
                            },
                            contents: message.contents,
                            source: message.source,
                            scope: message.scope
                        })

                        // To all of them, we send the message
                        io.in(message.scope).emit("chat", dispatchedMessage)
                    }
                } else {
                    const response = new FeedbackMessage({
                        contents: "Your message has been rejected by the server",
                        scope: message.scope,
                        context: 'error'
                    })

                    socket.emit("chat", response)
                }
            })

            socket.on("roleChange", async (roleChangeRequest: RoleChangeRequest) => {
                console.log('ROLE CHANGE REQUEST RECEIVED: ', roleChangeRequest)
                try {
                    const [feedbackForSource, feedbackForTarget] = await aclService.onRoleChangeRequested(roleChangeRequest)

                    // Send feedback to source
                    socket.emit("chat", feedbackForSource)

                    // Send feedback to target
                    const targetSubscriber = await Subscriber.findOne({ userToken: roleChangeRequest.scope.userToken, boxToken: roleChangeRequest.scope.boxToken })
                    const boxACL = await BoxSchema.findById(roleChangeRequest.scope.boxToken).select('acl')
                    const newPermissions = boxACL

                    for (const connection of targetSubscriber.connexions) {
                        io.to(connection.socket).emit("chat", feedbackForTarget)
                        io.to(connection.socket).emit("permissions", newPermissions.acl[targetSubscriber.role])
                    }
                } catch (error) {
                    const response = new FeedbackMessage({
                        contents: error.message,
                        scope: roleChangeRequest.scope.boxToken,
                        context: 'error'
                    })

                    socket.emit("chat", response)
                }
            })
        })
    }

    public listen() {
        boxQueue.process((job, done) => {
            const { boxToken, subject }: BoxJob = job.data

            // Do things depending on the subject
            const message = new SystemMessage({
                source: 'system',
                scope: boxToken,
                context: 'info'
            })
            switch (subject) {
                case "close":
                    // Build message
                    message.contents = `This box has just been closed. Video play and submission have been disabled.
                    Please exit this box.`

                    // Alert subscribers
                    io.in(boxToken).emit('chat', message)

                    break

                case "open":
                    // Build message
                    message.contents = "This box has been reopened. Video play and submissions have been reenabled."

                    // Alert subscribers
                    io.in(boxToken).emit('chat', message)

                    break

                case "destroy":
                    message.contents = `This box is being destroyed following an extended period of inactivity or a decision
                of its creator. All systems have been deactivated and cannot be restored. Please exit this box.`

                    // Alert subscribers
                    io.in(boxToken).emit('chat', message)

                    // Remove subscribers
                    void Subscriber.deleteMany({ boxToken })
                    break

                case "update":
                    message.contents = "This box has just been updated."

                    io.in(boxToken).emit('chat', message)

                    // TODO: Update permissions for everyone

                    void this.sendBoxToSubscribers(boxToken)
                    break

                default:
                    break
            }

            done()
        })

        // Listen to the sync queue for autoplay
        syncQueue.process((job, done) => {
            const { boxToken, order } = job.data

            if (order === 'next') {
                void this.transitionToNextVideo(boxToken)
            }

            done()
        })

        // Activity for all users in boxes
        berriesQueue.process(async (job, done) => {
            console.log('BERRIES JOB DONE: ', job.data)

            const scope: BoxScope = job.data.scope
            const amount: number = job.data.amount

            await berriesService.increaseBerryCount(scope, amount)

            await berriesService.stopNaturalIncrease(scope)

            // Restart only if the subscriber is still active
            const targetSubscriber = await Subscriber.findOne({ boxToken: scope.boxToken, userToken: scope.userToken })
            if (targetSubscriber.connexions.length > 0) {
                berriesService.startNaturalIncrease(scope)

                // Alert via the sockets that the count increased
                targetSubscriber.connexions.forEach(connexion => {
                    io.to(connexion.socket).emit('berries', {
                        userToken: scope.userToken,
                        boxToken: scope.boxToken,
                        berries: targetSubscriber.berries
                    })
                })
            }

            done()
        })

        // Actions coming over from the APIs
        queueActionsQueue.process(async (job, done) => {
            switch (job.data.type) {
                case 'addVideo':
                    void this.onVideoSubmissionRequest(job.data.requestContents)
                    break

                case 'addPlaylist':
                    void this.onPlaylistSubmissionRequest(job.data.requestContents)
                    break

                case 'playNext':
                    void this.onPlayNextRequest(job.data.requestContents)
                    break

                case 'playNow':
                    void this.onPlayNowRequest(job.data.requestContents)
                    break

                case 'skipVideo':
                    void this.onVideoSkipRequest(job.data.requestContents)
                    break

                case 'removeVideo':
                    void this.onVideoCancelRequest(job.data.requestContents)
                    break
            }

            done()
        })
    }

    /**
     * After the client auth themselves, they need to be caught up with the others in the box. It means they will ask for the
     * current video playing and must have an answer.
     *
     * This has to only send the link and its timestamp. If non-sockets want to know what's playing in a box, they'll listen to
     * a webhook. This is only for in-box requests.
     *
     * @param {string} boxToken The token of the box
     * @returns {Promise<SyncPacket>} The packet for sync
     * @memberof BoxService
     */
    public async onUserJoined(boxToken: string): Promise<SyncPacket> {
        const response: SyncPacket = { item: null, box: boxToken }

        try {
            response.item = await queueService.getCurrentVideo(boxToken)
            return response
        } catch (error) {
            throw error
        }
    }

    // Queue events, requests coming from users via APIs or sockets
    public async onVideoSubmissionRequest(videoSubmissionRequest: VideoSubmissionRequest) {
        // Find subscriber to get their refreshed number of berries
        const sourceSubscriber = await Subscriber.findOne({ userToken: videoSubmissionRequest.userToken, boxToken: videoSubmissionRequest.boxToken })

        try {
            // Submitting video
            let response: Partial<{ systemMessage: SystemMessage, feedbackMessage: FeedbackMessage, updatedBox: any, syncPacket: SyncPacket }> = await queueService.onVideoSubmitted(videoSubmissionRequest)

            io.in(videoSubmissionRequest.boxToken).emit("chat", response.systemMessage)
            io.in(videoSubmissionRequest.boxToken).emit("box", response.updatedBox)

            // If the playlist was over before the submission of the new video, the manager service relaunches the play
            const currentVideoIndex = _.findIndex(response.updatedBox.playlist, video => video.startTime !== null && video.endTime === null)
            if (currentVideoIndex === -1) {
                void this.transitionToNextVideo(videoSubmissionRequest.boxToken)
            } else {
                // If the queue was not empty, apply eventual next / now flags so the video is preselected or plays now
                if (videoSubmissionRequest.flag === 'next') { // The video is submitted in preselection
                    const targetVideo: QueueItem = response.updatedBox.playlist.find((video: QueueItem) => video.video.link === videoSubmissionRequest.link)
                    response = await queueService.onVideoPreselected({ item: targetVideo._id.toString(), boxToken: videoSubmissionRequest.boxToken, userToken: videoSubmissionRequest.userToken })

                    io.in(videoSubmissionRequest.boxToken).emit("chat", response.systemMessage)
                    io.in(videoSubmissionRequest.boxToken).emit("box", response.updatedBox)
                }

                if (videoSubmissionRequest.flag === 'now') { // The video is submitted and played now
                    const targetVideo: QueueItem = response.updatedBox.playlist.find((video: QueueItem) => video.video.link === videoSubmissionRequest.link)
                    response = await queueService.onVideoForcePlayed({ item: targetVideo._id.toString(), boxToken: videoSubmissionRequest.boxToken, userToken: videoSubmissionRequest.userToken })

                    io.in(videoSubmissionRequest.boxToken).emit("chat", response.systemMessage)
                    io.in(videoSubmissionRequest.boxToken).emit("box", response.updatedBox)
                    io.in(videoSubmissionRequest.boxToken).emit("sync", response.syncPacket)
                }
            }

            this.emitToSockets(sourceSubscriber.connexions, 'chat', response.feedbackMessage)
            this.emitToSockets(sourceSubscriber.connexions, 'berries', {
                userToken: videoSubmissionRequest.userToken,
                boxToken: videoSubmissionRequest.boxToken,
                berries: sourceSubscriber.berries
            } as BerryCount)
        } catch (error) {
            const message = new FeedbackMessage({
                contents: error.message,
                scope: videoSubmissionRequest.boxToken,
                context: 'error'
            })

            this.emitToSockets(sourceSubscriber.connexions, 'chat', message)
        }
    }

    public async onPlaylistSubmissionRequest(playlistSubmissionRequest: PlaylistSubmissionRequest) {
        const sourceSubscriber = await Subscriber.findOne({ userToken: playlistSubmissionRequest.userToken, boxToken: playlistSubmissionRequest.boxToken })

        try {
            const response = await queueService.onPlaylistSubmitted(playlistSubmissionRequest)

            io.in(playlistSubmissionRequest.boxToken).emit("chat", response.systemMessage)
            io.in(playlistSubmissionRequest.boxToken).emit("box", response.updatedBox)
            this.emitToSockets(sourceSubscriber.connexions, 'chat', response.feedbackMessage)

            // If the playlist was over before the submission of the new video, the manager service relaunches the play
            const currentVideoIndex = _.findIndex(response.updatedBox.playlist, video => video.startTime !== null && video.endTime === null)
            if (currentVideoIndex === -1) {
                void this.transitionToNextVideo(playlistSubmissionRequest.boxToken)
            }
        } catch (error) {
            const message = new FeedbackMessage({
                contents: "Your playlist could not be submitted.",
                scope: playlistSubmissionRequest.boxToken,
                context: "error"
            })
            this.emitToSockets(sourceSubscriber.connexions, 'chat', message)
        }
    }

    public async onPlayNextRequest(playNextRequest: QueueItemActionRequest): Promise<void> {
        const sourceSubscriber = await Subscriber.findOne({ userToken: playNextRequest.userToken, boxToken: playNextRequest.boxToken })
        try {
            const { systemMessage, feedbackMessage, updatedBox } = await queueService.onVideoPreselected(playNextRequest)

            io.in(playNextRequest.boxToken).emit("chat", systemMessage)
            io.in(playNextRequest.boxToken).emit("box", updatedBox)
            this.emitToSockets(sourceSubscriber.connexions, 'chat', feedbackMessage)
            this.emitToSockets(sourceSubscriber.connexions, 'berries', {
                userToken: playNextRequest.userToken,
                boxToken: playNextRequest.boxToken,
                berries: sourceSubscriber.berries - PLAY_NEXT_BERRY_COST
            })
        } catch (error) {
            const message = new FeedbackMessage({
                contents: error.message,
                scope: playNextRequest.boxToken,
                context: 'error'
            })
            this.emitToSockets(sourceSubscriber.connexions, 'chat', message)
        }
    }

    public async onPlayNowRequest(playNowRequest: QueueItemActionRequest): Promise<void> {
        const sourceSubscriber = await Subscriber.findOne({ userToken: playNowRequest.userToken, boxToken: playNowRequest.boxToken })
        try {
            const { syncPacket, updatedBox, systemMessage, feedbackMessage } = await queueService.onVideoForcePlayed(playNowRequest)

            io.in(playNowRequest.boxToken).emit("sync", syncPacket)
            io.in(playNowRequest.boxToken).emit("box", updatedBox)
            io.in(playNowRequest.boxToken).emit("chat", systemMessage)

            this.emitToSockets(sourceSubscriber.connexions, 'chat', feedbackMessage)
            this.emitToSockets(sourceSubscriber.connexions, 'berries', {
                userToken: playNowRequest.userToken,
                boxToken: playNowRequest.boxToken,
                berries: sourceSubscriber.berries - PLAY_NOW_BERRY_COST
            })
        } catch (error) {
            const message = new FeedbackMessage({
                contents: error.message,
                scope: playNowRequest.boxToken,
                context: 'error'
            })
            this.emitToSockets(sourceSubscriber.connexions, 'chat', message)
        }
    }

    public async onVideoCancelRequest(videoCancelRequest: QueueItemActionRequest): Promise<void> {
        const sourceSubscriber = await Subscriber.findOne({ userToken: videoCancelRequest.userToken, boxToken: videoCancelRequest.boxToken })

        try {
            // Remove the video from the playlist (_id is sent)
            const { systemMessage, feedbackMessage, updatedBox } = await queueService.onVideoCancelled(videoCancelRequest)

            io.in(videoCancelRequest.boxToken).emit("chat", systemMessage)
            io.in(videoCancelRequest.boxToken).emit("box", updatedBox)

            this.emitToSockets(sourceSubscriber.connexions, 'chat', feedbackMessage)
        } catch (error) {
            const message = new FeedbackMessage({
                contents: error.message,
                scope: videoCancelRequest.boxToken,
                context: 'error'
            })
            this.emitToSockets(sourceSubscriber.connexions, 'chat', message)
        }
    }

    public async onVideoSkipRequest(boxScope: BoxScope) {
        const sourceSubscriber = await Subscriber.findOne(boxScope)
        try {

            const { syncPacket, updatedBox, systemMessage, feedbackMessage } = await queueService.onVideoSkipped(boxScope)

            this.emitToSockets(sourceSubscriber.connexions, 'berries', {
                userToken: boxScope.userToken,
                boxToken: boxScope.boxToken,
                berries: sourceSubscriber.berries - SKIP_BERRY_COST
            })

            io.in(boxScope.boxToken).emit("sync", syncPacket)
            io.in(boxScope.boxToken).emit("box", updatedBox)
            io.in(boxScope.boxToken).emit("chat", systemMessage)

            this.emitToSockets(sourceSubscriber.connexions, 'chat', feedbackMessage)
        } catch (error) {
            const message = new FeedbackMessage({
                contents: error.message,
                scope: boxScope.boxToken,
                context: 'error'
            })
            this.emitToSockets(sourceSubscriber.connexions, 'chat', message)
        }
    }

    /**
     * Method called when the video ends; gets the next video in the playlist and sends it
     * to all subscribers in the box
     *
     * @private
     * @param {string} boxToken
     * @memberof BoxService
     */
    public async transitionToNextVideo(boxToken: string) {
        const { syncPacket, updatedBox, systemMessage: feedbackMessage } = await queueService.transitionToNextVideo(boxToken)

        io.in(boxToken).emit("sync", syncPacket)
        io.in(boxToken).emit("box", updatedBox)
        io.in(boxToken).emit("chat", feedbackMessage)
    }

    public async sendBoxToSubscribers(boxToken: string) {
        const box = await BoxSchema.findById(boxToken)
            .populate("creator", "_id name")
            .populate("playlist.video")
            .populate("playlist.submitted_by", "_id name")

        io.in(boxToken).emit("box", box)
    }

    public emitToSockets(connexions: Array<Connection>, channel: string, contents: unknown): void {
        for (const connexion of connexions) {
            io.in(connexion.socket).emit(channel, contents)
        }
    }
}

const boxService = new BoxService()
boxService.init()
boxService.listen()
export default boxService
