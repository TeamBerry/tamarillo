import { Document, model, Schema } from "mongoose"

export class InviteClass {
    public link: string
    public boxToken: string
    public validity: '15m' | '30m' | '1h' | '2h'
    public creator: string

    constructor(invite: Partial<InviteClass> & Pick<InviteClass, 'boxToken' | 'creator'>) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let link = ''
        for (let i = 0; i < 9; i++){
            link += characters.charAt(Math.floor(Math.random() * characters.length))
        }

        this.link = link
        this.boxToken = invite.boxToken
        this.validity = invite.validity ?? '15m'
        this.creator = invite.creator
    }
}

const inviteSchema = new Schema(
    {
        link: String,
        boxToken: { type: Schema.Types.ObjectId, ref: "Box" },
        duration: String,
        creator: { type: Schema.Types.ObjectId, ref: "User" }
    },
    {
        timestamps: true
    }
)

export interface InviteDocument extends InviteClass, Document { }

export const Invite = model<InviteDocument>("Invite", inviteSchema)
