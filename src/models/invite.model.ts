import { Document, model, Schema, SchemaTimestampsConfig } from "mongoose"

export class InviteClass {
    public link: string
    public boxToken: string
    public userToken: string
    /**
     * Expiry of the invite. Values are 15 minutes, 30 minutes, 1 hour, 2 hours (in milliseconds)
     *
     * @type {(900000 | 1800000 | 3600000 | 7200000)}
     * @memberof InviteClass
     */
    public expiry: 900000 | 1800000 | 3600000 | 7200000

    constructor(invite: Partial<InviteClass> & Pick<InviteClass, 'boxToken' | 'userToken'>) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let link = ''
        for (let i = 0; i < 8; i++){
            link += characters.charAt(Math.floor(Math.random() * characters.length))
        }

        this.link = link
        this.boxToken = invite.boxToken
        this.userToken = invite.userToken
        this.expiry = invite.expiry ?? 900000
    }
}

const inviteSchema = new Schema(
    {
        link: String,
        boxToken: { type: Schema.Types.ObjectId, ref: "Box" },
        userToken: { type: Schema.Types.ObjectId, ref: "User" },
        expiry: Number
    },
    {
        timestamps: true
    }
)

export interface InviteDocument extends InviteClass, Document, SchemaTimestampsConfig { }

export const Invite = model<InviteDocument>("Invite", inviteSchema)
