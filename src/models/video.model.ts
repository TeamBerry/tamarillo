import { Document, model, Schema } from "mongoose"

export class VideoClass {
    public name: string
    public link: string

    constructor(video: VideoClass) {
        this.name = video.name
        this.link = video.link
    }
}

const videoSchema = new Schema(
    {
        link: String,
        name: String,
    }, {
        timestamps: true
    }
)

export interface VideoDocument extends VideoClass, Document { }

export const Video = model<VideoDocument>("Video", videoSchema)
