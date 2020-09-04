import { Document, model, Schema } from "mongoose"

export class InviteClass {
    public link: string
    public boxToken: string
    public userToken: string
    public expiry: '15m' | '30m' | '1h' | '2h'

    constructor(invite: Partial<InviteClass> & Pick<InviteClass, 'boxToken' | 'userToken'>) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let link = ''
        for (let i = 0; i < 8; i++){
            link += characters.charAt(Math.floor(Math.random() * characters.length))
        }

        this.link = link
        this.boxToken = invite.boxToken
        this.userToken = invite.userToken
        this.expiry = invite.expiry ?? '15m'
    }
}

const inviteSchema = new Schema(
    {
        link: String,
        boxToken: { type: Schema.Types.ObjectId, ref: "Box" },
        userToken: { type: Schema.Types.ObjectId, ref: "User" },
        expiry: String
    },
    {
        timestamps: true
    }
)

export interface InviteDocument extends InviteClass, Document { }

export const Invite = model<InviteDocument>("Invite", inviteSchema)
