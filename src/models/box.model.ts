import mongoose = require("mongoose");
var Schema = mongoose.Schema;

var boxSchema = new Schema({
    creator: String,
    name: String,
    description: String,
    lang: String,
    playlist: [{
        timestart: Number,
        video: { type: Schema.Types.ObjectId, ref: 'Video' },
        startTime: Number,
        endTime: Number,
    }],
});

module.exports = mongoose.model('Box', boxSchema);
