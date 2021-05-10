/* eslint-disable @typescript-eslint/no-floating-promises */
import mongoose = require("mongoose")
const dotenv = require("dotenv")
dotenv.config()

const dbName = process.env.NODE_ENV === 'test' ? 'kiwi_test' : 'kiwi'

mongoose.connect(
    `mongodb://127.0.0.1:27017/${dbName}`,
    {
        authSource: "admin",
        auth: {
            user: process.env.MONGO_USER,
            password: process.env.MONGO_PASSWORD
        },
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    }
)

const db = mongoose.connection

db.on("open", () => {
    console.log("Connected to MongoDB.")
})

module.exports = mongoose
