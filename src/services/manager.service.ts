// Utils imports
import * as _ from 'lodash';
import * as moment from 'moment';

// MongoDB & Sockets
const mongoose = require('./../config/connection');
const express = require('express')();
const http = require('http').Server(express);
const io = require('socket.io')(http);
io.set('transports', ['websocket']);

// Models
const Video = require('./../models/video.model');
const Box = require('./../models/box.model');
import { Message } from './../models/message.model';

// Import services that need to be managed
import syncService from './sync.service';
import chatService from './chat.service';

/**
 * Manager service. The role of this is to manager the other services, like chat and sync, to ensure
 * communication is possible between them. It will create mainly start them, and send data from one to the other
*/
class ManagerService {
    subscribers = [];

    public init() {
        this.subscribers = [];
        console.log("Manager service initialisation...");
        http.listen(8008, () => {
            console.log("Socket started; Listening on port boob...");
        });

        io.on('connection', (socket) => {
            /**
             * When an user joins the box, they will have to auth themselves.
             */
            socket.on('auth', (message) => {
                const client = {
                    origin: message.origin,
                    boxToken: message.boxToken,
                    userToken: message.userToken,
                    socket: socket.id,
                    type: message.type
                };

                // Connection check. If the user is not valid, he's refused
                if (!message.boxToken) {
                    const message = {
                        status: "ERROR_NO_TOKEN",
                        message: "No token has been given to the socket. Access has been denied."
                    };
                    socket.emit('denied', message);
                } else {
                    this.subscribers.push(client);

                    const message = new Message({
                        contents: 'You are now connected to the box!',
                        source: 'system'
                    });

                    socket.emit('confirm', message);
                }
            });

            /**
             * What to do when you've got a video.
             *
             * playload structure :
             * {
             *  'link': The YouTube uID of the video to add
             *
             *  'userToken': The document ID of the user who submitted the video
             *
             *  'boxToken': The document ID of the box to which the video is added
             * }
             */
            // Test video: https://www.youtube.com/watch?v=3gPBmDptqlQ
            socket.on('video', async (payload) => {
                // Dispatching request to the Sync Service
                const response = await syncService.onVideo(payload);

                // Emitting feedback to the chat
                const recipients = _.filter(this.subscribers, { userToken: payload.userToken, type: 'chat' });

                _.each(recipients, (recipient) => {
                    io.to(recipient.socket).emit('chat', response.feedback);
                });

                // Emit box refresh to all the subscribers
                _.each(this.subscribers, (recipient) => {
                    io.to(recipient.socket).emit('box', response.updatedBox);
                });

                // If the playlist was over before the submission of the new video, the manager service relaunches the play
                const currentVideoIndex = _.findIndex(response.updatedBox.playlist, (video) => {
                    return video.startTime !== null && video.endTime === null;
                });
                if (currentVideoIndex === -1) {
                    this.transitionToNextVideo(payload.boxToken);
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
            socket.on('start', async (request) => {
                const response = await syncService.onStart(request.boxToken);
                let message: Message = new Message({
                    source: 'system'
                });

                if (response) {
                    message.contents = 'The video currently playing in the box is "' + response.name + '"';

                    // Get the recipient from the list of subscribers
                    let recipient = _.find(this.subscribers, { userToken: request.userToken, type: 'sync' });

                    // Emit the response back to the client
                    io.to(recipient.socket).emit('sync', response);
                } else {
                    message.contents = 'No video is currently playing in the box.';
                }

                let recipient = _.find(this.subscribers, { userToken: request.userToken, type: 'chat' });
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
            socket.on('chat', async (message) => {
                if (await chatService.onChat(message)) {
                    const dispatchedMessage = new Message(message);
                    // We find all subscribers to the box (token of the message) for the chat type
                    const recipients = _.filter(this.subscribers, { boxToken: message.scope, type: 'chat' });

                    // To all of them, we send the message
                    _.each(recipients, (recipient) => {
                        io.to(recipient.socket).emit('chat', dispatchedMessage);
                    });
                } else {
                    const response = new Message({
                        contents: 'Your message has been rejected by the server',
                        source: 'system'
                    });

                    const recipient = _.find(this.subscribers, { userToken: message.author, type: 'chat' });
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
                const socketIndex = _.findIndex(this.subscribers, { socketId: socket.id });
                this.subscribers.splice(socketIndex, 1);
            });
        })
    }


    /**
     * Method called when the video ends; gets the next video in the playlist and sends it
     * to all subscribers in the box
     *
     * @private
     * @param {string} boxToken
     * @memberof ManagerService
     */
    private async transitionToNextVideo(boxToken: string) {
        let response = await syncService.getNextVideo(boxToken);
        let message: Message = new Message({
            source: 'system'
        });

        if (response) {
            // Emit box refresh to all the subscribers
            _.each(this.subscribers, (recipient) => {
                if (response.nextVideo) {
                    io.to(recipient.socket).emit('sync', response.nextVideo);
                }
                io.to(recipient.socket).emit('box', response.updatedBox);
            });

            if (response.nextVideo) {
                // Send chat message for subscribers
                message.contents = 'The video currently playing in the box is ' + response.nextVideo.name;
            } else {
                message.contents = 'The playlist has no upcoming videos.';
            }
            const chatRecipients = _.filter(this.subscribers, { type: 'chat' });
            _.each(chatRecipients, (recipient) => {
                io.to(recipient.socket).emit('chat', message);
            });
        }
    }

    /**
     * Each time the socket recieves data, he has to check if the request can go through
     *
     * @private
     * @memberof ManagerService
     */
    private checkAuth() {

    }
}

const managerService = new ManagerService();
managerService.init();
export default managerService;