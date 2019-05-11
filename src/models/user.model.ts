import mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/berrybox");
const Video = require('./video.model');

let Schema = mongoose.Schema;

let userSchema = new Schema(
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