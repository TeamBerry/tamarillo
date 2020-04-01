// Utils imports
import * as _ from "lodash"
import moment = require("moment")

// MongoDB & Sockets
const express = require("express")()
const http = require("http").Server(express)
const io = require("socket.io")(http)
io.set("transports", ["websocket"])
import * as Queue from 'bull'
const syncQueue = new Queue("sync")
const boxQueue = new Queue("box")

// Models
const User = require("./../../models/user.model")
const SubscriberSchema = require("./../../models/subscriber.schema")
import { Message, FeedbackMessage, QueueItemCancelRequest, VideoSubmissionRequest, PlaylistSubmissionRequest, SyncPacket } from "@teamberry/muscadine"
import { Subscriber } from "./../../models/subscriber.model"

// Import services that need to be managed
import chatService from "./chat.service"
import queueService from "./queue.service"
import { BoxJob } from "../../models/box.job"
const BoxSchema = require("./../../models/box.model")

/**
 * Manager service. The role of this is to manage the other services, like chat and playlist, to ensure
 * communication is possible between them. It will create mainly start them, and send data from one to the other
 */
class BoxService {
    public init() {
        console.log("Manager service initialisation...")

        // Start listening on port 8008.
        http.listen(8008, async () => {
            // Empty subscribers collection
            await SubscriberSchema.deleteMany({})

            console.log("Socket started; Listening on port 8008...")
        })

        io.on("connection", socket => {
            console.log("Connection attempt.")
            /**
             * When an user joins the box, they will have to auth themselves.
             */
            socket.on("auth", async request => {
                const client: Subscriber = {
                    origin: request.origin,
                    boxToken: request.boxToken,
                    userToken: request.userToken,
                    socket: socket.id
                }

                // Connection check. If the user is not valid, he's refused
                if (!request.boxToken) {
                    const message = {
                        status: "ERROR_NO_TOKEN",
                        message: "No token has been given to the socket. Access has been denied.",
                        scope: request.boxToken
                    }
                    socket.emit("denied", message)
                } else {
                    // Cleaning collection to avoid duplicates (safe guard)
                    await SubscriberSchema.deleteMany({ boxToken: request.boxToken, userToken: request.userToken })

                    SubscriberSchema.create(client)

                    const message: FeedbackMessage = new FeedbackMessage({
                        contents: "You are now connected to the box! Click the ? icon in the menu for help on how to submit videos.",
                        source: "system",
                        scope: request.boxToken,
                        feedbackType: 'success'
                    })

                    // Join Box room
                    socket.join(request.boxToken)

                    io.in(request.boxToken).clients((error, clients) => {
                        console.log(`CLIENTS IN ROOM ${request.boxToken}`, clients)
                    })

                    // Emit confirmation message
                    socket.emit("confirm", message)

                    // Emit Youtube Key for mobile
                    if (client.origin === 'Cranberry') {
                        socket.emit('bootstrap', {
                            boxKey: process.env.CRANBERRY_KEY
                        })
                    }
                }
            })

            /**
             * What to do when you've got a video.
             *
             * @param {VideoSubmissionRequest} payload the Video Payload
             */
            // Test video: https://www.youtube.com/watch?v=3gPBmDptqlQ
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
                } catch (error) {
                    const message: FeedbackMessage = new FeedbackMessage({
                        author: "system",
                        // TODO: Extract from the error
                        contents: "This box is closed. Submission is disallowed.",
                        source: "bot",
                        scope: request.boxToken,
                        feedbackType: 'error'
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
                    const message: FeedbackMessage = new FeedbackMessage({
                        author: "system",
                        contents: "Your playlist could not be submitted.",
                        source: "bot",
                        scope: request.boxToken,
                        feedbackType: "error"
                    })
                    socket.emit("chat", message)
                }
            })

            // When a user deletes a video from the playlist
            socket.on("cancel", async (request: QueueItemCancelRequest) => {
                try {
                    // Remove the video from the playlist (_id is sent)
                    const response = await queueService.onVideoCancelled(request)

                    io.in(request.boxToken).emit("chat", response.feedback)
                    io.in(request.boxToken).emit("box", response.updatedBox)
                } catch (error) {
                    const message: FeedbackMessage = new FeedbackMessage({
                        author: 'system',
                        contents: 'The box is closed. The playlist cannot be changed.',
                        source: 'bot',
                        scope: request.boxToken,
                        feedbackType: 'error'
                    })
                    socket.emit("chat", message)
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
            socket.on("start", async (request: { boxToken: string, userToken: string }) => {
                const message: FeedbackMessage = new FeedbackMessage()
                message.scope = request.boxToken
                message.feedbackType = 'info'

                const chatRecipient: Subscriber = await SubscriberSchema.findOne({
                    userToken: request.userToken,
                    boxToken: request.boxToken
                })

                try {
                    const response = await this.onUserJoined(request.boxToken)

                    if (response.item !== null) {
                        message.contents = 'Currently playing: "' + response.item.video.name + '"'
                        message.source = "bot"

                        // Emit the response back to the client
                        socket.emit("sync", response)
                    } else {
                        message.contents = "No video is currently playing in the box."
                        message.source = "system"
                    }

                    if (chatRecipient) {
                        socket.emit("chat", message)
                    }
                } catch (error) {
                    // Emit the box closed message to the recipient
                    message.contents = "This box is closed. Video play is disabled."
                    message.source = "system"
                    if (chatRecipient) {
                        socket.emit("chat", message)
                    }
                }
            })

            /**
             * Every in-box communication regarding video sync between clients will go through this event.
             */
            socket.on("sync", async (request: { boxToken: string, order: string }) => {
                switch (request.order) {
                    case "next": // Go to next video
                        this.skipVideo(request.boxToken)
                        break

                    default:
                        break
                }
            })

            /**
             * What to do when you've got a chat message
             *
             * @param message The message has the following structure:
             * {
             *  'author': the document ID of the user who sent the message,
             *  'contents': the contents of the message,
             *  'source': the source (user, bot, system...)
             *  'scope': the document ID of the box or of the user the message is targetting
             *  'time': the timestamp of the message
             * }
             */
            socket.on("chat", async (message: Message) => {
                // Get author full subscriber details
                if (await chatService.isMessageValid(message)) {
                    // We get the author of the message
                    const author = await User.findById(message.author)

                    if (!author) {
                        const errorMessage: FeedbackMessage = new FeedbackMessage({
                            source: "system",
                            contents: "An error occurred, your message could not be sent.",
                            scope: message.scope,
                            feedbackType: 'error'
                        })

                        socket.emit("chat", errorMessage)
                    } else {
                        const dispatchedMessage: Message = new Message({
                            author: {
                                _id: author._id,
                                name: author.name
                            },
                            contents: message.contents,
                            source: message.source,
                            scope: message.scope,
                            time: message.time
                        })

                        // To all of them, we send the message
                        io.in(message.scope).emit("chat", dispatchedMessage)
                    }
                } else {
                    const response = new FeedbackMessage({
                        contents: "Your message has been rejected by the server",
                        source: "system",
                        scope: message.scope,
                        feedbackType: 'error'
                    })

                    socket.emit("chat", response)
                }
            })

            socket.on("disconnect", async () => {
                console.log('LEAVING: ', socket.id)
                try {
                    await SubscriberSchema.deleteOne({ socket: socket.id })
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
            const message: FeedbackMessage = new FeedbackMessage({
                author: 'system',
                source: 'bot',
                scope: boxToken,
                feedbackType: 'info'
            })
            switch (subject) {
                case "close":
                    // Build message
                    message.contents = `This box has just been closed. Video play and submission have been disabled.
                    Please exit this box.`

                    // Alert subscribers
                    this.alertSubscribers(boxToken, message)
                    break

                case "open":
                    // Build message
                    message.contents = "This box has been reopened. Video play and submissions have been reenabled."

                    // Alert subscribers
                    this.alertSubscribers(boxToken, message)
                    break

                case "destroy":
                    message.contents = `This box is being destroyed following an extended period of inactivity or a decision
                of its creator. All systems have been deactivated and cannot be restored. Please exit this box.`

                    // Alert subscribers
                    this.alertSubscribers(boxToken, message)

                    // Remove subscribers
                    this.removeSubscribers(boxToken)
                    break

                case "update":
                    message.contents = "This box has just been updated."

                    this.alertSubscribers(boxToken, message)

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
     * Removes subscribers of a box. Used especially in the context of a box being destroyed.
     *
     * @param {string} boxToken
     * @memberof BoxService
     */
    public async removeSubscribers(boxToken: string) {
        await SubscriberSchema.deleteMany({ boxToken })
    }

    /**
     * Alerts all the chat subscribers of a box
     *
     * @param {string} boxToken
     * @param {Message} message
     * @memberof BoxService
     */
    public async alertSubscribers(boxToken: string, message: Message) {
        io.in(boxToken).emit('chat', message)
    }

    /**
     * Skips a video
     *
     * @param {string} boxToken
     * @memberof BoxService
     */
    public async skipVideo(boxToken: string) {
        const jobs = await syncQueue.getJobs(['delayed'])

        jobs.map((job: Queue.Job) => {
            if (job.data.boxToken === boxToken) {
                job.remove()
            }
        })
        this.transitionToNextVideo(boxToken)
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
        const jobs = await syncQueue.getJobs(['delayed'])

        jobs.map((job: Queue.Job) => {
            if (job.data.boxToken === boxToken) {
                job.remove()
            }
        })

        const response = await queueService.getNextVideo(boxToken)

        const message: FeedbackMessage = new FeedbackMessage()
        message.scope = boxToken
        message.feedbackType = 'info'

        if (response.nextVideo) {
            const syncPacket: SyncPacket = {
                box: boxToken,
                item: response.nextVideo
            }
            io.in(boxToken).emit("sync", syncPacket)

            // Send chat message for subscribers
            message.contents = "Currently playing: " + response.nextVideo.video.name
            message.source = "bot"

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
        } else {
            message.contents = "The playlist has no upcoming videos."
            message.source = "system"
        }

        io.in(boxToken).emit("box", response.updatedBox)
        io.in(boxToken).emit("chat", message)
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
