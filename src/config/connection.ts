import mongoose = require("mongoose")

mongoose.connect("mongodb://127.0.0.1:27017/berrybox", { useNewUrlParser: true, useFindAndModify: true })

const db = mongoose.connection

db.on("open", () => {
    console.log("Connected to MongoDB.")
})

module.exports = mongoose
