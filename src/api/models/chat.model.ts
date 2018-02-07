import mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ChatModel = new Schema({
    author: String,
    contents: String,
    timestamp: Date,
    recipient: String,
    scope: Number
});

module.exports = mongoose.ChatModel;
