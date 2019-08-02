import { NextFunction, Request, Response } from "express"

import * as jwt from "jsonwebtoken"

module.exports.isAuthorized = (request: Request, response: Response, next: NextFunction) => {
    console.log("Auth middleware check...")
    const auth = request.headers.authorization
    if (auth) {
        try {
            const tokenArray = request.headers.authorization.split(" ")

            jwt.verify(tokenArray[1], process.env.JWT_PASS, { algorithm: "HS256" })

            console.log("Access granted.")

            return next()
        } catch (error) {
            console.log("Access refused: ", error)

            return response.status(401).send("UNAUTHORIZED")
        }
    }
    console.log("Access refused.")
    return response.status(401).send("UNAUTHORIZED")
}