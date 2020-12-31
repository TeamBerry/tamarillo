import { Document, model, Schema } from "mongoose"

export class VideoClass {
    public name: string
    public link: string
    public duration: string
}

const videoSchema = new Schema(
    {
        link: String,
        name: String,
        duration: String
    }, {
        timestamps: true
    }
)

export interface VideoDocument extends VideoClass, Document { }

export const Video = model<VideoDocument>("Video", videoSchema)
