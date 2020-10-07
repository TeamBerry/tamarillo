import { NextFunction, Request, Response } from "express"

import { Subscriber } from "../../models/subscriber.model"

/**
 * This middleware always happens AFTER the box param evaluation, so the box will always exist in locals
 * It also happens after the auth middleware, so it has access to the auth data if it exists
 */
module.exports.boxPrivacy = async (request: Request, response: Response, next: NextFunction) => {
    const matchingBox = response.locals.box

    // If the box has its privacy setting enabled, only users that already joined it can access
    if (matchingBox.private) {
        // For anonymous accounts, access is forbidden. 404 for safety
        if (!response.locals.auth) {
            return response.status(404).send('BOX_NOT_FOUND')
        }

        const decodedToken = response.locals.auth

        // For auth users that never accessed the box, access is forbidden as well
        if (await Subscriber.countDocuments({ userToken: decodedToken.user, boxToken: request.params.box }) === 0) {
            return response.status(404).send('BOX_NOT_FOUND')
        }
    }

    next()
}

/**
 * Rejects the request if the box is closed
 */
module.exports.boxMustBeOpen = async (request: Request, response: Response, next: NextFunction) => {
    const matchingBox = response.locals.box

    if (!matchingBox.open) {
        return response.status(403).send('BOX_CLOSED')
    }

    next()
}

/**
 * Rejects the request if the box is open
 */
module.exports.boxMustBeClosed = async (request: Request, response: Response, next: NextFunction) => {
    const matchingBox = response.locals.box

    if (!matchingBox.open) {
        return response.status(403).send('BOX_OPEN')
    }

    next()
}

module.exports.boxMustBePublic = async (request: Request, response: Response, next: NextFunction) => {
    const matchingBox = response.locals.box

    if (matchingBox.private) {
        return response.status(403).send('BOX_IS_PRIVATE')
    }

    next()
}
