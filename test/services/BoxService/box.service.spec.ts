import * as chai from "chai";
const expect = chai.expect;

import boxService from './../../../src/services/BoxService/box.service';

describe("Box Service", () => {

    const Subscriber = require('./../../../src/models/subscriber.schema');

    describe("Removes subcribers from the box", () => {
        before(async () => {
            await Subscriber.create({
                _id: '9d1dde9a3fbd2c1146d694d4',
                origin: 'BERRYBOX PNEUMA',
                boxToken: '9cb763b6e72611381ef043e4',
                userToken: '9ca0df5f86abeb66da97ba5d',
                socket: 'r9jBIR9FBhZ2CeMPAAAA'
            });
        });

        after(async () => {
            await Subscriber.deleteMany(
                {
                    _id: {
                        $in: ['9d1dde9a3fbd2c1146d694d4']
                    }
                }
            );
        });

        it("Removes subscribers from the box", async () => {
            await boxService.removeSubscribers('9cb763b6e72611381ef043e4');

            const subscribers = await Subscriber.find({ boxToken: '9cb763b6e72611381ef043e4' });

            expect(subscribers).to.be.empty;
        });
    });
})