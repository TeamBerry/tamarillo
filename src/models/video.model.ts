import mongoose = require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/berrybox");

var Schema = mongoose.Schema;

var videoSchema = new Schema({
    link: String,
    name: String,
});

module.exports = mongoose.model('Video', videoSchema);