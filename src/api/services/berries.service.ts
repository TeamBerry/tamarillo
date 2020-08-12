import { BoxScope } from "@teamberry/muscadine"
import { Subscriber } from "../../models/subscriber.model"

class BerriesService {
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
}

const berriesService = new BerriesService()
export default berriesService
