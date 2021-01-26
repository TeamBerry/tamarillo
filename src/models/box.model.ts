import { model, Schema } from "mongoose"

import { QueueItem } from "@teamberry/muscadine"
import { ACLConfig } from "./acl.model"

export class Box {
    public creator: string
    public description: string
    public lang: string
    public name: string
    // DELETEME: After migration
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
        // Indicates the maximum allowed duration of a video for submission
        videoMaxDurationLimit: number
    }
    // Obtained from the user. Can be edited independently for each box
    public acl: ACLConfig
    // Date until when the box appears in the featured space
    public featured: Date
    // The currently playing video
    public currentVideo?: QueueItem
    // The number of users in the box
    public users?: number
}

const boxSchema = new Schema(
    {
        creator: { type: Schema.Types.ObjectId, ref: "User" },
        description: String,
        lang: String,
        name: String,
        // DELETEME: After migration
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
            berries: { type: Boolean, default: true },
            videoMaxDurationLimit: { type: Number, default: 0 }
        },
        acl: {
            moderator: { type: Array, default: ['addVideo', 'removeVideo', 'setVIP', 'unsetVIP', 'forceNext', 'forcePlay', 'inviteUser', 'bypassBerries'] },
            vip: { type: Array, default: ['addVideo', 'removeVideo', 'forceNext', 'inviteUser'] },
            simple: { type: Array, default: ['addVideo', 'inviteUser'] }
        },
        featured: { type: Date, default: null }
    },
    {
        timestamps: true
    }
)

module.exports = model("Box", boxSchema)
