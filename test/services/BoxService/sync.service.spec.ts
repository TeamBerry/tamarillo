var chai = require('chai');
const expect = chai.expect;

import SyncService from './../../../src/services/BoxService/sync.service';
const Box = require('../../../src/models/box.schema');

describe("Sync Service", () => {

    before(async () => {
        await Box.deleteMany(
            { _id: { $in: ['9cb763b6e72611381ef043e4', '9cb763b6e72611381ef043e5'] } }
        );

        await Box.create({
            _id: '9cb763b6e72611381ef043e4',
            description: null,
            lang: 'English',
            name: 'Test box',
            playlist: [],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: true
        });

        await Box.create({
            _id: '9cb763b6e72611381ef043e5',
            description: 'Closed box',
            lang: 'English',
            name: 'Closed box',
            playlist: [],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: false
        });
    });

    after(async () => {
        await Box.deleteMany(
            { _id: { $in: ['9cb763b6e72611381ef043e4', '9cb763b6e72611381ef043e5'] } }
        );
    });

    describe("Submit video to box", () => {
        it("Refuses video if the box is closed", () => {

        });

        it("Accepts the video and sends back the updated box", () => {

        })
    })
});