import { BoxAction } from "./box-action.interface"
const BoxSchema = require("./../../../models/box.model")

export class UnbanVideo implements BoxAction {
    public getName(): string {
        return 'unban'
    }

    public async execute(boxToken: string, target: string) {
        await BoxSchema.findOneAndUpdate(
            {
                _id: boxToken,
                playlist: { _id: target, endTime: { $ne: null } }
            },
            {
                $set: { 'playlist.$.ignored': false }
            }
        )
    }
}