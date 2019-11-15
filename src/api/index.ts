import * as https from "https"
const mongoose = require("./../config/connection")

import App from "./app"

https
    .createServer(App)
    .listen(3000)
