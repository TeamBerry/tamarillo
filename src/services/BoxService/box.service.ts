// Utils imports
import * as _ from "lodash"

// MongoDB & Sockets
const express = require("express")()
const http = require("http").Server(express)
const io = require("socket.io")(http)
io.set("transports", ["websocket"])
import * as Queue from 'bull'
const syncQueue = new Queue("sync")

// Models
const User = require("./../../models/user.model")
const SubscriberSchema = require("./../../models/subscriber.schema")
import { SyncPacket } from "../../models/sync-packet.model"
import { Message } from "./../../models/message.model"
import { Subscriber } from "./../../models/subscriber.model"
import { SubmissionPayload, CancelPayload } from "./../../models/video-payload.model"

// Import services that need to be managed
import chatService from "./chat.service"
import syncService from "./sync.service"
import moment = require("moment")
import { BoxAction } from "./actions/box-action.interface"
const BoxSchema = require("./../../models/box.model")

export type BoxActionConstructor = (new () => BoxAction)

/**
 * Manager service. The role of this is to manager the other services, like chat and sync, to ensure
 * communication is possible between them. It will create mainly start them, and send data from one to the other
*/
class BoxService {
    /**
     * Strategy patten to act on the box. Can be accessed by Sockets or APIs
     *
     * @private
     * @type {Map<string, BoxActionConstructor>}
     * @memberof BoxService
     */
    private boxActions: Map<string, BoxActionConstructor>

    constructor() {
        this.boxActions = new Map()

    }

