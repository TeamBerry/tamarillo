import { Document, model, Schema } from "mongoose"

import { PlaylistItem } from "./playlist-item.model"

export class Box {
    public creator: string
    public description: string
    public lang: string
    public name: string
    public playlist: PlaylistItem[]
    public open: boolean
    public settings: {
        // If true, the user controls the autoplay
        syncMaster: boolean
    }
}

const boxSchema = new Schema(
    {
        creator: { type: Schema.Types.ObjectId, ref: "User" },
        description: String,
        lang: String,
        name: String,
        playlist: [{
            _id: false,
            submittedAt: Date,
            video: { type: Schema.Types.ObjectId, ref: "Video" },
            submitted_by: { type: Schema.Types.ObjectId, ref: "User" },
            startTime: Date,
            endTime: Date,
            ignored: Boolean, // Indicates if the video has to be ignored by the autoplay. False by deafult
        }],
        open: Boolean,
        settings: {
            syncMaster: { type: Boolean, default: false }
        }
    },
    {
        timestamps: true,
    },
)

module.exports = model("Box", boxSchema)
