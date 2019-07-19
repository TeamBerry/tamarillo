import { Document, Schema, model } from 'mongoose';

var videoSchema = new Schema({
    link: String,
    name: String,
});

module.exports = model('Video', videoSchema);