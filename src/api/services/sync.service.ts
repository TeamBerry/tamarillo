import * as _ from 'lodash';
const express = require("express")();
const http = require("http").Server(express);
const io = require("socket.io")(http);

io.set('transports', ['websocket']);

class SyncService {
    subscribers = [];
    public start() {
        this.subscribers = [];
        http.listen(3001, () => {
            console.log("socket service started. Listening on port 3001...");
        });

        io.on('connection', (socket) => {
            socket.on('auth', (message) => {
                console.log("connection attempt made on socket service...");
                const client = {
                    origin: message.origin,
                    token: message.token,
                    type: 'chat',
                    subscriber: message.subscriber,
                    socket: socket.id
                };

                if (!message.token) {
                    const message = {
                        status: "ERROR_NO_TOKEN",
                        message: "No token has been given to the socket. Access has been denied."
                    };
                    socket.emit('denied', message);
                } else {
                    console.log("client connected: ", client);

                    // TODO: Add the client to the list of subscribers
                    this.subscribers.push(client);

                    socket.emit('confirm', "Connection granted. Welcome.");
                }
            });

            socket.on('sync', (sync) => {
                console.log(sync);
            });

            socket.on('chat', (message) => {
                console.log("recieved a message. Dispatching to all subscribers...");

                if (message.token) {
                    // We find all subscribers to the box (token of the message) for the chat type
                    const recipients = _.filter(this.subscribers,
                        { token: message.token, type: 'chat' });

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
            })
        })
    }
}

const syncService = new SyncService();
syncService.start();
export default syncService;