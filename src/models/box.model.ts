import mongoose = require("mongoose");
var Schema = mongoose.Schema;

var boxSchema = new Schema({
    creator: { type: Schema.Types.ObjectId, ref: 'User' },
    description: String,
    lang: String,
    name: String,
    playlist: [{
        submitted_at: Number,
        video: { type: Schema.Types.ObjectId, ref: 'Video' },
        startTime: Number,
        endTime: Number,
        ignored: Boolean // Indicates if the video has to be ignored by the autoplay. False by deafult
    }],
});

module.exports = mongoose.model('Box', boxSchema);
