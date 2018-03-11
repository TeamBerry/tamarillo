import mongoose = require('mongoose');
var Schema = mongoose.Schema;

var videoSchema = new Schema({
    link: String,
    name: String,
});

module.exports = mongoose.model('Video', videoSchema);