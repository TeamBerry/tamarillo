import { RoleChangeRequest } from "../../models/role-change.model"
import { Subscriber, PopulatedSubscriberDocument } from "../../models/subscriber.model"
import { FeedbackMessage } from "@teamberry/muscadine"
const Box = require("../../models/box.model")

class ACLService {
    public async isAuthorized(user, action: string) {

    }

    // Step 1: update the role of the target subscriber
    public async onRoleChangeRequested(request: RoleChangeRequest): Promise<[FeedbackMessage, FeedbackMessage]> {
        const target: PopulatedSubscriberDocument = await Subscriber
            .findOne(
                {
                    userToken: request.scope.userToken,
                    boxToken: request.scope.boxToken
                }
            )
            .populate('userToken', 'name', 'User')
            .lean()

        if (!target) {
            throw new Error("The user you want to act on is not part of your community for that box.")
        }

        const source: PopulatedSubscriberDocument = await Subscriber
            .findOne(
                {
                    userToken: request.source,
                    boxToken: request.scope.boxToken
                }
            )
            .populate('userToken', 'name', 'User')
            .lean()

        const box = await Box.findById(request.scope.boxToken).lean()

        if (request.scope.userToken.toString() === box.creator.toString()) {
            throw new Error("You cannot change the role of the box creator.")
        }

        if (source.role !== request.scope.userToken && request.role === 'moderator') {
            throw new Error("Only the box creator can promote moderators.")
        }

        if (source.role !== request.scope.userToken && target.role === 'moderator') {
            throw new Error("Only the box creator can demote moderators.")
        }

        let feedbackForSource: FeedbackMessage
        let feedbackForTarget: FeedbackMessage

        if (
            (request.role === 'moderator' && (target.role === 'vip' || target.role === 'simple'))
            || (request.role === 'vip' && (target.role === 'simple'))
        ) {
            feedbackForSource = new FeedbackMessage({
                context: 'success',
                contents: `${target.userToken.name} is now one of your ${request.role === 'vip' ? 'VIPs' : 'Moderators'} on this box.`
            })
            feedbackForTarget = new FeedbackMessage({
                context: 'success',
                contents: `${source.userToken.name} promoted you to ${request.role === 'vip' ? 'VIP' : 'Moderator'}! Your new privileges will appear in a few moments.`
            })
        } else {
            feedbackForSource = new FeedbackMessage({
                context: 'success',
                contents: `${target.userToken.name} is no longer one of your ${request.role === 'vip' ? 'VIPs' : 'Moderators'} on this box.`
            })
            feedbackForTarget = new FeedbackMessage({
                context: 'info',
                contents: `${source.userToken.name} promoted you to ${request.role === 'vip' ? 'VIP' : 'Moderator'}! Your new privileges will appear in a few moments.`
            })
        }


        return [feedbackForSource, feedbackForTarget]
    }
}

const aclService = new ACLService()
export default aclService