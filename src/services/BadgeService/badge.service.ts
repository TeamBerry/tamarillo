import * as Queue from 'bull'
import { BadgeEvent } from '../../models/badge.job'
import { Badge } from '../../models/badge.model'
import { User } from '../../models/user.model'
const badgeQueue = new Queue('badges')

class BadgeService {
    public listen() {
        console.log("Badge service initialisation...")

        badgeQueue.process((job: { data: BadgeEvent }, done: () => void) => {
            void this.handleEvent(job.data)
            done()
        })
    }

    public async handleEvent(data: BadgeEvent) {
        console.log('Handling event')
        const { subject, userToken } = data

        const possibleBadges = await Badge.find({'unlockConditions.action': subject.key}).lean()

        // If a badge matches, award it to the user
        await Promise.all(
            possibleBadges.map(async badge => {
                const { value } = badge.unlockConditions

                console.log('Possible badge: ', badge._id)

                if (typeof value === 'string') {
                    if (subject.value === value) { await this.awardBadge(badge._id, userToken) }
                } else {
                    if (subject.value >= value) { await this.awardBadge(badge._id, userToken) }
                }
            })
        )

    }

    /**
     * Awards a badge to an user. Checks beforehand if the user already
     * has the badge in their collection.
     *
     * @param {string} badgeToken The name of the badge
     * @param {string} userToken The id of the user
     * @memberof BadgeService
     */
    public async awardBadge(badgeToken: string, userToken: string) {
        const targetUser = await User.findById(userToken)

        console.log('Target user: ', targetUser)

        const targetUserBadges = targetUser.badges.map(badge => badge.badge)

        // Award badge only if user does not have it
        if (!targetUserBadges.includes(badgeToken)) {
            console.log('Awarding badge')
            targetUser.badges.push({
                badge: badgeToken,
                unlockedAt: new Date()
            })


            await targetUser.save()
        }
    }
}

const badgeService = new BadgeService()
badgeService.listen()
export default badgeService
