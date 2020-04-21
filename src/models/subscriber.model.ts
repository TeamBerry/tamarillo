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

    constructor(subscriber: SubscriberClass) {
        this.boxToken = subscriber.boxToken ?? null
        this.userToken = subscriber.userToken ?? null
        this.connexions = subscriber.connexions ?? []
    }
}

const subscriberSchema = new Schema(
    {
        boxToken: String,
        userToken: String,
        connexions: [
            {
                _id: false,
                origin: String,
                socket: String
            }
        ]
    },
    {
        timestamps: true
    }
)

export interface SubscriberDocument extends SubscriberClass, Document { }

export const Subscriber = model<SubscriberDocument>("Subscriber", subscriberSchema)
