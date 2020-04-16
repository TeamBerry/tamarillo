import { Document, model, Schema } from "mongoose"

export class SubscriberClass {
    public origin: string
    public boxToken: string
    public userToken: string
    public socket: string

    constructor(subscriber: SubscriberClass) {
        this.origin = subscriber.origin ?? null
        this.boxToken = subscriber.boxToken ?? null
        this.userToken = subscriber.userToken ?? null
        this.socket = subscriber.socket ?? null
    }
}

const subscriberSchema = new Schema(
    {
        origin: String,
        boxToken: String,
        userToken: String,
        socket: String
    },
    {
        timestamps: true
    }
)

export interface SubscriberDocument extends SubscriberClass, Document { }

export const Subscriber = model<SubscriberDocument>("Subscriber", subscriberSchema)
