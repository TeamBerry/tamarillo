import { Document, model, Schema } from "mongoose"

export class UserPlaylistClass {
    public name: string
    public isPrivate?: boolean
    public user?: {
        _id: string
        name: string,
    }
    public videos: Array<{
        _id: string
        name: string
        link: string,
    }>
    public createdAt: Date
    public updatedAt: Date

    constructor(data: UserPlaylistClass) {
        this.name = data.name || null
        this.user = data.user || { _id: null, name: null }
        this.videos = data.videos || []
        this.isPrivate = data.isPrivate || false
        this.createdAt = data.createdAt || null
        this.updatedAt = data.updatedAt || null
    }
}

const userPlaylistSchema = new Schema(
    {
        name: { type: String, required: true },
        isPrivate: { type: Boolean, default: false },
        user: { type: Schema.Types.ObjectId, ref: "User" },
        videos: [{ type: Schema.Types.ObjectId, ref: "Video" }],
    },
    {
        timestamps: true,
    },
)

export interface UserPlaylistDocument extends UserPlaylistClass, Document { }

export const UserPlaylist = model<UserPlaylistDocument>("UserPlaylist", userPlaylistSchema)
