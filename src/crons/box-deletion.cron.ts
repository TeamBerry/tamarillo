const Box = require('./../models/box.schema');
const Subscriber = require('./../models/subscriber.schema');

/**
 * CRON script responsible for the deletion of box that have been closed more than 7 days ago.
 *
 * @export
 * @class BoxDeletionCron
 */
export class BoxDeletionCron {
    public async process() {
        await this.run();
    }

    private async run() {
        // Get boxes to delete
        const lastWeek = new Date().setDate(new Date().getDate() - 7);

        const boxes = Box.find({ open: false, updatedAt: { $lte: lastWeek } });

        // For each box, delete subscribers, then the box itself
        for (let box of boxes) {
            // TODO: Find and delete subscribers of the box

            // Delete the box
        }
    }

    private async getBoxesToDelete() {

    }

}