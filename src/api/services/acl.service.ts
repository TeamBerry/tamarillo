import { Subscriber } from "../../models/subscriber.model"
import { BoxScope, Permission } from "@teamberry/muscadine"
const Box = require("../../models/box.model")

export enum ACLResult {
    NO = 0,
    YES = 1,
    BERRIES = 2
}

class ACLService {
    public async isAuthorized(scope: BoxScope, action: Permission): Promise<ACLResult> {
        const subscriber = await Subscriber.findOne({
            userToken: scope.userToken,
            boxToken: scope.boxToken
        })

        // Admin powers bypass everything
        if (subscriber.role === 'admin') {
            return ACLResult.YES
        }

        const box = await Box.findById(scope.boxToken).lean()

        if (box.acl[subscriber.role].includes(action)) {
            return ACLResult.YES
        } else {
            // If berries are enabled
            if (box.options.berries){
                const berriesPermissions: Array<Permission> = ['forceNext', 'forcePlay', 'skipVideo']
                return berriesPermissions.includes(action) ? ACLResult.BERRIES : ACLResult.NO
            }
        }
        return ACLResult.NO
    }
}

const aclService = new ACLService()
export default aclService
