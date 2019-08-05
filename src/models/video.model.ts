import { Document, model, Schema } from "mongoose"

export class Video {
    public name: string
    public link: string

    constructor(video: Video) {
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

export interface IVideo extends Video, Document { }

export const VideoModel = model<IVideo>("Video", videoSchema)
