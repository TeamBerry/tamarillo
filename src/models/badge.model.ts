import { Document, model, Schema } from "mongoose"

export class BadgeClass {
    public picture: string
    public name: string
    public description: string
    public isSecret: boolean
    public availableFrom: string
    public availableTo: string

    constructor(badge: BadgeClass) {
        this.picture = badge.picture
        this.name = badge.name
        this.description = badge.description
        this.isSecret = badge.isSecret
        this.availableFrom = badge.availableFrom
        this.availableTo = badge.availableTo
    }
}

const badgeSchema = new Schema(
    {
        picture: String,
        name: String,
        description: String,
        isSecret: { type: Boolean, default: false },
        availableFrom: Date,
        availableTo: Date
    },
    {
        timestamps: true
    }
)

export interface BadgeDocument extends BadgeClass, Document { }

export const Badge = model<BadgeDocument>("Badge", badgeSchema)
