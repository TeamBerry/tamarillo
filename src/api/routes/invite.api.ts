import { Router, Request, Response } from "express"
import { Invite } from "../../models/invite.model"
const auth = require("./../middlewares/auth.middleware")
const boxMiddleware = require("./../middlewares/box.middleware")

const router = Router({ mergeParams: true })

router.get("/", [auth.isAuthorized, boxMiddleware.publicOrPrivateWithSubscription, boxMiddleware.openOnly], async (request: Request, response: Response) => {
    const invites = await Invite
        .find({
            boxToken: request.params.box,
            expiresAt: { $gte: new Date() }
        })
        .populate('userToken', 'name settings.picture', 'User')
        .sort({ createdAt: -1 })
        .lean()

    return response.status(200).send(invites)
})

router.delete("/:invite", [auth.isAuthorized, boxMiddleware.publicOrPrivateWithSubscription, boxMiddleware.openOnly], async (request: Request, response: Response) => {
    await Invite.findByIdAndRemove(request.params.invite)

    return response.status(200).send()
})

export const InviteApi = router
