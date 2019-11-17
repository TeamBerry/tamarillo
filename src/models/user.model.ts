import { Document, model, Schema } from "mongoose"

const userSchema = new Schema(
    {
        name: String,
        mail: String,
        password: String,
        favorites: [{ type: Schema.Types.ObjectId, ref: "Video" }],
        resetToken: { type: String, default: null },
        settings: {
            theme: { type: String, default: 'dark' }
        }
    },
    {
        timestamps: true, // Will automatically insert createdAt & updatedAt fields
    },
)

module.exports = model("User", userSchema)
