import * as _ from 'lodash';
import * as moment from 'moment';
const express = require("express")();
const http = require("http").Server(express);
const io = require("socket.io")(http);

const Video = require("./../models/video.model");

io.set('transports', ['websocket']);

import { Message } from './../models/message.model';

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
                    type: 'sync',
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
                        contents: 'You are now connected to the box.',
                        source: 'system',
                    });

                    socket.emit('confirm', welcomeMessage);
                }
            });

            socket.on('video', (payload) => {
                // TODO: Get the link, add it to the database
                console.log("got video from client.", payload);
                Video.findOne({ link: payload.link }).exec((err, document) => {
                    if (!document) {
                        Video.create({ link: payload.link, name: 'Dummy' }, (err, entry) => {
                            if (err) {
                                console.log(err);
                            }
                            console.log(entry);
                        });
                    }
                });

            })

            socket.on('sync', (sync) => {
                console.log(sync);
            });

            socket.on('disconnect', () => {
                console.log("user disconnecting. Deleting from list of subscribers...");
                const socketIndex = _.findIndex(this.subscribers, { socketId: socket.id });
                this.subscribers.splice(socketIndex, 1);
            });
        });
    }
}

const syncService = new SyncService();
syncService.start();
export default syncService;