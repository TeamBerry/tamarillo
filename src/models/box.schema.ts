import { Document, model, Schema } from "mongoose"

const boxSchema = new Schema(
    {
        creator: { type: Schema.Types.ObjectId, ref: "User" },
        description: String,
        lang: String,
        name: String,
        playlist: [{
            _id: false,
            submitted_at: Number,
            video: { type: Schema.Types.ObjectId, ref: "Video" },
            submitted_by: { type: Schema.Types.ObjectId, ref: "User" },
            startTime: Number,
            endTime: Number,
            ignored: Boolean, // Indicates if the video has to be ignored by the autoplay. False by deafult
        }],
        open: Boolean,
    },
    {
        timestamps: true,
    },
)

module.exports = model("Box", boxSchema)
