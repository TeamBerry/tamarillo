import { Document, model, Schema } from "mongoose"


export interface Connexion {
    /**
     * Origin of the connexion (Cranbery: mobile, Blueberry: web)
     *
     * @type {('Cranberry' | 'Blueberry')}
     * @memberof Connexion
     */
    origin: 'Cranberry' | 'Blueberry'
    /**
     * Socket ID (handled by socket.io)
     *
     * @type {string}
     * @memberof Connexion
     */
    socket: string
}

export interface ConnexionRequest extends Connexion {
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
     * @type {Array<Connexion>}
     * @memberof SubscriberClass
     */
    public connexions: Array<Connexion>
    public berries: number

    constructor(subscriber: SubscriberClass) {
        this.boxToken = subscriber.boxToken ?? null
        this.userToken = subscriber.userToken ?? null
        this.connexions = subscriber.connexions ?? []
        this.berries = subscriber.berries ?? 0
    }
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
        berries: { type: Number, default: 0 }
    },
    {
        timestamps: true
    }
)

export interface SubscriberDocument extends SubscriberClass, Document { }

export const Subscriber = model<SubscriberDocument>("Subscriber", subscriberSchema)
