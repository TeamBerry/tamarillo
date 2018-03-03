import * as _ from 'lodash';
import * as moment from 'moment';
const mongoose = require('./../config/connection');

const Video = require("./../models/video.model");
const Box = require("./../models/box.model");
import { Message } from './../models/message.model';

export class SyncService {
    /**
     * After the client auth themselves, they need to caught up with the others in the box. It means they will ask for the
     * current video playing and must have an answer.
     *
     * This has to only send the link and its timestamp. If non-sockets want to know what's playing in a box, they'll listen to
     * a webhook. This is only for in-box requests.
     *
     * @param {any} request
     * @returns
     * @memberof SyncService
     */
    public async onStart(request) {
        // Get the currently played video for the request box
        const boxDetails = await Box.findOne({ _id: request.token }); // TODO: Send only the playlist maybe?
        const currentVideo = _.filter(boxDetails.playlist, (video) => {
            return video.startTime !== null;
        }); // FIXME: Don't return an array of object, it's just one object.
        const videoDetails = await Video.findOne({ _id: currentVideo[0].video });

        const response = {
            link: videoDetails.link,
            name: videoDetails.name,
            submissionTime: currentVideo[0].timestart, // TODO: Rename this field as submissionTime in the playlist of the box
            startTime: currentVideo[0].startTime,
        };

        console.log("constructed response for the client: ", response);

        return response;
    }

    /**
     * When recieving a video from an user, the service searches for it in the video database
     * and adds the video to the playlist of the box.
     *
     * If the video's not found in the database, it is created.
     *
     * Once it's done, it emits a confirmation message to the user.
     *
     * @param {any} payload
     * @returns
     * @memberof SyncService
     */
    public async onVideo(payload) {
        console.log("got video from client.", payload);

        // Obtaining video from database. Creating it if needed
        const video = await this.getVideo(payload);

        // Adding it to the playlist of the box
        await this.postToBox(video, payload.token);

        const message = payload.author + ' has added the video "' + video.name + '" to the playlist.';
        const feedback = new Message({
            contents: message,
            source: 'system',
        });

        return feedback;
    }

    /**
     * Gets the video from the database. If it doesn't exist, it will create the new video and send it back.
     *
     * @param {any} payload
     * @returns
     * @memberof SyncService
     */
    private async getVideo(payload) {
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
    private async postToBox(video, token) {
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
export default syncService;