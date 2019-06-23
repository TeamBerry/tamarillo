import mongoose = require("mongoose");
const Schema = mongoose.Schema;

const subscriberSchema = new Schema(
    {
        origin: String,
        boxToken: String,
        userToken: String,
        socket: String,
        type: String
    }
);

module.exports = mongoose.model('Subscriber', subscriberSchema);