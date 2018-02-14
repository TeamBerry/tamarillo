import mongoose = require("mongoose");

var schema = new mongoose.Schema({
    token: String,
    playlist: [],
    title: String,
    creator: String,
    description: String,
});

module.exports = mongoose.model('Box', schema);
