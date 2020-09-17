import { NextFunction, Request, Response } from "express"

import * as jwt from "jsonwebtoken"
import { PUBLIC_KEY } from "../../config/keys"
import { User } from "../../models/user.model"


// Prevents an API from being accessed unless the user is authentified
module.exports.isAuthorized = async (request: Request, response: Response, next: NextFunction) => {
    const auth = request.headers.authorization
    if (auth) {
        try {
            // Pass token to other methods in the chain
            response.locals.auth = await verifyAuth(request.headers.authorization)

            return next()
        } catch (error) {
            return response.status(401).send("UNAUTHORIZED")
        }
    }
    return response.status(401).send("UNAUTHORIZED")
}

// Allows an API to be reached even without authentification, but gives the decoded token if there's one
module.exports.canBeAuthorized = async (request: Request, response: Response, next: NextFunction) => {
    const auth = request.headers.authorization
    if (auth) {
        try {
            // Pass token to other methods in the chain
            const verifiedAuth = await verifyAuth(request.headers.authorization)

            if (verifiedAuth) {
                response.locals.auth = verifiedAuth
            }

            return next()
        } catch (error) {
            return next()
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
async function verifyAuth(requestHeadersAuthorization) {
    // Split the token to isolate parts (since it's a Bearer token, some parts like "Bearer " have to be left out)
    const tokenArray = requestHeadersAuthorization.split(" ")

    // TODO: Add token integrity check (is "Bearer " present?)

    // Verify Token
    try {
        // Verify JWT validity
        const decodedToken = jwt.verify(tokenArray[1], PUBLIC_KEY, { algorithm: "RS256", issuer: 'Berrybox' })

        // Verify user existence
        if (!await User.exists({ _id: decodedToken.user })) {
            throw new Error()
        }

        // Return decoded
        return decodedToken
    } catch (error) {
        throw new Error()
    }
}
