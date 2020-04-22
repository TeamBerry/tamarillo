import { BoxScope } from "@teamberry/muscadine"
import { Subscriber } from "../../models/subscriber.model"

class BerriesService {
    public async increaseBerryCount(scope: BoxScope, amount?: number): Promise<number> {
        const amountToAdd = amount ?? this.computeBerriesGain()

        const updatedSubscription = await Subscriber.findOneAndUpdate(
            { userToken: scope.userToken, boxToken: scope.boxToken },
            { $inc: { berries: amountToAdd } },
            { new: true }
        )

        return updatedSubscription.berries
    }

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
            return 20
        }

        // 3%
        if (willAdd < 0.03) {
            return 10
        }

        return 5
    }
}

const berriesService = new BerriesService()
export default berriesService
