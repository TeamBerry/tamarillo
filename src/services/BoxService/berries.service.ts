import * as Queue from 'bull'
const berriesQueue = new Queue("berries")

import { BoxScope } from "@teamberry/muscadine"
import { Subscriber } from "../../models/subscriber.model"

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
            return 50
        }

        // 1%
        if (willAdd < 0.01) {
            return 10
        }

        // 3%
        if (willAdd < 0.03) {
            return 5
        }

        return 2
    }

    public computeNaturalGain(): number {
        const willAdd = Math.random()

        // 0.05%
        if (willAdd < 0.0005) {
            return 100
        }

        // 2%
        if (willAdd < 0.02) {
            return 50
        }

        return 10
    }
}

const berriesService = new BerriesService()
export default berriesService
