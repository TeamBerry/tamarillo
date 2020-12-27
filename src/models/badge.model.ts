import { Document, model, Schema } from "mongoose"

export type BadgeEventSubject = StringType | NumberType

interface StringType {
    key: 'box.join' | 'queue.now'
    value: string
    valueType?: 'string'
}
interface NumberType {
    key: 'box.life' | 'queue.add' | 'subscription.berries'
    value: number
    valueType?: 'number'
}

export class BadgeClass {
    public picture: string
    public name: string
    public description: string
    public isSecret: boolean
    public availableFrom: Date
    public availableTo: Date
    public unlockConditions: BadgeEventSubject

    constructor(badge: BadgeClass) {
        this.picture = badge.picture
        this.name = badge.name
        this.description = badge.description
        this.isSecret = badge.isSecret
        this.availableFrom = badge.availableFrom
        this.availableTo = badge.availableTo
        this.unlockConditions = badge.unlockConditions
    }
}

const badgeSchema = new Schema(
    {
        picture: String,
        name: String,
        description: String,
        isSecret: { type: Boolean, default: false },
        availableFrom: { type: Date, default: null },
        availableTo: { type: Date, default: null },
        unlockConditions: {
            key: String,
            value: { type: [String, Number] },
            valueType: String
        }
    },
    {
        timestamps: true
    }
)

export interface BadgeDocument extends BadgeClass, Document { }

export const Badge = model<BadgeDocument>("Badge", badgeSchema)
