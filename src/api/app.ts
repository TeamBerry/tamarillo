import * as bodyParser from "body-parser"
import cors = require("cors")
import * as express from "express"

import BoxApi from "./../api/routes/box.api"
import VideoApi from "./../api/routes/video.api"
import AuthApi from "./routes/auth.api"
import UserApi from "./routes/user.api"
import PlaylistApi from "./routes/playlist.api"

class App {
    public app: express.Application

    constructor() {
        this.app = express()

        this.app.use(cors())

        this.middlewares()
        this.routes()
    }

    private middlewares(): void {
        this.app.use(bodyParser.json({
            limit: "15mb",
            type: "application/json",
        }))
    }

    private routes(): void {
        // Boxes
        this.app.use("/box", BoxApi)
        this.app.use("/boxes", BoxApi)

        // Videos
        this.app.use("/video", VideoApi)
        this.app.use("/videos", VideoApi)

        // Users
        this.app.use("/user", UserApi)
        this.app.use("/users", UserApi)

        this.app.use("/auth", AuthApi)
        this.app.use("/playlists", PlaylistApi)
    }
}

export default new App().app
