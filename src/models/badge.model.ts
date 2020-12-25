import { Document, model, Schema } from "mongoose"
import { BadgeEventSubject } from "./badge.job"

export class BadgeClass {
    public picture: string
    public name: string
    public description: string
    public isSecret: boolean
    public availableFrom: string
    public availableTo: string
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
        availableFrom: Date,
        availableTo: Date,
        unlockConditions: {
            action: String,
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
