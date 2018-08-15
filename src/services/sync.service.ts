import * as _ from 'lodash';
import * as moment from 'moment';
const axios = require("axios");
const mongoose = require('./../config/connection');
const querystring = require("querystring");

const Video = require("./../models/video.model");
const Box = require("./../models/box.model");
const User = require("./../models/user.model");
import { Message } from './../models/message.model';

export class SyncService {
    /**
     * After the client auth themselves, they need to caught up with the others in the box. It means they will ask for the
     * current video playing and must have an answer.
     *
     * This has to only send the link and its timestamp. If non-sockets want to know what's playing in a box, they'll listen to
     * a webhook. This is only for in-box requests.
     *
     * @param {string} boxToken The token of the box
     * @returns {Promise<{ link: any, name: any, submitted_at: any, startTime: any }>}
     * @memberof SyncService
     */
    public async onStart(boxToken: string): Promise<{ link: any, name: any, submitted_at: any, startTime: any }> {
        // Get the currently played video for the request box
        const currentVideo = await this.getCurrentVideo(boxToken);

        if (currentVideo) {
            const videoDetails = await Video.findOne({ _id: currentVideo.video });

            const response = {
                link: videoDetails.link,
                name: videoDetails.name,
                submitted_at: currentVideo.submitted_at,
                startTime: currentVideo.startTime,
            };

            return response;
        }

        return null;
    }

    /**
     * When recieving a video from an user, the service searches for it in the video database
     * and adds the video to the playlist of the box.
     *
     * If the video's not found in the database, it is created.
     *
     * Once it's done, it emits a confirmation message to the user.
     *
     * @param {any} payload The essentials to find the video, the user and the box. The payload is a JSON of this structure:
     *
     * {
     *  'link': The YouTube uID of the video to add
     *
     *  'author': The Berrybox uID of the user who submitted the video
     *
     *  'token': The Berrybox uID of the box to which the video is added
     * }
     *
     * @returns {Promise<{ feedback: any, updatedBox: any }>} A promise with a feedback message and the populated updated Box
     * @memberof SyncService
     */
    public async onVideo(payload): Promise<{ feedback: any, updatedBox: any }> {
        // Obtaining video from database. Creating it if needed
        const video = await this.getVideo(payload.link);

        // Finding the user who submitted the video
        const user = await User.findOne({ token: payload.author });

        // Adding it to the playlist of the box
        const updatedBox = await this.postToBox(video, payload.token);

        let message: string;
        if (user) {
            message = user.name + ' has added the video "' + video.name + '" to the playlist.';
        } else {
            message = 'The video "' + video.name + '" has been added to the playlist';
        }

        const feedback = new Message({
            contents: message,
            source: 'bot',
        });

        return {
            feedback: feedback,
            updatedBox: updatedBox
        };
    }

    /**
     * Gets the video from the database. If it doesn't exist, it will create the new video and send it back.
     *
     * @param {string} link the unique YouTube ID of the video
     * @returns
     * @memberof SyncService
     */
    private async getVideo(link: string) {
        let video = await Video.findOne({ link: link });

        if (!video) {
            const youtubeDetails = await axios.get('http://youtube.com/get_video_info?video_id=' + link);
            const parsedData = querystring.parse(youtubeDetails.data);

            video = await Video.create({ link: link, name: parsedData.title });
        }

        return video;
    }

    /**
     * Adds the obtained video to the playlist of the box
     *
     * @param {any} video The video to add to the playlist
     * @param {string} token The uID of the box
     * @returns
     * @memberof SyncService
     */
    public async postToBox(video, token: string) {
        let box = await Box.findOne({ _id: token });

        const submissionTime = moment().format('x');

        const submission = {
            video: video._id,
            startTime: null,
            endTime: null,
            ignored: false,
            submitted_at: submissionTime,
        };

        box.playlist.unshift(submission);

        let updatedBox = await Box.findOneAndUpdate(
            { _id: token },
            { $set: { playlist: box.playlist } },
            { new: true }
        ).populate('playlist.video');

        return updatedBox;
    }

    public async getCurrentVideo(token) {
        const box = await Box.findOne({ _id: token });

        const currentVideo = _.find(box.playlist, (video) => {
            return video.startTime !== null && video.endTime === null;
        });

        return currentVideo;
    }

    /**
     * Gets the next video from the playlist to play. Will
     * update the playlist of the box, and send JSON containing all the info for subscribers
     * in the box
     *
     * @param {*} token The token of the box
     * @returns JSON of the nextVideo and the updatedBox, or null
     * @memberof SyncService
     */
    public async getNextVideo(token) {
        const transitionTime = moment().format('x');
        let response = null;

        const box = await Box.findOne({ _id: token });

        // TODO: Find last index to skip ignored videos
        const currentVideoIndex = _.findIndex(box.playlist, (video) => {
            return video.startTime !== null && video.endTime === null;
        });

        // A video was playing and just ended
        if (currentVideoIndex !== -1) {
            // Ends the current video, the one that just ended
            box.playlist[currentVideoIndex].endTime = transitionTime;

            // Searches for a new one
            if (currentVideoIndex !== 0) {
                box.playlist[currentVideoIndex - 1].startTime = transitionTime;
            }

            // Updates the box
            let updatedBox = await Box.findOneAndUpdate(
                { _id: token },
                { $set: { playlist: box.playlist } },
                { new: true }
            ).populate('playlist.video');

            if (currentVideoIndex !== 0) {
                const nextVideo = updatedBox.playlist[currentVideoIndex - 1];

                response = {
                    link: nextVideo.video.link,
                    name: nextVideo.video.name,
                    submitted_at: nextVideo.submitted_at,
                    startTime: transitionTime,
                };
            }

            return {
                nextVideo: response,
                updatedBox: updatedBox
            };
        } else {
            // No video was playing before, the playlist was over (which means the service already entered the if condition once but found nothing)
            const nextVideoIndex = _.findLastIndex(box.playlist, (video) => {
                return video.startTime === null;
            });

            if (nextVideoIndex !== -1) {
                box.playlist[nextVideoIndex].startTime = transitionTime;

                let updatedBox = await Box.findOneAndUpdate(
                    { _id: token },
                    { $set: { playlist: box.playlist } },
                    { new: true }
                ).populate('playlist.video');

                const nextVideo = updatedBox.playlist[nextVideoIndex];

                response = {
                    link: nextVideo.video.link,
                    name: nextVideo.video.name,
                    submitted_at: nextVideo.submitted_at,
                    startTime: transitionTime
                };

                return {
                    nextVideo: response,
                    updatedBox: updatedBox
                };
            }
        }

        return null;
    }
}

const syncService = new SyncService();
export default syncService;