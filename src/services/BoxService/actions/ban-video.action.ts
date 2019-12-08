import { BoxAction } from "./box-action.interface"
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
        await BoxSchema.findOneAndUpdate(
            {
                "_id": boxToken,
                'playlist._id': target,
                'playlist.endTime': null
            },
            {
                $set: { 'playlist.$.ignored': true }
            }
        )
    }
}

const banVideo = new BanVideo()
export default banVideo
