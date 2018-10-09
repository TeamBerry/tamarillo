import mongoose = require("mongoose");
const Video = require('./video.model');

var Schema = mongoose.Schema;

var userSchema = new Schema(
    {
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
    },
    {
        timestamps: true // Will automatically insert createdAt & updatedAt fields
    }
);

module.exports = mongoose.model('User', userSchema);