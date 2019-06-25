import * as chai from "chai";
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
var mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const Box = require('./../../src/models/box.schema');

import boxDeletionCron from './../../src/crons/box-deletion.cron';

describe("Box Deletion CRON", () => {
    before(async () => {
        const now = new Date();
        const yesterday = new Date().setDate(now.getDate() - 1);
        const aLongTimeAgo = new Date().setDate(now.getDate() - 30);

        await Box.deleteMany(
            {
                _id: {
                    $in: ['9cb763b6e72611381ef043e5', '9cb763b6e72611381ef043e6', '9cb763b6e72611381ef043e7']
                }
            }
        );

        await Box.create({
            _id: '9cb763b6e72611381ef043e5',
            description: 'Closed box',
            lang: 'English',
            name: 'Closed box too young to be deleted',
            playlist: [],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: false,
            updatedAt: yesterday
        });

        await Box.create({
            _id: '9cb763b6e72611381ef043e6',
            description: 'Open box to delete',
            lang: 'English',
            name: 'Open box to delete',
            playlist: [],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: true,
            updatedAt: now
        });

        const closedBoxToDelete = await Box.create(
            {
                _id: '9cb763b6e72611381ef043e7',
                description: 'Closed box to delete',
                lang: 'English',
                name: 'Closed box to delete',
                playlist: [],
                creator: '9ca0df5f86abeb66da97ba5d',
                open: false,
            }
        );
        closedBoxToDelete.set({
            createdAt: new Date('2019-06-01'),
            updatedAt: new Date('2019-06-01')
        });
        // TODO: Manipulate updatedAt :(
        await closedBoxToDelete.save({
            validateBeforeSave: false
        });
    });

    after(async () => {
        // await Box.deleteMany(
        //     {
        //         _id: {
        //             $in: ['9cb763b6e72611381ef043e5', '9cb763b6e72611381ef043e6', '9cb763b6e72611381ef043e7']
        //         }
        //     }
        // );
    });

    it("Find boxes to delete", async () => {
        const boxesToDelete = await boxDeletionCron.getBoxesToDelete();

        expect(boxesToDelete).to.have.lengthOf(1);
        expect(boxesToDelete[0]._id).to.equal('9cb763b6e72611381ef043e7');
    });

    // describe("Deletes a box", () => {
    //     it("Deletes all subscribers for a box", () => {

    //     });

    //     it("Effectively deletes a box", () => {

    //     })
    // });
})