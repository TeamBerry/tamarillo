import { BoxAction } from "./box-action.interface"
import { PlaylistItem } from "../../../models/playlist-item.model"
const BoxSchema = require("./../../../models/box.model")

export class UnbanVideo implements BoxAction {
    public getName(): string {
        return 'unban'
    }

    public async execute(boxToken: string, target: string) {
        const updatedBox = await BoxSchema.findOneAndUpdate(
            {
                "_id": boxToken,
                'playlist._id': target,
                'playlist.endTime': null
            },
            {
                $set: { 'playlist.$.ignored': false }
            },
            {
                new: true
            }
        )
            .populate('playlist.video')

        const targetVideo: PlaylistItem = updatedBox.playlist.find((item: PlaylistItem) => item._id === target)

        return `The video ${targetVideo.video.name} has been restored in the playlist.`
    }
}

const unbanVideo = new UnbanVideo()
export default unbanVideo
