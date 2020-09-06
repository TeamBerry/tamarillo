import { Request, Response, Router } from "express"

import { Invite } from "../../models/invite.model"
const Box = require("./../../models/box.model")

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
        try {
            const invite = await Invite.findOne({ link: request.params.invite }).lean()

            if (!invite) {
                return response.status(404).send('INVITE_NOT_FOUND')
            }

            const creationDate = new Date(invite.createdAt as string)
            const expiryDate = new Date(creationDate.getTime() + invite.expiry)

            if (expiryDate < new Date()) {
                return response.status(404).send('INVITE_EXPIRED')
            }

            const matchingBox = await Box.findById(invite.boxToken).lean()

            if (!matchingBox) {
                return response.status(404).send('BOX_NOT_FOUND')
            }

            if (!matchingBox.open) {
                return response.status(404).send('BOX_CLOSED')
            }

            return response.status(200).send(invite)
        } catch (error) {
            return response.status(500).send()
        }
    }
}

const inviteApi = new InviteApi()
export default inviteApi.router
