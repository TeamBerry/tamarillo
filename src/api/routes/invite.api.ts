import { Request, Response, Router } from "express"

import { Invite } from "../../models/invite.model"
const Box = require("./../../models/box.model")

const router = Router()

router.get("/invite", [], async (request: Request, response: Response) => {
    try {
        const invite = await Invite.findOne({ link: request.params.invite }).lean()

        if (!invite) {
            return response.status(404).send('INVITE_NOT_FOUND')
        }

        if (invite.expiresAt < new Date()) {
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
})

export const InviteApi = router
