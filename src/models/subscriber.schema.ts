import { model, Schema } from "mongoose"

const subscriberSchema = new Schema(
    {
        origin: String,
        boxToken: String,
        userToken: String,
        socket: String
    }
)

module.exports = model("Subscriber", subscriberSchema)
