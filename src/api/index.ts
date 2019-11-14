import * as http from "http"
const mongoose = require("./../config/connection")

import App from "./app"

const port = 3000
App.set("port", port)

const server = http.createServer(App)
server.listen(port)

server.on("listening", () => {
    const addr = server.address()
    const bind = (typeof addr === "string") ? `pipe ${addr}` : `port ${addr.port}`
})
