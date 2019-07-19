import { Document, Schema, model } from 'mongoose';

const Video = require('./video.model');

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
        favorites: [{ type: Schema.Types.ObjectId, ref: 'Video' }],
    },
    {
        timestamps: true // Will automatically insert createdAt & updatedAt fields
    }
);

module.exports = model('User', userSchema);