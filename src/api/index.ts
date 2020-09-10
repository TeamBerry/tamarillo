import * as http from "http"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mongoose = require("./../config/connection")

import App from "./app"

http
    .createServer(App)
    .listen(+process.argv[2])
