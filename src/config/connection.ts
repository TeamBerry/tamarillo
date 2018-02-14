import * as mongoose from 'mongoose';

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://127.0.0.1:27017/berrybox", { useMongoClient: true });

var db = mongoose.connection;

db.once('open', () => {
    console.log("Connected to MongoDB.");
})

module.exports = mongoose;