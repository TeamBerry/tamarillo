import { Document, model, Schema } from "mongoose"

export class UserPlaylist {
    public name: string
    public private: boolean
    public user: {
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

    constructor(data: UserPlaylist) {
        this.name = data.name
        this.user = data.user
        this.videos = data.videos
        this.createdAt = data.createdAt
        this.updatedAt = data.updatedAt
    }
}

const userPlaylistSchema = new Schema(
    {
        name: { type: String, required: true },
        private: { type: Boolean, default: false },
        user: { type: Schema.Types.ObjectId, ref: "User" },
        videos: [{
            type: Schema.Types.ObjectId, ref: "Video",
        }],
    },
    {
        timestamps: true,
    },
)

export interface UserPlaylistDocument extends UserPlaylist, Document { }

export const UsersPlaylist = model<UserPlaylistDocument>("UserPlaylist", userPlaylistSchema)
