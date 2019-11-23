import * as chai from "chai"
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const expect = chai.expect
var mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

import syncService from './../../../src/services/BoxService/sync.service'
const Box = require('../../../src/models/box.model')
const User = require('../../../src/models/user.model')

import { Video, VideoClass, VideoDocument } from './../../../src/models/video.model'

describe("Sync Service", () => {

    before(async () => {
        await Box.deleteMany(
            { _id: { $in: ['9cb763b6e72611381ef043e4', '9cb763b6e72611381ef043e5', '9cb763b6e72611381ef043e6'] } }
        )

        await User.findByIdAndDelete('9ca0df5f86abeb66da97ba5d')

        await Video.deleteMany(
            { _id: { $in: ['9cb81150594b2e75f06ba8fe', '9cb81150594b2e75f06ba90a'] } }
        )

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
        })

        await Box.create({
            _id: '9cb763b6e72611381ef043e5',
            description: 'Closed box',
            lang: 'English',
            name: 'Closed box',
            playlist: [
                {
                    _id: '9cb763b6e72611381ef043e9',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: null,
                    endTime: null,
                    ignored: false,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d'
                }
            ],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: false
        })

        await Box.create({
            _id: '9cb763b6e72611381ef043e6',
            description: 'Box with a video playing',
            lang: 'English',
            name: 'Box playing',
            playlist: [
                {
                    _id: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: null,
                    ignored: false,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d'
                },
                {
                    _id: '9cb763b6e72611381ef043e8',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: null,
                    endTime: null,
                    ignored: false,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d'
                }
            ],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: true
        })

        await Video.create({
            _id: '9cb81150594b2e75f06ba8fe',
            link: 'Ivi1e-yCPcI',
            name: 'Destroid - Annihilate'
        })

        await Video.create({
            _id: '9cb81150594b2e75f06ba90a',
            link: 'j6okxJ1CYJM',
            name: 'The Piano Before Cynthia'
        })
    })

    after(async () => {
        await Box.deleteMany(
            { _id: { $in: ['9cb763b6e72611381ef043e4', '9cb763b6e72611381ef043e5', '9cb763b6e72611381ef043e6'] } }
        )

        await User.findByIdAndDelete('9ca0df5f86abeb66da97ba5d')

        await Video.deleteMany(
            { _id: { $in: ['9cb81150594b2e75f06ba8fe', '9cb81150594b2e75f06ba90a'] } }
        )
    })

    describe("Submit video to box", () => {
        const video = {
            _id: '9cb81150594b2e75f06ba8fe',
            link: 'Ivi1e-yCPcI',
            name: 'Destroid - Annihilate'
        }

        it("Refuses video if the box is closed", async () => {
            expect(syncService.postToBox(video, '9cb763b6e72611381ef043e5', '9ca0df5f86abeb66da97ba5d')).to.eventually.be.rejectedWith('This box is closed. Submission is disallowed.')
        })

        it("Accepts the video and sends back the updated box", async () => {
            const updatedBox = await syncService.postToBox(video, '9cb763b6e72611381ef043e4', '9ca0df5f86abeb66da97ba5d')

            expect(updatedBox.playlist.length).to.eql(1)
        })
    })

    describe("Remove video from box", () => {
        it("Refuses video if the box is closed", async () => {
            const args = {
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba5d',
                playlistItem: '9cb763b6e72611381ef043e9'
            }

            const result = syncService.onVideoCancel(args)

            expect(result).to.be.rejectedWith("The box is closed. The playlist cannot be modified.")
        })

        it("Removes the video from the playlist", async () => {
            const args = {
                boxToken: '9cb763b6e72611381ef043e6',
                userToken: '9ca0df5f86abeb66da97ba5d',
                playlistItem: '9cb763b6e72611381ef043e8'
            }

            await syncService.onVideoCancel(args)

            const box = await Box.findById('9cb763b6e72611381ef043e6')

            expect(box.playlist).to.have.lengthOf(1)
        })
    })

    describe("Get current video", () => {
        it("Returns null when there's no currently playing video", async () => {
            const currentVideo = await syncService.getCurrentVideo('9cb763b6e72611381ef043e4')

            expect(currentVideo).to.equal(null)
        })

        it("Throws an error if the box is closed", async () => {
            expect(syncService.getCurrentVideo('9cb763b6e72611381ef043e5')).to.eventually.be.rejectedWith('This box is closed. Video play is disabled.')
        })

        it("Returns the currently playing video", async () => {
            const video = {
                _id: new ObjectId('9cb763b6e72611381ef043e7'),
                video: {
                    _id: new ObjectId('9cb81150594b2e75f06ba90a'),
                    link: 'j6okxJ1CYJM',
                    name: 'The Piano Before Cynthia',
                },
                startTime: new Date("2019-05-31T09:19:44+0000"),
                endTime: null,
                ignored: false,
                submittedAt: new Date("2019-05-31T09:19:41+0000"),
                submitted_by: {
                    _id: new ObjectId('9ca0df5f86abeb66da97ba5d'),
                    name: 'Ash Ketchum'
                }
            }

            const currentVideo = await syncService.getCurrentVideo('9cb763b6e72611381ef043e6')

            expect(currentVideo).to.eql(video)
        })
    })
})