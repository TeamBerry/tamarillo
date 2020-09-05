import { NextFunction, Request, Response, Router } from "express"

export class InviteApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.init()
    }

    public init(): void {
        this.router.get("/:invite", this.match)
    }

    public async match(request: Request, response: Response): Promise<Response> {
        // TODO: Find the invite

        // TODO: Eval its validity

        // TODO: Send back the invite if it's valid
    }
}

const inviteApi = new InviteApi()
export default inviteApi.router
