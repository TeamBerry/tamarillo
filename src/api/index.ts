import * as http from "http"
const mongoose = require("./../config/connection")

import App from "./app"

http
    .createServer(App)
    .listen(3000)
