// Utils imports
import * as _ from 'lodash';
import * as moment from 'moment';

// MongoDB & Sockets
const mongoose = require('./../../config/connection');
const express = require('express')();
const http = require('http').Server(express);
const io = require('socket.io')(http);
io.set('transports', ['websocket']);

// Models
const Video = require('./../../models/video.model');
const Box = require('./../../models/box.schema');
const User = require('./../../models/user.model');
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
    subscribers: Array<Subscriber> = [];

    public init() {
        this.subscribers = [];
        console.log("Manager service initialisation...");
        http.listen(8008, () => {
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
                } else {
                    this.subscribers.push(client);

                    const message = new Message({
                        contents: 'You are now connected to the box!',
                        source: 'system',
                        scope: request.boxToken
                    });

                    console.log('Request granted');

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
                // TODO: Only one user is the target in all cases, whereas all users in the box should be alerted when a video is submitted.
                const recipients: Array<Subscriber> = _.filter(this.subscribers, { userToken: payload.userToken, boxToken: payload.boxToken, type: 'chat' });

                try {
                    // Dispatching request to the Sync Service
                    const response = await syncService.onVideo(payload);

                    // Emit feedback to user
                    this.emitToSocket(recipients, 'chat', response.feedback);

                    // Emit box refresh to all the subscribers
                    this.emitToSocket(this.subscribers, 'box', response.updatedBox);

                    // If the playlist was over before the submission of the new video, the manager service relaunches the play
                    const currentVideoIndex = _.findIndex(response.updatedBox.playlist, (video) => {
                        return video.startTime !== null && video.endTime === null;
                    });
                    if (currentVideoIndex === -1) {
                        this.transitionToNextVideo(payload.boxToken);
                    }
                } catch (error) {
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
                const response = await syncService.onStart(request.boxToken);
                let message: Message = new Message();
                message.scope = request.boxToken;

                if (response) {
                    message.contents = 'Currently playing: "' + response.item.video.name + '"';
                    message.source = 'bot';

                    // Get the recipient from the list of subscribers
                    let recipient = _.find(this.subscribers, { userToken: request.userToken, boxToken: request.boxToken, type: 'sync' });

                    // Emit the response back to the client
                    io.to(recipient.socket).emit('sync', response);
                } else {
                    message.contents = 'No video is currently playing in the box.';
                    message.source = 'system';
                }

                let recipient = _.find(this.subscribers, { userToken: request.userToken, boxToken: request.boxToken, type: 'chat' });
                if (recipient) {
                    io.to(recipient.socket).emit('chat', message);
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
                if (await chatService.isMessageValid(message)) {
                    // We get the author of the message
                    let author = await User.findById(message.author);

                    if (!author) {
                        const errorMessage = new Message({
                            source: 'system',
                            contents: 'An error occurred, your message could not be sent.',
                            scope: message.scope
                        });

                        const recipient: Subscriber = _.find(this.subscribers, { userToken: message.author, boxToken: message.scope, type: 'chat' });
                        io.to(recipient.socket).emit('chat', errorMessage);
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
                        const recipients: Array<Subscriber> = _.filter(this.subscribers, { boxToken: message.scope, type: 'chat' });

                        // To all of them, we send the message
                        _.each(recipients, (recipient: Subscriber) => {
                            io.to(recipient.socket).emit('chat', dispatchedMessage);
                        });
                    }
                } else {
                    const response = new Message({
                        contents: 'Your message has been rejected by the server',
                        source: 'system',
                        scope: message.scope
                    });

                    const recipient = _.find(this.subscribers, { userToken: message.author, boxToken: message.scope, type: 'chat' });
                    io.to(recipient.socket).emit('chat', response);
                }
            });

            /**
             * When the box is updated, it goes through there to be updated in the database and sent
             * back to all subscribers
             */
            socket.on('box', async (box) => {

            })

            socket.on('disconnect', () => {
                const socketIndex = _.findIndex(this.subscribers, { socket: socket.id });
                if (socketIndex !== -1) {
                    this.subscribers.splice(socketIndex, 1);
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
            const syncRecipients: Array<Subscriber> = _.filter(this.subscribers, { boxToken: boxToken, type: 'sync' });
            const chatRecipients: Array<Subscriber> = _.filter(this.subscribers, { boxToken: boxToken, type: 'chat' });

            // Emit box refresh to all the subscribers
            _.each(syncRecipients, (recipient: Subscriber) => {
                if (response.nextVideo) {
                    const syncPacket: SyncPacket = {
                        box: boxToken,
                        item: response.nextVideo
                    };
                    console.log('SYNC packet for next video:', syncPacket);
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
            _.each(chatRecipients, (recipient) => {
                io.to(recipient.socket).emit('chat', message);
            });
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
     * Emits a message to a list of recipients
     *
     * @private
     * @param {Array<Subscriber>} recipients The list of subscribers
     * @param {string} channel The channel to emit on
     * @param {Message} message The message to send
     * @memberof BoxService
     */
    private emitToSocket(recipients: Array<Subscriber>, channel: string, message: Message) {
        recipients.forEach((recipient: Subscriber) => {
            io.to(recipient.socket).emit(channel, message);
        })
    }
}

const boxService = new BoxService();
boxService.init();
export default boxService;