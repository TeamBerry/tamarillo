import { NextFunction, Request, Response } from "express"

import * as jwt from "jsonwebtoken"

module.exports.isAuthorized = (request: Request, response: Response, next: NextFunction) => {
    console.log("Auth middleware check...")
    const auth = request.headers.authorization
    if (auth) {
        try {
            // Split the token to isolate parts (since it's a Bearer token, some parts like "Bearer " have to be left out)
            const tokenArray = request.headers.authorization.split(" ")

            // TODO: Add token integrity check (is "Bearer " present?)

            const decodedToken = jwt.verify(tokenArray[1], process.env.JWT_PASS, { algorithm: "HS256" })

            console.log("Access granted.")

            // Pass token to other methods in the chain
            response.locals.auth = decodedToken

            return next()
        } catch (error) {
            console.log("Access refused: ", error)

            return response.status(401).send("UNAUTHORIZED")
        }
    }
    console.log("Access refused. No auth is given")
    return response.status(401).send("UNAUTHORIZED")
}