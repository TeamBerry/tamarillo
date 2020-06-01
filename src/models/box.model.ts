import { model, Schema } from "mongoose"

import { QueueItem } from "@teamberry/muscadine"

export class Box {
    public creator: string
    public description: string
    public lang: string
    public name: string
    public playlist: Array<QueueItem>
    public open: boolean
    public private: boolean
    public options: {
        // Random: The next video will be picked at random from the playlist
        random: boolean
        // Loop: If there are more than 10 submitted videos and less than 3 upcoming videos, one video at random from the pool of 10 will be added to the list of upcoming videos
        loop: boolean
        // Users will be able to accumulate berries and use them to gain temporary access to admin actions (skip, play now...)
        berries: boolean
    }
    // The number of users in the box
    public users?: number
}

const boxSchema = new Schema(
    {
        creator: { type: Schema.Types.ObjectId, ref: "User" },
        description: String,
        lang: String,
        name: String,
        playlist: [{
            submittedAt: Date,
            video: { type: Schema.Types.ObjectId, ref: "Video" },
            submitted_by: { type: Schema.Types.ObjectId, ref: "User" },
            startTime: Date,
            endTime: Date,
            isPreselected: { type: Boolean, default: false },
            stateForcedWithBerries: { type: Boolean, default: false }
        }],
        open: { type: Boolean, default: true },
        private: { type: Boolean, default: false },
        options: {
            random: { type: Boolean, default: false },
            loop: { type: Boolean, default: false },
            berries: { type: Boolean, default: true }
        }
    },
    {
        timestamps: true
    }
)

module.exports = model("Box", boxSchema)
