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

// Models
import { Subscriber, ConnectionRequest, BerryCount, PopulatedSubscriberDocument } from "../../models/subscriber.model"
import { Message, FeedbackMessage, QueueItemActionRequest, VideoSubmissionRequest, PlaylistSubmissionRequest, SyncPacket, BoxScope, SystemMessage } from "@teamberry/muscadine"

// Import services that need to be managed
import chatService from "./chat.service"
import queueService from "./queue.service"
import { BoxJob } from "../../models/box.job"
import berriesService from "./berries.service"
import { RoleChangeRequest } from "../../models/role-change.model"
import aclService from "./acl.service"
const BoxSchema = require("./../../models/box.model")

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
                            role: box.creator.toString() === authRequest.userToken ? 'admin' : 'simple'
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
                    socket.emit('permissions', userSubscription.role === 'admin' ? ['isAdmin'] : box.acl[userSubscription.role])

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

            // When a video is submitted
            socket.on("video", async (videoSubmissionRequest: VideoSubmissionRequest) => {
                // Emitting feedback to the chat
                try {
                    // Dispatching request to the Playlist Service
                    const response = await queueService.onVideoSubmitted(videoSubmissionRequest)

                    // Emit notification to all chat users that a video has been added by someone
                    io.in(videoSubmissionRequest.boxToken).emit("chat", response.feedback)

                    // Emit box refresh to all the subscribers
                    io.in(videoSubmissionRequest.boxToken).emit("box", response.updatedBox)

                    // If the playlist was over before the submission of the new video, the manager service relaunches the play
                    const currentVideoIndex = _.findIndex(response.updatedBox.playlist, video => video.startTime !== null && video.endTime === null)
                    if (currentVideoIndex === -1) {
                        this.transitionToNextVideo(videoSubmissionRequest.boxToken)
                    }

                    const newBerriesCount: number = await berriesService.increaseBerryCount({ userToken: videoSubmissionRequest.userToken, boxToken: videoSubmissionRequest.boxToken })

                    socket.emit('berries', {
                        userToken: videoSubmissionRequest.userToken,
                        boxToken: videoSubmissionRequest.boxToken,
                        berries: newBerriesCount
                    } as BerryCount)
                } catch (error) {
                    const message = new FeedbackMessage({
                        contents: error.message,
                        scope: videoSubmissionRequest.boxToken,
                        context: 'error'
                    })

                    socket.emit("chat", message)
                }
            })

            socket.on("playlist", async (playlistSubmissionRequest: PlaylistSubmissionRequest) => {
                try {
                    const response = await queueService.onPlaylistSubmitted(playlistSubmissionRequest)

                    io.in(playlistSubmissionRequest.boxToken).emit("chat", response.feedback)
                    io.in(playlistSubmissionRequest.boxToken).emit("box", response.updatedBox)

                    // If the playlist was over before the submission of the new video, the manager service relaunches the play
                    const currentVideoIndex = _.findIndex(response.updatedBox.playlist, video => video.startTime !== null && video.endTime === null)
                    if (currentVideoIndex === -1) {
                        this.transitionToNextVideo(playlistSubmissionRequest.boxToken)
                    }
                } catch (error) {
                    const message = new FeedbackMessage({
                        contents: "Your playlist could not be submitted.",
                        scope: playlistSubmissionRequest.boxToken,
                        context: "error"
                    })
                    socket.emit("chat", message)
                }
            })

            // When a user deletes a video from the playlist
            socket.on("cancel", async (videoCancelRequest: QueueItemActionRequest) => {
                try {
                    // Remove the video from the playlist (_id is sent)
                    const response = await queueService.onVideoCancelled(videoCancelRequest)

                    io.in(videoCancelRequest.boxToken).emit("chat", response.feedback)
                    io.in(videoCancelRequest.boxToken).emit("box", response.updatedBox)
                } catch (error) {
                    const message = new FeedbackMessage({
                        contents: error.message,
                        scope: videoCancelRequest.boxToken,
                        context: 'error'
                    })
                    socket.emit("chat", message)
                }
            })

            // When an user preselects / unselects a video
            socket.on("preselect", async (videoPreselectRequest: QueueItemActionRequest) => {
                try {
                    const response = await queueService.onVideoPreselected(videoPreselectRequest)

                    const targetSubscriber = await Subscriber.findOne({ userToken: videoPreselectRequest.userToken, boxToken: videoPreselectRequest.boxToken })

                    socket.emit('berries', {
                        userToken: videoPreselectRequest.userToken,
                        boxToken: videoPreselectRequest.boxToken,
                        berries: targetSubscriber.berries
                    })

                    io.in(videoPreselectRequest.boxToken).emit("chat", response.feedback)
                    io.in(videoPreselectRequest.boxToken).emit("box", response.updatedBox)
                } catch (error) {
                    const message = new FeedbackMessage({
                        contents: error.message,
                        scope: videoPreselectRequest.boxToken,
                        context: 'error'
                    })
                    socket.emit("chat", message)
                }
            })

            // When a user force plays a video
            socket.on('forcePlay', async (videoForcePlayRequest: QueueItemActionRequest) => {
                try {
                    const { syncPacket, updatedBox, feedbackMessage } = await queueService.onVideoForcePlayed(videoForcePlayRequest)

                    const targetSubscriber = await Subscriber.findOne({ userToken: videoForcePlayRequest.userToken, boxToken: videoForcePlayRequest.boxToken })

                    socket.emit('berries', {
                        userToken: videoForcePlayRequest.userToken,
                        boxToken: videoForcePlayRequest.boxToken,
                        berries: targetSubscriber.berries
                    })

                    io.in(videoForcePlayRequest.boxToken).emit("sync", syncPacket)
                    io.in(videoForcePlayRequest.boxToken).emit("box", updatedBox)
                    io.in(videoForcePlayRequest.boxToken).emit("chat", feedbackMessage)
                } catch (error) {
                    const message = new FeedbackMessage({
                        contents: error.message,
                        scope: videoForcePlayRequest.boxToken,
                        context: 'error'
                    })
                    socket.emit('chat', message)
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
                        message.contents = 'Currently playing: "' + response.item.video.name + '"'

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
             * Every in-box communication regarding video sync between clients will go through this event.
             */
            socket.on("sync", async (syncCommand: { boxToken: string, order: string }) => {

                if (syncCommand.order === 'next') {
                    try {
                        const sourceSubscriber = await Subscriber.findOne({ 'connexions.socket': socket.id })

                        const { syncPacket, updatedBox, feedbackMessage } = await queueService.onVideoSkipped({ userToken: sourceSubscriber.userToken, boxToken: syncCommand.boxToken })

                        socket.emit('berries', {
                            userToken: sourceSubscriber.userToken,
                            boxToken: syncCommand.boxToken,
                            berries: sourceSubscriber.berries - 30
                        })

                        io.in(syncCommand.boxToken).emit("sync", syncPacket)
                        io.in(syncCommand.boxToken).emit("box", updatedBox)
                        io.in(syncCommand.boxToken).emit("chat", feedbackMessage)
                    } catch (error) {
                        const message = new FeedbackMessage({
                            contents: error.message,
                            scope: syncCommand.boxToken,
                            context: 'error'
                        })
                        socket.emit('chat', message)
                    }
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
                    const targetSubscriber = await Subscriber.findOne({ userToken: roleChangeRequest.scope.userToken })
                    io.in(roleChangeRequest.scope.boxToken).to(targetSubscriber.connexions[0].socket).emit(feedbackForTarget)
                } catch (error) {
                    console.log('ROLE CHANGE ERROR: ', error)
                    const response = new FeedbackMessage({
                        contents: error.message,
                        scope: roleChangeRequest.scope.boxToken,
                        context: 'error'
                    })

                    socket.emit("chat", response)
                }
            })

            socket.on("disconnect", async () => {
                console.log('LEAVING: ', socket.id)
                try {
                    const targetSubscriber = await Subscriber.findOneAndUpdate(
                        { 'connexions.socket': socket.id },
                        { $pull: { connexions: { socket: socket.id } } }
                    )
                    berriesService.stopNaturalIncrease({ userToken: targetSubscriber.userToken, boxToken: targetSubscriber.boxToken })
                } catch (error) {
                    // Graceful catch (silent)
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
                    Subscriber.deleteMany({ boxToken })
                    break

                case "update":
                    message.contents = "This box has just been updated."

                    io.in(boxToken).emit('chat', message)

                    this.sendBoxToSubscribers(boxToken)
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
                this.transitionToNextVideo(boxToken)
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

    /**
     * Method called when the video ends; gets the next video in the playlist and sends it
     * to all subscribers in the box
     *
     * @private
     * @param {string} boxToken
     * @memberof BoxService
     */
    public async transitionToNextVideo(boxToken: string) {
        const { syncPacket, updatedBox, feedbackMessage } = await queueService.transitionToNextVideo(boxToken)

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
}

const boxService = new BoxService()
boxService.init()
boxService.listen()
export default boxService