    public init() {
        console.log("Manager service initialisation...")

        // Start listening on port 8008.
        http.listen(8008, async () => {
            // Empty subscribers collection
            await SubscriberSchema.deleteMany({})

            console.log("Socket started; Listening on port 8008...")
        })

        io.on("connection", (socket) => {
            console.log("Connection attempt.")
            /**
             * When an user joins the box, they will have to auth themselves.
             */
            socket.on("auth", (request) => {
                const client: Subscriber = {
                    origin: request.origin,
                    boxToken: request.boxToken,
                    userToken: request.userToken,
                    socket: socket.id,
                }

                // Connection check. If the user is not valid, he's refused
                if (!request.boxToken) {
                    const message = {
                        status: "ERROR_NO_TOKEN",
                        message: "No token has been given to the socket. Access has been denied.",
                        scope: request.boxToken,
                    }
                    console.log("Request denied")
                    socket.emit("denied", message)
                    // TODO: scan collection
                    // } else if (_.findIndex(this.subscribers, client) !== -1) {
                    //     const message = {
                    //         status: "ERROR_ALREADY_CONNECTED",
                    //         message: "You are already subscribed to that socket and that type.",
                    //         scope: request.boxToken
                    //     };
                    //     console.log('Request denied because it has already been granted.');
                } else {
                    SubscriberSchema.create(client)

                    const message = new Message({
                        contents: "You are now connected to the box!",
                        source: "system",
                        scope: request.boxToken,
                    })

                    console.log(`Request granted for user ${client.userToken} for box ${client.boxToken}`)

                    socket.emit("confirm", message)
                }
            })

            /**
             * What to do when you've got a video.
             *
             * @param {SubmissionPayload} payload the Video Payload
             */
            // Test video: https://www.youtube.com/watch?v=3gPBmDptqlQ
            socket.on("video", async (payload: SubmissionPayload) => {
                // Emitting feedback to the chat
                const recipients: Subscriber[] = await SubscriberSchema.find({ boxToken: payload.boxToken })

                try {
                    // Dispatching request to the Sync Service
                    const response = await syncService.onVideo(payload)

                    // Emit notification to all chat users that a video has been added by someone
                    this.emitToSocket(recipients, "chat", response.feedback)

                    // Emit box refresh to all the subscribers
                    this.emitToSocket(recipients, "box", response.updatedBox)

                    // If the playlist was over before the submission of the new video, the manager service relaunches the play
                    const currentVideoIndex = _.findIndex(response.updatedBox.playlist, (video) => {
                        return video.startTime !== null && video.endTime === null
                    })
                    if (currentVideoIndex === -1) {
                        this.transitionToNextVideo(payload.boxToken)
                    }
                } catch (error) {
                    // TODO: Only one user is the target in all cases, but the emitToSocket method only accepts an array...
                    const recipients: Subscriber[] = await SubscriberSchema.find({ userToken: payload.userToken, boxToken: payload.boxToken })

                    const message: Message = new Message({
                        author: "system",
                        // TODO: Extract from the error
                        contents: "This box is closed. Submission is disallowed.",
                        source: "bot",
                        scope: payload.boxToken,
                    })
                    this.emitToSocket(recipients, "chat", message)
                }
            })

            // When a user deletes a video from the playlist
            socket.on("cancel", async (payload: CancelPayload) => {
                try {
                    const recipients: Array<Subscriber> = await SubscriberSchema.find({ boxToken: payload.boxToken })

                    // Remove the video from the playlist (_id is sent)
                    const response = await syncService.onVideoCancel(payload)

                    this.emitToSocket(recipients, 'chat', response.feedback)

                    this.emitToSocket(recipients, 'box', response.updatedBox)
                } catch (error) {
                    const recipients: Array<Subscriber> = await SubscriberSchema.find({ userToken: payload.userToken, boxToken: payload.boxToken })

                    const message: Message = new Message({
                        author: 'system',
                        contents: 'The box is closed. The playlist cannot be changed.',
                        source: 'bot',
                        scope: payload.boxToken
                    })
                    this.emitToSocket(recipients, "chat", message)
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
                const message: Message = new Message()
                message.scope = request.boxToken

                const chatRecipient: Subscriber = await SubscriberSchema.findOne({
                    userToken: request.userToken,
                    boxToken: request.boxToken,
                })

                try {
                    const response = await syncService.onStart(request.boxToken)

                    if (response.item !== null) {
                        message.contents = 'Currently playing: "' + response.item.video.name + '"'
                        message.source = "bot"

                        // Get the recipient from the list of subscribers
                        const syncRecipient: Subscriber = await SubscriberSchema.findOne({
                            userToken: request.userToken,
                            boxToken: request.boxToken,
                        })

                        // Emit the response back to the client
                        io.to(syncRecipient.socket).emit("sync", response)
                    } else {
                        message.contents = "No video is currently playing in the box."
                        message.source = "system"
                    }

                    if (chatRecipient) {
                        io.to(chatRecipient.socket).emit("chat", message)
                    }
                } catch (error) {
                    // Emit the box closed message to the recipient
                    message.contents = "This box is closed. Video play is disabled."
                    message.source = "system"
                    if (chatRecipient) {
                        io.to(chatRecipient.socket).emit("chat", message)
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
                const chatRecipient: Subscriber = await SubscriberSchema.findOne({ userToken: message.author, boxToken: message.scope })

                if (await chatService.isMessageValid(message)) {
                    // We get the author of the message
                    const author = await User.findById(message.author)

                    if (!author) {
                        const errorMessage = new Message({
                            source: "system",
                            contents: "An error occurred, your message could not be sent.",
                            scope: message.scope,
                        })

                        io.to(chatRecipient.socket).emit("chat", errorMessage)
                    } else {
                        const dispatchedMessage = new Message({
                            author: {
                                _id: author._id,
                                name: author.name,
                            },
                            contents: message.contents,
                            source: message.source,
                            scope: message.scope,
                            time: message.time,
                        })

                        // We find all subscribers to the box (token of the message) for the chat type
                        const chatRecipients: Subscriber[] = await SubscriberSchema.find({
                            boxToken: message.scope,
                        })

                        // To all of them, we send the message
                        this.emitToSocket(chatRecipients, "chat", dispatchedMessage)
                    }
                } else {
                    const response = new Message({
                        contents: "Your message has been rejected by the server",
                        source: "system",
                        scope: message.scope,
                    })

                    io.to(chatRecipient.socket).emit("chat", response)
                }
            })

            /**
             * When the box is updated, it goes through there to be updated in the database and sent
             * back to all subscribers
             */
            socket.on("box", async (box) => {

            })

            socket.on("disconnect", async () => {
                try {
                    await SubscriberSchema.deleteOne({ socket: socket.id })
                } catch (error) {
                    // Graceful catch (silent)
                }
            })
        })
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
        const recipients = await SubscriberSchema.find({ boxToken })

        this.emitToSocket(recipients, "chat", message)
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
        const response = await syncService.getNextVideo(boxToken)

        const message: Message = new Message()
        message.scope = boxToken

        const recipients: Subscriber[] = await SubscriberSchema.find({ boxToken })

        if (response.nextVideo) {

            for (const recipient of recipients) {
                const syncPacket: SyncPacket = {
                    box: boxToken,
                    item: response.nextVideo,
                }
                io.to(recipient.socket).emit("sync", syncPacket)
            }

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

        for (const recipient of recipients) {
            io.to(recipient.socket).emit("box", response.updatedBox)
        }

        this.emitToSocket(recipients, "chat", message)
    }

    public async sendBoxToSubscribers(boxToken: string) {
        const box = await BoxSchema.findById(boxToken)
            .populate("creator", "_id name")
            .populate("playlist.video")
            .populate("playlist.submitted_by", "_id name")

        const recipients: Array<Subscriber> = await SubscriberSchema.find({ boxToken })

        this.emitToSocket(recipients, 'box', box)
    }

    /**
     * Finds and executes the corresponding action
     *
     * @param {string} actionName
     * @param {string} target
     * @memberof BoxService
     */
    public async executeAction(request: { boxToken: string, actionName: string, target: string }) {
        const actionConstructor: BoxActionConstructor = this.boxActions.get(request.actionName.toLocaleLowerCase())
        const action = new actionConstructor()

        await action.execute(request.boxToken, request.target)
    }

    /**
     * Emits a message to a list of recipients
     *
     * @private
     * @param {Array<Subscriber>} recipients The list of subscribers
     * @param {string} channel The channel to emit on
     * @param {Message | any} contents The contents to send
     * @memberof BoxService
     */
    private emitToSocket(recipients: Subscriber[], channel: string, contents: Message | any) {
        recipients.forEach((recipient: Subscriber) => {
            console.log(`Send contents on socket ${recipient.socket}, channel ${channel} for subscribers`)
            io.to(recipient.socket).emit(channel, contents)
        })
    }

    /**
     * Each time the socket recieves data, he has to check if the request can go through
     *
     * @private
     * @memberof BoxService
     */
    private checkAuth() {

    }

    /**
     * Builds the list of available actions on the box
     *
     * @private
     * @param {(new () => BoxAction)[]} boxActionConstructors
     * @memberof BoxService
     */
    private registerBoxActions(boxActionConstructors: (new () => BoxAction)[]): void {
        for (const boxActionConstructor of boxActionConstructors) {
            const actionName = new boxActionConstructor().getName().toLowerCase()

            this.boxActions.set(actionName, boxActionConstructor)
        }
    }
}

const boxService = new BoxService()
boxService.init()
export default boxService
