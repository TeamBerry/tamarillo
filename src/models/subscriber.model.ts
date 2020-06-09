import { Document, model, Schema } from "mongoose"
import { Role } from "./acl.model"
import { UserClass } from "./user.model"


export interface Connection {
    /**
     * Origin of the connexion (Cranbery: mobile, Blueberry: web)
     *
     * @type {('Cranberry' | 'Blueberry')}
     * @memberof Connection
     */
    origin: 'Cranberry' | 'Blueberry'
    /**
     * Socket ID (handled by socket.io)
     *
     * @type {string}
     * @memberof Connection
     */
    socket: string
}

export interface ConnectionRequest extends Connection {
    boxToken: string
    userToken: string
}

export type BerryCount = Pick<SubscriberClass | SubscriberDocument, 'userToken' | 'boxToken' | 'berries'>

export class SubscriberClass {
    public boxToken: string
    public userToken: string
    /**
     * Lists all the connexions the user has linking to the box
     *
     * @type {Array<Connection>}
     * @memberof SubscriberClass
     */
    public connexions: Array<Connection>
    public berries: number
    public role: Role

    constructor(subscriber: SubscriberClass) {
        this.boxToken = subscriber.boxToken ?? null
        this.userToken = subscriber.userToken ?? null
        this.connexions = subscriber.connexions ?? []
        this.berries = subscriber.berries ?? 0
        this.role = subscriber.role ?? 'simple'
    }
}

export interface ActiveSubscriber {
    _id: string
    name: string
    role: Role
    origin: string
}

const subscriberSchema = new Schema(
    {
        boxToken: { type: Schema.Types.ObjectId, ref: "Box" },
        // Cannot always be an ObjectId, has to account for anonymous accounts
        userToken: String,
        connexions: [
            {
                _id: false,
                origin: String,
                socket: String
            }
        ],
        berries: { type: Number, default: 0 },
        role: { type: String, default: 'simple' }
    },
    {
        timestamps: true
    }
)


export interface SubscriberDocument extends SubscriberClass, Document { }

export interface PopulatedSubscriberDocument extends Omit<SubscriberDocument, 'userToken'> {
    userToken?: {
        _id: string
        name: string
        settings?: UserClass['settings']
    }
}

export const Subscriber = model<SubscriberDocument>("Subscriber", subscriberSchema)
