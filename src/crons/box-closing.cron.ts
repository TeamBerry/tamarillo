/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
require("./../config/connection")

import { QueueItemModel } from "../models/queue-item.model"
const BoxSchema = require("./../models/box.model")

export class BoxClosingCron {
    public async process(): Promise<void> {
        await this.run()
    }

    private async run() {
        // Get boxes that had no video playing in the last 24 hours
        const delay = new Date().setDate(new Date().getDate() - 1)

        for await (const box of BoxSchema.find({ open: true })) {
            const lastPlayedVideo = await QueueItemModel.findOne({
                box: box._id,
                startTime: { $gte: new Date(delay) }
            })

            // Close each box
            if (!lastPlayedVideo) {
                box.open = false
                await box.save()
            }
        }
        process.exit()
    }
}

const boxClosingCron = new BoxClosingCron()
void boxClosingCron.process()
export default boxClosingCron
