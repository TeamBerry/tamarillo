import { Document, model, Schema } from "mongoose"

export class UserClass {
    public name: string
    public mail: string
    public password: string
    public resetToken: string
    public settings: {
        theme: 'light' | 'dark'
        picture: string
        color: string
        isColorblind: boolean
    }

    constructor(user?: Partial<UserClass>) {
        this.name = user && user.name || null
        this.mail = user && user.mail || null
        this.password = user && user.password || null
        this.resetToken = user && user.resetToken || null
        this.settings = user && user.settings || {
            theme: 'dark',
            picture: null,
            color: '#DF62A9',
            isColorblind: false
        }
    }
}

const userSchema = new Schema(
    {
        name: String,
        mail: String,
        password: String,
        resetToken: { type: String, default: null },
        settings: {
            theme: { type: String, default: 'dark' },
            picture: { type: String, default: 'default-picture' },
            color: { type: String, default: '#DF62A9' },
            isColorblind: { type: Boolean, default: false }
        }
    },
    {
        timestamps: true // Will automatically insert createdAt & updatedAt fields
    }
)

export interface UserDocument extends UserClass, Document { }

export const User = model<UserDocument>("User", userSchema)
