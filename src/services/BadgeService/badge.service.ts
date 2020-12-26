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
        const { subject, userToken } = data

        // Get user and their badges
        const targetUser = await User.findById(userToken)
        const targetUserBadges = targetUser.badges.map(badge => badge.badge.toString())

        // Get badges matching the event that the user doesn't have in their collection
        const possibleBadges = await Badge.find(
            {
                'unlockConditions.key': subject.key,
                "_id": { $nin: [targetUserBadges] },
                "$and": [
                    {
                        $or: [
                            { availableFrom: null },
                            { availableFrom: {$lte: new Date()}}
                        ]
                    },
                    {
                        $or: [
                            { availableTo: null },
                            { availableTo: {$gte: new Date()}}
                        ]
                    }
                ]
            }
        ).lean()

        // Guard against the number of badges that can be awarded
        if (possibleBadges.length === 0) {
            return targetUser
        }

        // If a badge matches, award it to the user
        possibleBadges.forEach(badge => {
            if (
                (badge.unlockConditions.valueType === 'string' && subject.value === badge.unlockConditions.value)
                    || (badge.unlockConditions.valueType === 'number' && subject.value >= badge.unlockConditions.value)
            ) {
                targetUser.badges.push({
                    badge: badge._id.toString(),
                    unlockedAt: new Date()
                })
            }
        })

        return targetUser.save()
    }
}

const badgeService = new BadgeService()
badgeService.listen()
export default badgeService
