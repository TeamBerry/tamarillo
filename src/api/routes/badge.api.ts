import { Request, Response, Router } from 'express'
import { Badge } from '../../models/badge.model'

export class BadgeApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.init()
    }

    public init(): void {
        this.router.get("/", this.index)
    }

    public async index(request: Request, response: Response): Promise<Response> {
        const badges = await Badge.find({})
        return response.status(200).send(badges)
    }
}

const badgeApi = new BadgeApi()
export default badgeApi.router
