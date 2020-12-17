import { Document, model, Schema, SchemaTimestampsConfig } from "mongoose"
import { nanoid } from 'nanoid'

export interface IInvite {
    link?: string
    boxToken: string
    userToken: string
    expiresAt: Date
}

const inviteSchema = new Schema(
    {
        link: { type: String, default: () => nanoid(20) },
        boxToken: { type: Schema.Types.ObjectId, ref: "Box" },
        userToken: { type: Schema.Types.ObjectId, ref: "User" },
        expiresAt: Date
    },
    {
        timestamps: true
    }
)

export interface InviteDocument extends IInvite, Document, SchemaTimestampsConfig { }

export const Invite = model<InviteDocument>("Invite", inviteSchema)
