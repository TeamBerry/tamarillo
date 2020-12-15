import { Document, model, Schema } from "mongoose"

export class BadgeClass {
    public picture: string
    public description: string

    constructor(badge: BadgeClass) {
        this.picture = badge.picture
        this.description = badge.description
    }
}

const badgeSchema = new Schema(
    {
        picture: String,
        description: String
    },
    {
        timestamps: true
    }
)

export interface BadgeDocument extends BadgeClass, Document { }

export const Badge = model<BadgeDocument>("Badge", badgeSchema)
