import { QueueItem } from "@teamberry/muscadine"
import { model, Schema, Document } from "mongoose"

class QueueItemClass implements QueueItem {
    public box: string
    public submittedAt: Date
    public video: any
    public submitted_by: any
    public startTime: Date
    public endTime: Date
    public isPreselected: boolean
    public stateForcedWithBerries: boolean
}

const queueItemSchema = new Schema(
    {
        box: { type: Schema.Types.ObjectId, ref: "Box" },
        submittedAt: Date,
        video: { type: Schema.Types.ObjectId, ref: "Video" },
        submitted_by: { type: Schema.Types.ObjectId, ref: "User" },
        startTime: Date,
        endTime: Date,
        isPreselected: { type: Boolean, default: false },
        stateForcedWithBerries: { type: Boolean, default: false }
    },
    {
        timestamps: true
    }
)

export interface QueueItemDocument extends QueueItemClass, Document { }

export const QueueItemModel = model<QueueItemDocument>("QueueItem", queueItemSchema)
