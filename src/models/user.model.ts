import mongoose = require("mongoose");
var Schema = mongoose.Schema;

var userSchema = new Schema({
    name: String,
    token: String,
    mail: String,
    password: String,
    picture: String,
    bio: String,
    followers: [],
    following: [],
    moderators: [],
    friends: [],
    settings: {
        color: String,
    },
    badges: [],
});

module.exports = mongoose.model('User', userSchema);