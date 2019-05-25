import mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/berrybox");

var Schema = mongoose.Schema;

var boxSchema = new Schema(
    {
        creator: { type: Schema.Types.ObjectId, ref: 'User' },
        description: String,
        lang: String,
        name: String,
        playlist: [{
            submitted_at: Number,
            video: { type: Schema.Types.ObjectId, ref: 'Video' },
            submitted_by: { type: Schema.Types.ObjectId, ref: 'User' },
            startTime: Number,
            endTime: Number,
            ignored: Boolean // Indicates if the video has to be ignored by the autoplay. False by deafult
        }],
        open: Boolean
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Box', boxSchema);
