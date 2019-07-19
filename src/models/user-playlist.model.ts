import { Document, Schema, model } from 'mongoose';

export class UserPlaylist {
    name: string
    private: boolean
    user: {
        _id: string
        name: string
    }
    videos: Array<{
        _id: string
        name: string
        link: string
    }>
    createdAt: Date
    updatedAt: Date

    constructor(data: UserPlaylist) {
        this.name = data.name
        this.user = data.user
        this.videos = data.videos
        this.createdAt = data.createdAt
        this.updatedAt = data.updatedAt
    }
}

var userPlaylistSchema = new Schema(
    {
        name: { type: String, required: true },
        private: { type: Boolean, default: false },
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        videos: [{
            type: Schema.Types.ObjectId, ref: 'Video'
        }]
    },
    {
        timestamps: true
    }
)

export interface UserPlaylistDocument extends UserPlaylist, Document { }

export const UsersPlaylist = model<UserPlaylistDocument>('UserPlaylist', userPlaylistSchema);