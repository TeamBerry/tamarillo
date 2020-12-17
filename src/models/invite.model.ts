import { Document, model, Schema, SchemaTimestampsConfig } from "mongoose"

export class InviteClass {
    public link: string
    public boxToken: string
    public userToken: string
    public expiresAt: Date

    constructor(invite: Partial<InviteClass> & Pick<InviteClass, 'boxToken' | 'userToken'>) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let link = ''
        for (let i = 0; i < 8; i++){
            link += characters.charAt(Math.floor(Math.random() * characters.length))
        }

        this.link = link
        this.boxToken = invite.boxToken
        this.userToken = invite.userToken
        this.expiresAt = invite.expiresAt
    }
}

const inviteSchema = new Schema(
    {
        link: String,
        boxToken: { type: Schema.Types.ObjectId, ref: "Box" },
        userToken: { type: Schema.Types.ObjectId, ref: "User" },
        expiresAt: Date
    },
    {
        timestamps: true
    }
)

export interface InviteDocument extends InviteClass, Document, SchemaTimestampsConfig { }

export const Invite = model<InviteDocument>("Invite", inviteSchema)
