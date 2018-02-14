const mongoose = require("./../config/connection");

var schema = new mongoose.Schema({
    link: 'string',
    name: 'string',
});

var Video = mongoose.model('Video', schema);
module.exports = Video;