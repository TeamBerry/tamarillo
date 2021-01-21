import { Request, Response, Router } from 'express'

import { Badge } from '../../models/badge.model'
const auth = require("./../middlewares/auth.middleware")

export class BadgeApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.init()
    }

    public init(): void {
        this.router.get("/", this.index)

        this.router.use(auth.isAuthorized)
        this.router.post('/', this.store)
    }

    public async index(_: Request, response: Response): Promise<Response> {
        const badges = await Badge.find({
            isSecret: false,
            $and: [
                {
                    $or: [
                        { availableFrom: null },
                        { availableFrom: { $lte: new Date() } }
                    ]
                },
                {
                    $or: [
                        { availableTo: null },
                        { availableTo: { $gte: new Date() } }
                    ]
                }
            ]
        })
            .select('-unlockConditions')
            .sort({ name: 1 })
        return response.status(200).send(badges)
    }

    public async store(request: Request, response: Response): Promise<Response> {
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
    }
}

const badgeApi = new BadgeApi()
export default badgeApi.router
