const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;

import syncService from './../../../src/services/BoxService/sync.service';
const Box = require('../../../src/models/box.schema');
const User = require('../../../src/models/user.model');
const Video = require('../../../src/models/video.model');

describe("Sync Service", () => {

    before(async () => {
        await Box.deleteMany(
            { _id: { $in: ['9cb763b6e72611381ef043e4', '9cb763b6e72611381ef043e5'] } }
        );

        await User.findByIdAndDelete('9ca0df5f86abeb66da97ba5d');

        await Video.findByIdAndDelete('9cb81150594b2e75f06ba8fe');

        await User.create({
            _id: '9ca0df5f86abeb66da97ba5d',
            name: 'Ash Ketchum',
            mail: 'ash@pokemon.com',
            password: 'Pikachu'
        })

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

        await Video.create({
            _id: '9cb81150594b2e75f06ba8fe',
            link: 'Ivi1e-yCPcI',
            name: 'Destroid - Annihilate'
        });
    });

    after(async () => {
        await Box.deleteMany(
            { _id: { $in: ['9cb763b6e72611381ef043e4', '9cb763b6e72611381ef043e5'] } }
        );

        await User.findByIdAndDelete('9ca0df5f86abeb66da97ba5d');

        await Video.findByIdAndDelete('9cb81150594b2e75f06ba8fe');
    });

    describe("Submit video to box", () => {
        const video = {
            _id: '9cb81150594b2e75f06ba8fe',
            link: 'Ivi1e-yCPcI',
            name: 'Destroid - Annihilate'
        };

        it("Refuses video if the box is closed", async () => {
            expect(syncService.postToBox(video, '9cb763b6e72611381ef043e5', '9ca0df5f86abeb66da97ba5d')).to.eventually.throw('This box is closed. Submission is disallowed.');
        });

        it("Accepts the video and sends back the updated box", async () => {
            const updatedBox = await syncService.postToBox(video, '9cb763b6e72611381ef043e4', '9ca0df5f86abeb66da97ba5d');

            expect(updatedBox.playlist.length).to.eql(1);
        });
    })
});