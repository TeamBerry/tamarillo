import * as _ from 'lodash';
import * as moment from 'moment';
const mongoose = require('./../config/connection');
const express = require("express")();
const http = require("http").Server(express);
const io = require("socket.io")(http);

const Video = require("./../models/video.model");
const Box = require("./../models/box.model");
import { Message } from './../models/message.model';

/* const ChatService = require('./chat.service'); */
// TODO: Socket Manager. That will handle all connections and dispatch orders to services.

io.set('transports', ['websocket']);

export class SyncService {
    subscribers = [];
    public start() {
        console.log("starting sync service...");
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

            // Test video: https://www.youtube.com/watch?v=3gPBmDptqlQ
            /**
             * When recieving a video from an user, the service searches for it in the video database
             * and adds the video to the playlist of the box.
             *
             * If the video's not found in the database, it is created.
             *
             * Once it's done, it emits a confirmation message to the user.
             */
            socket.on('video', async (payload) => {
                console.log("==================== got video from client.", payload);

                // Obtaining video from database. Creating it if needed
                const video = await this.getVideo(payload);

                // Adding it to the playlist of the box
                await this.postToBox(video, payload.token);

                // Emitting feedback to the chat
                const recipients = _.filter(this.subscribers,
                    { token: payload.token, type: 'chat' });

                const feedback = new Message({
                    contents: 'A video has been added to the playlist.',
                    source: 'system',
                });

                _.each(recipients, (recipient) => {
                    io.to(recipient.socket).emit('chat', feedback);
                });
            });

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

    /**
     * Gets the video from the database. If it doesn't exist, it will create the new video and send it back.
     *
     * @param {any} payload
     * @returns
     * @memberof SyncService
     */
    async getVideo(payload) {
        let video = await Video.findOne({ link: payload.link });

        if (!video) {
            // TODO: Get info from YouTube
            video = await Video.create({ link: payload.link, name: 'Dummy' });
        }

        return video;
    }

    /**
     * Adds the obtained video to the playlist of the box
     *
     * @param {any} video
     * @param {any} token
     * @returns
     * @memberof SyncService
     */
    async postToBox(video, token) {
        console.log("got video to add to playlist: ", video);
        return Box.findOne({ _id: token }).exec(async (err, document) => {
            if (err) {
                console.log(err); // No box found
            }

            const submission = {
                timestart: moment(),
                video: video._id,
                startTime: null,
                endTime: null,
            };

            document.playlist.push(submission);

            return Box.findOneAndUpdate(
                { _id: token },
                { $set: { playlist: document.playlist } },
                (err, document) => {
                    if (err) {
                        console.log(err);
                    }
                    return;
                });
        });
    }
}

const syncService = new SyncService();
syncService.start();
export default syncService;