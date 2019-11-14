import { NextFunction, Request, Response } from "express"

import * as jwt from "jsonwebtoken"
import { PUBLIC_KEY } from "../config/keys"

// Prevents an API from being accessed unless the user is authentified
module.exports.isAuthorized = (request: Request, response: Response, next: NextFunction) => {
    console.log("Auth middleware check...")
    const auth = request.headers.authorization
    if (auth) {
        try {
            // Pass token to other methods in the chain
            response.locals.auth = verifyAuth(request.headers.authorization)

            return next()
        } catch (error) {
            console.log("Access refused: ", error)

            return response.status(401).send("UNAUTHORIZED")
        }
    }
    console.log("Access refused. No auth is given")
    return response.status(401).send("UNAUTHORIZED")
}

// Allows an API to be reached even without authentification, but gives the decoded token if there's one
module.exports.canBeAuthorized = (request: Request, response: Response, next: NextFunction) => {
    console.log("Auth middleware check...")
    const auth = request.headers.authorization
    if (auth) {
        try {
            // Pass token to other methods in the chain
            response.locals.auth = verifyAuth(request.headers.authorization)

            return next()
        } catch (error) {
            console.log("Access refused: ", error)

            return response.status(401).send("UNAUTHORIZED")
        }
    }
    next()
}

/**
 * Verifies a token is present and valid
 *
 * @param {*} requestHeadersAuthorization
 * @returns {String} The decoded token
 */
function verifyAuth(requestHeadersAuthorization): String {
    // Split the token to isolate parts (since it's a Bearer token, some parts like "Bearer " have to be left out)
    const tokenArray = requestHeadersAuthorization.split(" ")

    // TODO: Add token integrity check (is "Bearer " present?)

    // Verify Token
    const decodedToken = jwt.verify(tokenArray[1], PUBLIC_KEY, { algorithm: "RS256", issuer: 'Berrybox' })

    // Return decoded
    return decodedToken
}