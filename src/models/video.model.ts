import { Document, model, Schema } from "mongoose"

const videoSchema = new Schema({
    link: String,
    name: String,
})

module.exports = model("Video", videoSchema)
