import mongoose = require('mongoose');

var schema = new mongoose.Schema({
    link: String,
    name: String,
});

module.exports = mongoose.model('Video', schema);