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
import { Subscriber, ConnexionRequest, BerryCount } from "../../models/subscriber.model"
import { Message, FeedbackMessage, QueueItemActionRequest, VideoSubmissionRequest, PlaylistSubmissionRequest, SyncPacket, BoxScope, SystemMessage } from "@teamberry/muscadine"

// Import services that need to be managed
import chatService from "./chat.service"
import queueService from "./queue.service"
import { BoxJob } from "../../models/box.job"
import berriesService from "./berries.service"
import { User } from "../../models/user.model"
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
            socket.on("auth", async request => {
                const connexionRequest: ConnexionRequest = {
                    origin: request.origin,
                    boxToken: request.boxToken,
                    userToken: request.userToken,
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
                            berries: 0
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
            socket.on("video", async (request: VideoSubmissionRequest) => {
                // Emitting feedback to the chat
                try {
                    // Dispatching request to the Playlist Service
                    const response = await queueService.onVideoSubmitted(request)

                    // Emit notification to all chat users that a video has been added by someone
                    io.in(request.boxToken).emit("chat", response.feedback)

                    // Emit box refresh to all the subscribers
                    io.in(request.boxToken).emit("box", response.updatedBox)

                    // If the playlist was over before the submission of the new video, the manager service relaunches the play
                    const currentVideoIndex = _.findIndex(response.updatedBox.playlist, video => video.startTime !== null && video.endTime === null)
                    if (currentVideoIndex === -1) {
                        this.transitionToNextVideo(request.boxToken)
                    }

                    const newBerriesCount: number = await berriesService.increaseBerryCount({ userToken: request.userToken, boxToken: request.boxToken })

                    socket.emit('berries', {
                        userToken: request.userToken,
                        boxToken: request.boxToken,
                        berries: newBerriesCount
                    } as BerryCount)
                } catch (error) {
                    const message = new FeedbackMessage({
                        contents: error.message,
                        scope: request.boxToken,
                        context: 'error'
                    })

                    socket.emit("chat", message)
                }
            })

            socket.on("playlist", async (request: PlaylistSubmissionRequest) => {
                try {
                    const response = await queueService.onPlaylistSubmitted(request)

                    io.in(request.boxToken).emit("chat", response.feedback)
                    io.in(request.boxToken).emit("box", response.updatedBox)

                    // If the playlist was over before the submission of the new video, the manager service relaunches the play
                    const currentVideoIndex = _.findIndex(response.updatedBox.playlist, video => video.startTime !== null && video.endTime === null)
                    if (currentVideoIndex === -1) {
                        this.transitionToNextVideo(request.boxToken)
                    }
                } catch (error) {
                    const message = new FeedbackMessage({
                        contents: "Your playlist could not be submitted.",
                        scope: request.boxToken,
                        context: "error"
                    })
                    socket.emit("chat", message)
                }
            })

            // When a user deletes a video from the playlist
            socket.on("cancel", async (request: QueueItemActionRequest) => {
                try {
                    // Remove the video from the playlist (_id is sent)
                    const response = await queueService.onVideoCancelled(request)

                    io.in(request.boxToken).emit("chat", response.feedback)
                    io.in(request.boxToken).emit("box", response.updatedBox)
                } catch (error) {
                    const message = new FeedbackMessage({
                        contents: error.message,
                        scope: request.boxToken,
                        context: 'error'
                    })
                    socket.emit("chat", message)
                }
            })

            // When an user preselects / unselects a video
            socket.on("preselect", async (request: QueueItemActionRequest) => {
                try {
                    const response = await queueService.onVideoPreselected(request)

                    const targetSubscriber = await Subscriber.findOne({ userToken: request.userToken, boxToken: request.boxToken })

                    socket.emit('berries', {
                        userToken: request.userToken,
                        boxToken: request.boxToken,
                        berries: targetSubscriber.berries
                    })

                    io.in(request.boxToken).emit("chat", response.feedback)
                    io.in(request.boxToken).emit("box", response.updatedBox)
                } catch (error) {
                    const message = new FeedbackMessage({
                        contents: error.message,
                        scope: request.boxToken,
                        context: 'error'
                    })
                    socket.emit("chat", message)
                }
            })

            // When a user force plays a video
            socket.on('forcePlay', async (request: QueueItemActionRequest) => {
                try {
                    const { syncPacket, updatedBox, feedbackMessage } = await queueService.onVideoForcePlayed(request)

                    const targetSubscriber = await Subscriber.findOne({ userToken: request.userToken, boxToken: request.boxToken })

                    socket.emit('berries', {
                        userToken: request.userToken,
                        boxToken: request.boxToken,
                        berries: targetSubscriber.berries
                    })

                    io.in(request.boxToken).emit("sync", syncPacket)
                    io.in(request.boxToken).emit("box", updatedBox)
                    io.in(request.boxToken).emit("chat", feedbackMessage)
                } catch (error) {
                    const message = new FeedbackMessage({
                        contents: error.message,
                        scope: request.boxToken,
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
             * @param request has this structure :
             * {
             *  "boxToken": the document ID of the box
             *  "userToken": the document ID of the user
             * }
             */
            socket.on("start", async (request: BoxScope) => {
                const message = new FeedbackMessage({
                    context: 'info',
                    scope: request.boxToken
                })

                try {
                    const response = await this.onUserJoined(request.boxToken)

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
            socket.on("sync", async (request: { boxToken: string, order: string }) => {

                if (request.order === 'next') {
                    try {
                        const sourceSubscriber = await Subscriber.findOne({ 'connexions.socket': socket.id })

                        const { syncPacket, updatedBox, feedbackMessage } = await queueService.onVideoSkipped({ userToken: sourceSubscriber.userToken, boxToken: request.boxToken })

                        socket.emit('berries', {
                            userToken: sourceSubscriber.userToken,
                            boxToken: request.boxToken,
                            berries: sourceSubscriber.berries - 30
                        })

                        io.in(request.boxToken).emit("sync", syncPacket)
                        io.in(request.boxToken).emit("box", updatedBox)
                        io.in(request.boxToken).emit("chat", feedbackMessage)
                    } catch (error) {
                        const message = new FeedbackMessage({
                            contents: error.message,
                            scope: request.boxToken,
                            context: 'error'
                        })
                        socket.emit('chat', message)
                    }
                }
            })

            // Handling chat messages
            socket.on("chat", async (message: Message) => {
                // Get author full subscriber details
                if (await chatService.isMessageValid(message)) {
                    // We get the author of the message
                    const author = await User.findById(message.author)

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
                                _id: author._id,
                                name: author.name,
                                color: author.settings.color
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
