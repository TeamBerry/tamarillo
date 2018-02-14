import * as _ from 'lodash';
import * as moment from 'moment';

const express = require("express")();
const http = require("http").Server(express);
const io = require("socket.io")(http);

io.set('transports', ['websocket']);

import { Message } from './../models/message.model';

class ChatService {
    subscribers = [];

    public start(){
        this.subscribers = [];
        http.listen(3002, () => {
            console.log("Chat socket service started. Listening on port 3002...");
        });

        io.on('connection', (socket) => {
            socket.on('auth', (message) => {
                console.log("Connection attempt made on Chat Socket Service...");
                const client = {
                    origin: message.origin,
                    token: message.token,
                    type: 'chat',
                    subscriber: message.subscriber,
                    socket: socket.id
                };
                if (!message.token) {
                    // TODO: Do something with this
                    const message = {
                        status: "ERROR_NO_TOKEN",
                        message: "No token has been given to the socket. Access has been denied."
                    };
                    socket.emit('denied', message);
                } else {
                    console.log("client connected: ", client);

                    this.subscribers.push(client);

                    const welcomeMessage = new Message({
                        contents: 'You are now connected to the chat of this box. Welcome!',
                        source: 'system',
                    });

                    socket.emit('confirm', welcomeMessage);
                }
            });

            socket.on('chat', (message) => {
                console.log("Recieved a message.");
                if (message.scope) {
                    const dispatchedMessage = new Message(message);
                    console.log("Dispatching to all subscribers...");
                    // We find all subscribers to the box (token of the message) for the chat type
                    const recipients = _.filter(this.subscribers,
                        { token: message.scope, type: 'chat' });

                    console.log("found " + recipients.length + " recipients. Sending...");

                    // To all of them, we send the message
                    _.each(recipients, (recipient) => {
                        console.log("recipient is on socket " + recipient.socket + ". Emitting.");
                        io.to(recipient.socket).emit('chat', message);
                    });
                    console.log("message sent to all recipients");
                } else {
                    console.log("message doesn't have a token. Message ignored.");
                }
            });

            socket.on('disconnect', () => {
                console.log("user disconnecting. Deleting from list of subscribers...");
                const socketIndex = _.findIndex(this.subscribers, { socketId: socket.id });
                this.subscribers.splice(socketIndex, 1);
            });
        });
    }
}

const chatService = new ChatService();
chatService.start();
export default chatService;