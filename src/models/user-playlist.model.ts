import { Document, model, Schema } from "mongoose"
import { UserDocument } from './user.model'

export class UserPlaylistClass {
    public name: string
    public isPrivate?: boolean
    public user?: string | Partial<UserDocument>
    public videos?: Array<string> | Array<{
        _id: string
        name: string
        link: string
    }>
    public createdAt?: Date
    public updatedAt?: Date
    public isDeletable: boolean
}

const userPlaylistSchema = new Schema(
    {
        name: { type: String, required: true },
        isPrivate: { type: Boolean, default: false },
        user: { type: Schema.Types.ObjectId, ref: "User" },
        videos: [{ type: Schema.Types.ObjectId, ref: "Video" }],
        isDeletable: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
)

export interface UserPlaylistDocument extends UserPlaylistClass, Document { }

export const UserPlaylist = model<UserPlaylistDocument>("UserPlaylist", userPlaylistSchema)
