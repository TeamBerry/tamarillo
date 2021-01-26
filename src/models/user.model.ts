import { Document, model, Schema } from "mongoose"
import { ACLConfig } from './acl.model'

export class UserClass {
    public name: string
    public mail: string
    public password: string
    public resetToken?: string
    public settings?: {
        theme: 'light' | 'dark'
        picture: string
        color: string
        isColorblind: boolean
        badge: string
    }
    public acl?: ACLConfig
    public badges?: Array<{ badge: string, unlockedAt: Date }>
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
            isColorblind: { type: Boolean, default: false },
            badge: { type: String, default: null }
        },
        acl: {
            moderator: { type: Array, default: ['addVideo', 'removeVideo', 'setVIP', 'unsetVIP', 'forceNext', 'forcePlay'] },
            vip: { type: Array, default: ['addVideo', 'removeVideo', 'forceNext'] },
            simple: { type: Array, default: ['addVideo'] }
        },
        badges: [{
            _id: false,
            badge: { type: Schema.Types.ObjectId, ref: "Badge" },
            unlockedAt: { type: Date, default: Date.now }
        }]
    },
    {
        timestamps: true // Will automatically insert createdAt & updatedAt fields
    }
)

export interface UserDocument extends UserClass, Document { }

export const User = model<UserDocument>("User", userSchema)
