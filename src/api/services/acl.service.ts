import { RoleChangeRequest } from "../../models/role-change.model"
import { Subscriber, PopulatedSubscriberDocument } from "../../models/subscriber.model"
import { FeedbackMessage, BoxScope, Permission } from "@teamberry/muscadine"
const Box = require("../../models/box.model")

class ACLService {
    public async isAuthorized(scope: BoxScope, action: Permission): Promise<boolean> {
        const subscriber = await Subscriber.findOne({
            userToken: scope.userToken,
            boxToken: scope.boxToken
        })

        // Admin powers bypass everything
        if (subscriber.role === 'admin') {
            return true
        }

        const box = await Box.findById(scope.boxToken).lean()

        return box.acl[subscriber.role].includes(action)
    }
}

const aclService = new ACLService()
export default aclService
