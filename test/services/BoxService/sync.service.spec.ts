import * as chai from "chai"
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const expect = chai.expect
var mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId
import * as _ from 'lodash'

import syncService from './../../../src/services/BoxService/sync.service'
const Box = require('../../../src/models/box.model')
const User = require('../../../src/models/user.model')

import { Video, VideoClass, VideoDocument } from './../../../src/models/video.model'
import { CancelPayload } from "../../../src/models/video-payload.model"

describe("Sync Service", () => {

    before(async () => {
        await Box.deleteMany({})
        await User.findByIdAndDelete('9ca0df5f86abeb66da97ba5d')
        await Video.deleteMany({})

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
            open: false,
            options: {
                random: true
            }
        })

        await Box.create({
            _id: '9cb763b6e72611381ef043e6',
            description: 'Box with a video playing',
            lang: 'English',
            name: 'Box playing',
            playlist: [
                {
                    _id: '9cb763b6e72611381ef043e8',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: null,
                    endTime: null,
                    ignored: false,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d'
                },
                {
                    _id: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: null,
                    ignored: false,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d'
                }
            ],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: true
        })

        await Box.create({
            _id: '9cb763b6e72611381ef043e7',
            description: 'Box with a video playing',
            lang: 'English',
            name: 'Box playing in random mode',
            playlist: [
                {
                    _id: '9cb763b6e72611381ef043f4',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    ignored: false,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d'
                },
                {
                    _id: '9cb763b6e72611381ef043f3',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    ignored: false,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d'
                },
                {
                    _id: '9cb763b6e72611381ef043f2',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    ignored: false,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d'
                },
                {
                    _id: '9cb763b6e72611381ef043f1',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    ignored: false,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d'
                },
                {
                    _id: '9cb763b6e72611381ef043f0',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    ignored: false,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d'
                }
            ],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: true,
            options: {
                random: true
            }
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

        await Video.create({
            _id: '9cb81150594b2e75f06ba90b',
            link: 'SeSOzTr_yfA',
            name: 'The Evil King'
        })

        await Video.create({
            _id: '9cb81150594b2e75f06ba90c',
            link: '0he85BszwL8',
            name: 'Connected'
        })
    })

    after(async () => {
        await Box.deleteMany({})
        await User.findByIdAndDelete('9ca0df5f86abeb66da97ba5d')
        await Video.deleteMany({})
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
            const cancelPayload: CancelPayload = {
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043e9'
            }

            const result = syncService.onVideoCancel(cancelPayload)

            expect(result).to.be.rejectedWith("The box is closed. The playlist cannot be modified.")
        })

        it("Removes the video from the playlist", async () => {
            const cancelPayload: CancelPayload = {
                boxToken: '9cb763b6e72611381ef043e6',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043e8'
            }

            await syncService.onVideoCancel(cancelPayload)

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

    describe("Get next video", () => {
        it("Sends null if there's no next video", async () => {
            const response = await syncService.getNextVideo('9cb763b6e72611381ef043e4')

            expect(response).to.equal(null)
        })

        it("Get the next video if no video just ended", async () => {
            const response = await syncService.getNextVideo('9cb763b6e72611381ef043e6')

            expect(response.nextVideo._id.toString()).to.equal('9cb763b6e72611381ef043e8')
        })

        it("Get next video when no video was playing before", async () => {
            const response = await syncService.getNextVideo('9cb763b6e72611381ef043e5')

            expect(response.nextVideo._id.toString()).to.equal('9cb763b6e72611381ef043e9')
        })

        it("Gets the next video in random mode", async () => {
            const response = await syncService.getNextVideo('9cb763b6e72611381ef043e7')

            const box = await Box.findById('9cb763b6e72611381ef043e7')

            const possibleVideos = ['9cb763b6e72611381ef043f4', '9cb763b6e72611381ef043f3', '9cb763b6e72611381ef043f2']

            expect(possibleVideos.indexOf(response.nextVideo._id.toString())).to.not.equal(-1)

            const playingIndex = _.findIndex(box.playlist, (video) => video.startTime !== null && video.endTime === null)

            expect(playingIndex).to.equal(2)
        })
    })
})