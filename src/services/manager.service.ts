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
                console.log("Connection attempt made on socket service...");
                const client = {
                    origin: message.origin,
                    token: message.token,
                    subscriber: message.subscriber,
                    socket: socket.id,
                    type: message.type
                };

                // Connection check. If the user is not valid, he's refused
                if (!message.token) {
                    const message = {
                        status: "ERROR_NO_TOKEN",
                        message: "No token has been given to the socket. Access has been denied."
                    };
                    socket.emit('denied', message);
                } else {
                    console.log("Client accepted: ", client);

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
             */
            // Test video: https://www.youtube.com/watch?v=3gPBmDptqlQ
            socket.on('video', async (payload) => {
                console.log("handling video");

                // Dispatching request to the Sync Service
                const response = await syncService.onVideo(payload);

                console.log("recieved response from the sync service", response);

                // Emitting feedback to the chat
                const recipients = _.filter(this.subscribers, { token: payload.token, type: 'chat' });

                _.each(recipients, (recipient) => {
                    io.to(recipient.socket).emit('chat', response.feedback);
                });

                // Emit box refresh to all the subscribers
                _.each(this.subscribers, (recipient) => {
                    io.to(recipient.socket).emit('box', response.updatedBox);
                })
            });

            /**
             * After the client auth themselves, they need to be caught up with the others in the box. It means they will ask for the
             * current video playing and must have an answer.
             *
             * This has to only send the link and its timestamp. If non-sockets want to know what's playing in a box, they'll listen to
             * a webhook. This is only for in-box requests.
             */
            socket.on('start', async (request) => {
                console.log("recieved query to start sync in the box", request);

                const response = await syncService.onStart(request);

                console.log("recieved response from the sync service", response);

                const message = new Message({
                    contents: 'The video currently playing in the box is ' + response.name,
                    source: 'system'
                });

                // Get the recipient from the list of subscribers
                let recipient = _.filter(this.subscribers, { subscriber: request.subscriber, type: 'sync' });

                // Emit the response back to the client
                io.to(recipient[0].socket).emit('sync', response);

                recipient = _.filter(this.subscribers, { subscriber: request.subscriber, type: 'chat' });
                if(recipient[0]){
                    io.to(recipient[0].socket).emit('chat', message);
                }
            });

            /**
             * Every in-box communication regarding video sync between clients will go through this event.
             */
            socket.on('sync', async (request) => {
                // TODO: The whole sync process needs to be redone in here, since it has to leave Logos.
                console.log("sync: ", request);

                switch (request.order) {
                    case 'next':
                        this.transitionToNextVideo(request.boxToken);
                        break;

                    default:
                        break;
                }
            })

            /**
             * What to do when you've got a chat message
             */
            socket.on('chat', async (message) => {
                if (await chatService.onChat(message)) {
                    const dispatchedMessage = new Message(message);
                    // We find all subscribers to the box (token of the message) for the chat type
                    const recipients = _.filter(this.subscribers, { token: message.scope, type: 'chat' });

                    console.log("found " + recipients.length + " recipients. Sending...");

                    // To all of them, we send the message
                    _.each(recipients, (recipient) => {
                        console.log("recipient is on socket " + recipient.socket + ". Emitting.");
                        io.to(recipient.socket).emit('chat', dispatchedMessage);
                    });
                } else {
                    console.log("message has been rejected by the server");
                    const response = new Message({
                        contents: 'Your message has been rejected by the server',
                        source: 'system'
                    });

                    const recipient = _.filter(this.subscribers, { token: message.author, type: 'chat' });
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
                console.log("user disconnecting. Deleting from list of subscribers...");
                // FIXME: Throwing an error
                const socketIndex = _.findIndex(this.subscribers, { socketId: socket.id });
                this.subscribers.splice(socketIndex, 1);
            });
        })
    }

    private async transitionToNextVideo(boxToken) {
        let response = await syncService.getNextVideo(boxToken);

        // Emit box refresh to all the subscribers
        _.each(this.subscribers, (recipient) => {
            io.to(recipient.socket).emit('sync', response.nextVideo);
            io.to(recipient.socket).emit('box', response.updatedBox);
        });

        // Send chat message for subscribers
        const message = new Message({
            contents: 'The video currently playing in the box is ' + response.nextVideo.name,
            source: 'system'
        });

        const chatRecipients = _.filter(this.subscribers, { type: 'chat' });
        _.each(chatRecipients, (recipient) => {
            io.to(recipient.socket).emit('chat', message);
        });
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