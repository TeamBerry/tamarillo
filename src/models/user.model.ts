import mongoose = require("mongoose");
const Video = require('./video.model');

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
    favorites: [{ type: String, ref: 'Video' }],
    joined_at: Date
});

userSchema.pre('save', (next) => {
    userSchema.joined_at = new Date();
    next();
})

module.exports = mongoose.model('User', userSchema);