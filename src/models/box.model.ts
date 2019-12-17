import { Document, model, Schema } from "mongoose"

import { PlaylistItem } from "@teamberry/muscadine"

export class Box {
    public creator: string
    public description: string
    public lang: string
    public name: string
    public playlist: Array<PlaylistItem>
    public open: boolean
    public options: {
        // Random: The next video will be picked at random from the playlist
        random: boolean
    }
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
            ignored: Boolean, // Indicates if the video has to be ignored by the autoplay. False by deafult
        }],
        open: Boolean,
        options: {
            random: { type: Boolean, default: false }
        }
    },
    {
        timestamps: true,
    },
)

module.exports = model("Box", boxSchema)
