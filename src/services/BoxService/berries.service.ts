import * as Queue from 'bull'
const berriesQueue = new Queue("berries")
const badgeQueue = new Queue("badges")

import { BoxScope } from "@teamberry/muscadine"
import { Subscriber } from "../../models/subscriber.model"
import { BadgeEvent } from '../../models/badge.job'

class BerriesService {
    public startNaturalIncrease(scope: BoxScope) {
        const amount = this.computeNaturalGain()

        berriesQueue.add(
            { scope, amount },
            {
                priority: 1,
                // 5 minutes
                delay: 5 * 60 * 1000,
                removeOnComplete: true
            }
        )
    }

    public async stopNaturalIncrease(scope: BoxScope) {
        const jobs = await berriesQueue.getJobs(['delayed'])

        jobs.map((job: Queue.Job) => {
            if (job.data.scope.boxToken === scope.boxToken && job.data.scope.userToken === scope.userToken) {
                job.remove()
            }
        })
    }

    /**
     * Adds berries to a subscriber scope (userToken + boxToken)
     *
     * @param {BoxScope} scope
     * @param {number} [amount]
     * @returns {Promise<number>}
     * @memberof BerriesService
     */
    public async increaseBerryCount(scope: BoxScope, amount?: number): Promise<number> {
        const amountToAdd = amount ?? this.computeBerriesGain()

        const updatedSubscription = await Subscriber.findOneAndUpdate(
            { userToken: scope.userToken, boxToken: scope.boxToken },
            { $inc: { berries: amountToAdd } },
            { new: true }
        )

        // Send event for badge listener
        badgeQueue.add({
            userToken: scope.userToken,
            subject: {
                key: 'subscription.berries',
                value: updatedSubscription.berries
            }
        } as BadgeEvent,
        {
            attempts: 5,
            removeOnComplete: true
        })

        return updatedSubscription.berries
    }

    /**
     * Removes berries from a subscriber scope (userToken + boxToken)
     *
     * @param {BoxScope} scope
     * @param {number} amount
     * @returns {Promise<number>}
     * @memberof BerriesService
     */
    public async decreaseBerryCount(scope: BoxScope, amount: number): Promise<number> {
        const updatedSubscription = await Subscriber.findOneAndUpdate(
            { userToken: scope.userToken, boxToken: scope.boxToken },
            { $inc: { berries: -amount } },
            { new: true }
        )

        return updatedSubscription.berries
    }

    public computeBerriesGain(): number {
        const willAdd = Math.random()

        // 0.05%
        if (willAdd < 0.0005) {
            return 6
        }

        // 1%
        if (willAdd < 0.01) {
            return 2
        }

        // 25%
        if (willAdd < 0.25) {
            return 1
        }

        return 0
    }

    public computeNaturalGain(): number {
        const willAdd = Math.random()

        // 0.05%
        if (willAdd < 0.0005) {
            return 8
        }

        // 2%
        if (willAdd < 0.02) {
            return 3
        }

        return 1
    }
}

const berriesService = new BerriesService()
export default berriesService
