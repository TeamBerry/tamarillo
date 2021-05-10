import cors = require("cors")
import * as express from "express"

import { BoxApi } from "./../api/routes/box.api"
import { AuthApi } from "./routes/auth.api"
import PlaylistApi from "./routes/playlist.api"
import UserApi from "./routes/user.api"
import SearchApi from "./routes/search.api"
import InviteApi from "./routes/invite.api"
import { BadgeApi } from "./routes/badge.api"

class App {
    public app: express.Application

    constructor() {
        this.app = express()

        this.app.use(cors())
        this.app.use(express.json())

        this.routes()
    }

    private routes(): void {
        // Boxes
        this.app.use("/box", BoxApi)
        this.app.use("/boxes", BoxApi)
        this.app.use("/invites", InviteApi)

        // Users
        this.app.use("/user", UserApi)
        this.app.use("/users", UserApi)

        this.app.use("/auth", AuthApi)
        this.app.use("/playlists", PlaylistApi)
        this.app.use("/search", SearchApi)

        // Other
        this.app.use("/badges", BadgeApi)
    }
}

export default new App().app
