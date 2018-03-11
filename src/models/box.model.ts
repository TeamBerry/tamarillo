import mongoose = require("mongoose");
var Schema = mongoose.Schema;

var boxSchema = new Schema({
    creator: String,
    description: String,
    lang: String,
    name: String,
    playlist: [{
        timestart: Number,
        video: { type: Schema.Types.ObjectId, ref: 'Video' },
        startTime: Number,
        endTime: Number,
    }],
});

module.exports = mongoose.model('Box', boxSchema);
