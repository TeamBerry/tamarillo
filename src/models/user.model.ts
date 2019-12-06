import { Document, model, Schema } from "mongoose"
import { VideoDocument } from "./video.model"

export class UserClass {
    public name: string
    public mail: string
    public password: string
    public favorites: Array<VideoDocument>
    public resetToken: string
    public settings: {
        theme: 'light' | 'dark',
        picture: string
    }

    constructor(user?: Partial<UserClass>) {
        this.name = user && user.name || null
        this.mail = user && user.mail || null
        this.password = user && user.password || null
        this.favorites = user && user.favorites || []
        this.resetToken = user && user.resetToken || null
        this.settings = user && user.settings || {
            theme: 'dark',
            picture: null
        }
    }
}

const userSchema = new Schema(
    {
        name: String,
        mail: String,
        password: String,
        favorites: [{ type: Schema.Types.ObjectId, ref: 'Video' }],
        resetToken: { type: String, default: null },
        settings: {
            theme: { type: String, default: 'dark' },
            picture: { type: String, default: null }
        }
    },
    {
        timestamps: true, // Will automatically insert createdAt & updatedAt fields
    },
)

export interface UserDocument extends UserClass, Document { }

module.exports = model("User", userSchema)
