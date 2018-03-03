import mongoose = require("mongoose");

var schema = new mongoose.Schema({
    creator: String,
    name: String,
    description: String,
    lang: String,
    playlist: [],
});

module.exports = mongoose.model('Box', schema);
