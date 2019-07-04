const Queue = require('bull');
const boxQueue = new Queue('box');

import { BoxJob } from "../models/box.job";
const BoxSchema = require('./../models/box.schema');
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
        const boxesToDelete = await this.getBoxesToDelete();

        // For each box, delete subscribers, then the box itself
        for (let box of boxesToDelete) {
            // Find and delete subscribers of the box
            await this.deleteSubscribers(box._id);

            // Delete the box
            await this.deleteBox(box._id);
        }
    }

    /**
     * Gets all the boxes to delete
     *
     * @returns
     * @memberof BoxDeletionCron
     */
    public async getBoxesToDelete() {
        const lastWeek = new Date().setDate(new Date().getDate() - 7);

        return await BoxSchema.find({ open: false, updatedAt: { $lte: lastWeek } });
    }

    /**
     * Adds a job to the box queue, that will be handled by the BoxService Microservice
     *
     * @param {string} boxToken
     * @memberof BoxDeletionCron
     */
    public async deleteSubscribers(boxToken: string) {
        const alertJob: BoxJob = { boxToken, subject: 'destroy' };
        boxQueue.add(alertJob);
    }

    /**
     * Deletes a box from the collection
     *
     * @param {string} boxToken
     * @memberof BoxDeletionCron
     */
    public async deleteBox(boxToken: string) {
        await BoxSchema.findOneAndRemove({ _id: boxToken });
    }

}

const boxDeletionCron = new BoxDeletionCron();
export default boxDeletionCron;