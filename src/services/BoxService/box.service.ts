// Utils imports
import * as _ from 'lodash';

// MongoDB & Sockets
const express = require('express')();
const http = require('http').Server(express);
const io = require('socket.io')(http);
io.set('transports', ['websocket']);

// Models
const User = require('./../../models/user.model');
const SubscriberSchema = require('./../../models/subscriber.schema');
import { Message } from './../../models/message.model';
import { Subscriber } from './../../models/subscriber.model';
import { VideoPayload } from './../../models/video-payload.model';

// Import services that need to be managed
import syncService from './sync.service';
import chatService from './chat.service';
import { SyncPacket } from '../../models/sync-packet.model';

/**
 * Manager service. The role of this is to manager the other services, like chat and sync, to ensure
 * communication is possible between them. It will create mainly start them, and send data from one to the other
*/
class BoxService {
    public init() {
        console.log("Manager service initialisation...");

        // Start listening on port 8008.
        http.listen(8008, async () => {
            // Empty subscribers collection
            await SubscriberSchema.deleteMany({});

            console.log("Socket started; Listening on port boob...");
        });

        io.on('connection', (socket) => {
            console.log('Connection attempt.');
            /**
             * When an user joins the box, they will have to auth themselves.
             */
            socket.on('auth', (request) => {
                const client: Subscriber = {
                    origin: request.origin,
                    boxToken: request.boxToken,
                    userToken: request.userToken,
                    socket: socket.id,
                    type: request.type
                };

                // Connection check. If the user is not valid, he's refused
                if (!request.boxToken) {
                    const message = {
                        status: "ERROR_NO_TOKEN",
                        message: "No token has been given to the socket. Access has been denied.",
                        scope: request.boxToken
                    };
                    console.log('Request denied');
                    socket.emit('denied', message);
                    // TODO: scan collection
                    // } else if (_.findIndex(this.subscribers, client) !== -1) {
                    //     const message = {
                    //         status: "ERROR_ALREADY_CONNECTED",
                    //         message: "You are already subscribed to that socket and that type.",
                    //         scope: request.boxToken
                    //     };
                    //     console.log('Request denied because it has already been granted.');
                } else {
                    SubscriberSchema.create(client);

                    const message = new Message({
                        contents: 'You are now connected to the box!',
                        source: 'system',
                        scope: request.boxToken
                    });

                    console.log(`Request granted for user ${client.userToken} for box ${client.boxToken} with type ${client.type}`);

                    socket.emit('confirm', message);
                }
            });

            /**
             * What to do when you've got a video.
             *
             * @param {VideoPayload} payload the Video Payload
             */
            // Test video: https://www.youtube.com/watch?v=3gPBmDptqlQ
            socket.on('video', async (payload: VideoPayload) => {
                // Emitting feedback to the chat
                const chatRecipients: Array<Subscriber> = await SubscriberSchema.find({ boxToken: payload.boxToken, type: 'chat' });
                // Commented out because unused.
                const syncRecipients: Array<Subscriber> = await SubscriberSchema.find({ boxToken: payload.boxToken, type: 'sync' });

                try {
                    // Dispatching request to the Sync Service
                    const response = await syncService.onVideo(payload);

                    // Emit notification to all chat users that a video has been added by someone
                    this.emitToSocket(chatRecipients, 'chat', response.feedback);

                    // Emit box refresh to all the subscribers
                    this.emitToSocket(syncRecipients, 'box', response.updatedBox);

                    // If the playlist was over before the submission of the new video, the manager service relaunches the play
                    const currentVideoIndex = _.findIndex(response.updatedBox.playlist, (video) => {
                        return video.startTime !== null && video.endTime === null;
                    });
                    if (currentVideoIndex === -1) {
                        this.transitionToNextVideo(payload.boxToken);
                    }
                } catch (error) {
                    // TODO: Only one user is the target in all cases, but the emitToSocket method only accepts an array...
                    const recipients: Array<Subscriber> = await SubscriberSchema.find({ userToken: payload.userToken, boxToken: payload.boxToken, type: 'chat' })

                    let message: Message = new Message({
                        author: 'system',
                        // TODO: Extract from the error
                        contents: 'This box is closed. Submission is disallowed.',
                        source: 'bot',
                        scope: payload.boxToken
                    })
                    this.emitToSocket(recipients, 'chat', message);
                }
            });

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
            socket.on('start', async (request: { boxToken: string, userToken: string }) => {
                let message: Message = new Message();
                message.scope = request.boxToken;

                const chatRecipient: Subscriber = await SubscriberSchema.findOne({
                    userToken: request.userToken,
                    boxToken: request.boxToken,
                    type: 'chat'
                });

                console.log('CHAT RECIPIENT ON START: ', chatRecipient);

                try {
                    const response = await syncService.onStart(request.boxToken);

                    if (response) {
                        message.contents = 'Currently playing: "' + response.item.video.name + '"';
                        message.source = 'bot';

                        // Get the recipient from the list of subscribers
                        const syncRecipient: Subscriber = await SubscriberSchema.findOne({
                            userToken: request.userToken,
                            boxToken: request.boxToken,
                            type: 'sync'
                        });

                        // Emit the response back to the client
                        io.to(syncRecipient.socket).emit('sync', response);
                    } else {
                        message.contents = 'No video is currently playing in the box.';
                        message.source = 'system';
                    }

                    if (chatRecipient) {
                        io.to(chatRecipient.socket).emit('chat', message);
                    }
                } catch (error) {
                    // Emit the box closed message to the recipient
                    message.contents = 'This box is closed. Video play is disabled.';
                    message.source = 'system';
                    if (chatRecipient) {
                        io.to(chatRecipient.socket).emit('chat', message);
                    }
                }
            });

            /**
             * Every in-box communication regarding video sync between clients will go through this event.
             */
            socket.on('sync', async (request) => {
                // TODO: The whole sync process needs to be redone in here, since it has to leave Logos.
                switch (request.order) {
                    case 'next': // Go to next video (the previous one ended or a skip was requested)
                        this.transitionToNextVideo(request.boxToken);
                        break;

                    default:
                        break;
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
            socket.on('chat', async (message: Message) => {
                // Get author full subscriber details
                const chatRecipient: Subscriber = await SubscriberSchema.findOne({ userToken: message.author, boxToken: message.scope, type: 'chat' });

                if (await chatService.isMessageValid(message)) {
                    // We get the author of the message
                    let author = await User.findById(message.author);

                    if (!author) {
                        const errorMessage = new Message({
                            source: 'system',
                            contents: 'An error occurred, your message could not be sent.',
                            scope: message.scope
                        });

                        io.to(chatRecipient.socket).emit('chat', errorMessage);
                    } else {
                        const dispatchedMessage = new Message({
                            author: {
                                _id: author._id,
                                name: author.name
                            },
                            contents: message.contents,
                            source: message.source,
                            scope: message.scope,
                            time: message.time
                        });

                        // We find all subscribers to the box (token of the message) for the chat type
                        const chatRecipients: Array<Subscriber> = await SubscriberSchema.find({
                            boxToken: message.scope,
                            type: 'chat'
                        });

                        // To all of them, we send the message
                        this.emitToSocket(chatRecipients, 'chat', dispatchedMessage);
                    }
                } else {
                    const response = new Message({
                        contents: 'Your message has been rejected by the server',
                        source: 'system',
                        scope: message.scope
                    });

                    io.to(chatRecipient.socket).emit('chat', response);
                }
            });

            /**
             * When the box is updated, it goes through there to be updated in the database and sent
             * back to all subscribers
             */
            socket.on('box', async (box) => {

            })

            socket.on('disconnect', async () => {
                try {
                    await SubscriberSchema.deleteOne({ socket: socket.id });
                } catch (error) {
                    // Graceful catch (silent)
                }
            });
        })
    }

    /**
     * Method called when the video ends; gets the next video in the playlist and sends it
     * to all subscribers in the box
     *
     * @private
     * @param {string} boxToken
     * @memberof BoxService
     */
    private async transitionToNextVideo(boxToken: string) {
        let response = await syncService.getNextVideo(boxToken);
        let message: Message = new Message();
        message.scope = boxToken;

        if (response) {
            const syncRecipients: Array<Subscriber> = await SubscriberSchema.find({ boxToken, type: 'sync' });
            const chatRecipients: Array<Subscriber> = await SubscriberSchema.find({ boxToken, type: 'chat' });

            // Emit box refresh to all the subscribers
            _.each(syncRecipients, (recipient: Subscriber) => {
                if (response.nextVideo) {
                    const syncPacket: SyncPacket = {
                        box: boxToken,
                        item: response.nextVideo
                    };
                    console.log('Sync packet for next video.');
                    io.to(recipient.socket).emit('sync', syncPacket);
                }
                io.to(recipient.socket).emit('box', response.updatedBox);
            });

            if (response.nextVideo) {
                // Send chat message for subscribers
                message.contents = 'Currently playing: ' + response.nextVideo.video.name;
                message.source = 'bot';
            } else {
                message.contents = 'The playlist has no upcoming videos.';
                message.source = 'system';
            }

            console.log('Alerting users of the next video.');
            this.emitToSocket(chatRecipients, 'chat', message);
        }
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
     * Alerts all the chat subscribers of a box
     *
     * @param {string} boxToken
     * @param {Message} message
     * @memberof BoxService
     */
    public async alertSubscribers(boxToken: string, message: Message) {
        const recipients = await SubscriberSchema.find({ boxToken, type: 'chat' });

        this.emitToSocket(recipients, 'chat', message);
    }

    /**
     * Emits a message to a list of recipients
     *
     * @private
     * @param {Array<Subscriber>} recipients The list of subscribers
     * @param {string} channel The channel to emit on
     * @param {Message} message The message to send
     * @memberof BoxService
     */
    private emitToSocket(recipients: Array<Subscriber>, channel: string, message: Message) {
        console.log(`Send message on ${channel} for subscribers`, message);
        recipients.forEach((recipient: Subscriber) => {
            io.to(recipient.socket).emit(channel, message);
        })
    }
}

const boxService = new BoxService();
boxService.init();
export default boxService;