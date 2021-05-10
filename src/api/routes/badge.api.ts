import { Request, Response, Router } from 'express'

import { Badge } from '../../models/badge.model'
const auth = require("./../middlewares/auth.middleware")

const router = Router()

router.get("/", [], async (_: Request, response: Response) => {
    const badges = await Badge.find({
        isSecret: false,
        $or: [
            { availableFrom: null },
            { availableFrom: { $lte: new Date() } }
        ]
    })
        .select('-unlockConditions')
        .sort({ name: 1 })
    return response.status(200).send(badges)
})

router.post("/", auth.isAuthorized, async (request: Request, response: Response) => {
    const decodedToken = response.locals.auth

    if (!decodedToken.physalis) {
        return response.status(401).send('UNAUTHORIZED')
    }

    try {
        if (Object.keys(request.body).length === 0) {
            return response.status(412).send('MISSING_PARAMETERS')
        }

        const createdBadge = await Badge.create(request.body)

        return response.status(201).send(createdBadge)
    } catch (error) {
        return response.status(500).send(error)
    }
})

export const BadgeApi = router
