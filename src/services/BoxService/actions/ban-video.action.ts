import { BoxAction } from "./box-action.interface"
import { PlaylistItem } from "../../../models/playlist-item.model"
const BoxSchema = require("./../../../models/box.model")

export class BanVideo implements BoxAction {
    public getName(): string {
        return 'ban'
    }

    /**
     * Find video and sets its ignored flag to false
     *
     * @param {string} boxToken ObjectId of the box
     * @param {string} target ObjectId of the video from the playlist of the box
     * @memberof BanVideo
     */
    public async execute(boxToken: string, target: string) {
        const updatedBox = await BoxSchema
            .findOneAndUpdate(
                {
                    "_id": boxToken,
                    'playlist._id': target,
                    'playlist.endTime': null
                },
                {
                    $set: { 'playlist.$.ignored': true }
                }
            )
            .populate('playlist.video')

        const targetVideo: PlaylistItem = updatedBox.playlist.find((item: PlaylistItem) => item._id === target)

        return `The video ${targetVideo.video.name} has been marked for skip.`
    }
}

const banVideo = new BanVideo()
export default banVideo
