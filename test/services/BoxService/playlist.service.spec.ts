import * as chai from "chai"
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const expect = chai.expect
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId
import * as _ from 'lodash'

import playlistService from '../../../src/services/BoxService/playlist.service'
const Box = require('../../../src/models/box.model')
const User = require('../../../src/models/user.model')

import { PlaylistItemCancelRequest } from '@teamberry/muscadine'
import { Video } from '../../../src/models/video.model'

describe("Playlist Service", () => {

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
            open: true,
            options: {
                random: true,
                refresh: false
            }
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
                random: true,
                refresh: false
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
            open: true,
            options: {
                random: false,
                refresh: false
            }
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
                random: true,
                refresh: true
            }
        })

        await Video.create([
            {
                _id: '9cb81150594b2e75f06ba8fe',
                link: 'Ivi1e-yCPcI',
                name: 'Destroid - Annihilate'
            },
            {
                _id: '9cb81150594b2e75f06ba900',
                link: '6OmwKZ9r07o',
                name: 'ODDS&ENDS',
            },
            {
                _id: '9cb81150594b2e75f06ba90a',
                link: 'j6okxJ1CYJM',
                name: 'The Piano Before Cynthia'
            },
            {
                _id: '9cb81150594b2e75f06ba90b',
                link: 'SeSOzTr_yfA',
                name: 'The Evil King'
            },
            {
                _id: '9cb81150594b2e75f06ba90c',
                link: '0he85BszwL8',
                name: 'Connected'
            },
            {
                _id: '9cb81150594b2e75f06ba90d',
                link: 'Kn8Vs_kKQMc',
                name: 'Sand Planet'
            },
            {
                _id: '9cb81150594b2e75f06ba90e',
                link: 'AvTH7J2shuI',
                name: 'Two-Faced lovers'
            },
            {
                _id: '9cb81150594b2e75f06ba90f',
                link: 'UC_qla6FQwM',
                name: 'Hibikase'
            },
            {
                _id: '9cb81150594b2e75f06ba910',
                link: 'Z4LiNMCTV20',
                name: 'Hyper Reality Show'
            },
            {
                _id: '9cb81150594b2e75f06ba911',
                link: 'hxSg2Ioz3LM',
                name: 'Hibana'
            },
            {
                _id: '9cb81150594b2e75f06ba912',
                link: 'uMlv9VWAxko',
                name: 'Unhappy Refrain'
            },
            {
                _id: '9cb81150594b2e75f06ba913',
                link: 'aCxGqtDoB04',
                name: 'Peace Sign'
            },
            {
                _id: '9cb81150594b2e75f06ba914',
                link: 'bmkY2yc1K7Q',
                name: 'Te wo'
            },
            {
                _id: '9cb81150594b2e75f06ba915',
                link: 'ZB75e7vzX0I',
                name: `World's End Dancehall`
            }
        ])
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
            expect(playlistService.addVideoToPlaylist(video, '9cb763b6e72611381ef043e5', '9ca0df5f86abeb66da97ba5d')).to.eventually.be.rejectedWith('This box is closed. Submission is disallowed.')
        })

        it("Accepts the video and sends back the updated box", async () => {
            const updatedBox = await playlistService.addVideoToPlaylist(video, '9cb763b6e72611381ef043e4', '9ca0df5f86abeb66da97ba5d')

            expect(updatedBox.playlist.length).to.eql(1)
        })
    })

    describe("Remove video from box", () => {
        it("Refuses video if the box is closed", async () => {
            const cancelPayload: PlaylistItemCancelRequest = {
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043e9'
            }

            const result = playlistService.onVideoCancelled(cancelPayload)

            expect(result).to.be.rejectedWith("The box is closed. The playlist cannot be modified.")
        })

        it("Removes the video from the playlist", async () => {
            const cancelPayload: PlaylistItemCancelRequest = {
                boxToken: '9cb763b6e72611381ef043e6',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043e8'
            }

            await playlistService.onVideoCancelled(cancelPayload)

            const box = await Box.findById('9cb763b6e72611381ef043e6')

            expect(box.playlist).to.have.lengthOf(1)
        })
    })

    describe("Get current video", () => {
        it("Returns null when there's no currently playing video", async () => {
            const currentVideo = await playlistService.getCurrentVideo('9cb763b6e72611381ef043e4')

            expect(currentVideo).to.equal(null)
        })

        it("Throws an error if the box is closed", async () => {
            expect(playlistService.getCurrentVideo('9cb763b6e72611381ef043e5')).to.eventually.be.rejectedWith('This box is closed. Video play is disabled.')
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

            const currentVideo = await playlistService.getCurrentVideo('9cb763b6e72611381ef043e6')

            expect(currentVideo).to.eql(video)
        })
    })

    describe("Get next video", () => {
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

        it("Sends null if there's no next video", async () => {
            const response = await playlistService.getNextVideo('9cb763b6e72611381ef043e4')

            expect(response.nextVideo).to.equal(null)
        })

        it("Get the next video if no video just ended", async () => {
            const response = await playlistService.getNextVideo('9cb763b6e72611381ef043e6')

            expect(response.nextVideo._id.toString()).to.equal('9cb763b6e72611381ef043e8')
        })

        it("Get next video when no video was playing before", async () => {
            const response = await playlistService.getNextVideo('9cb763b6e72611381ef043e5')

            expect(response.nextVideo._id.toString()).to.equal('9cb763b6e72611381ef043e9')
        })

        it("Gets the next video in random mode", async () => {
            const response = await playlistService.getNextVideo('9cb763b6e72611381ef043e7')

            const box = await Box.findById('9cb763b6e72611381ef043e7')

            const possibleVideos = ['9cb763b6e72611381ef043f4', '9cb763b6e72611381ef043f3', '9cb763b6e72611381ef043f2']

            expect(possibleVideos.indexOf(response.nextVideo._id.toString())).to.not.equal(-1)

            const playingIndex = _.findIndex(box.playlist, (video) => video.startTime !== null && video.endTime === null)

            expect(playingIndex).to.equal(2)
        })
    })

    describe("Loop Mode", () => {
        it("Loops the playlist when no more videos are upcoming", async () => {
            const box = await Box.create({
                _id: '9cb763b6e72611381ef043e8',
                description: null,
                lang: 'English',
                name: 'Box with 5 upcoming videos and 12 different played videos',
                playlist: [
                    {
                        _id: '9cb763b6e72611381ef04400',
                        video: '9cb81150594b2e75f06ba913',
                        startTime: "2019-05-31T09:34:03+0000",
                        endTime: "2019-05-31T09:37:43+0000",
                        ignored: false,
                        submittedAt: "2019-05-31T09:19:45+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    },
                    {
                        _id: '9cb763b6e72611381ef04401',
                        video: '9cb81150594b2e75f06ba910',
                        startTime: "2019-05-31T09:28:11+0000",
                        endTime: "2019-05-31T09:34:03+0000",
                        ignored: false,
                        submittedAt: "2019-05-31T09:19:44+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    },
                    {
                        _id: '9cb763b6e72611381ef04402',
                        video: '9cb81150594b2e75f06ba914',
                        startTime: "2019-05-31T09:25:36+0000",
                        endTime: "2019-05-31T09:28:11+0000",
                        ignored: false,
                        submittedAt: "2019-05-31T09:19:43+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    },
                    {
                        _id: '9cb763b6e72611381ef04403',
                        video: '9cb81150594b2e75f06ba8fe',
                        startTime: "2019-05-31T09:23:12+0000",
                        endTime: "2019-05-31T09:25:36+0000",
                        ignored: false,
                        submittedAt: "2019-05-31T09:19:42+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    },
                    {
                        _id: '9cb763b6e72611381ef04404',
                        video: '9cb81150594b2e75f06ba90c',
                        startTime: "2019-05-31T09:19:41+0000",
                        endTime: "2019-05-31T09:23:12+0000",
                        ignored: false,
                        submittedAt: "2019-05-31T09:19:41+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    }
                ],
                creator: '9ca0df5f86abeb66da97ba5d',
                open: true,
                options: {
                    random: true,
                    refresh: false
                }
            })

            const updatedPlaylist = await playlistService.loopPlaylist(box)

            expect(updatedPlaylist).to.have.lengthOf(5)

            // UPCOMING
            expect(updatedPlaylist[0].video.toString()).to.equal('9cb81150594b2e75f06ba913')
            expect(updatedPlaylist[1].video.toString()).to.equal('9cb81150594b2e75f06ba910')
            expect(updatedPlaylist[2].video.toString()).to.equal('9cb81150594b2e75f06ba914')
            expect(updatedPlaylist[3].video.toString()).to.equal('9cb81150594b2e75f06ba8fe')
            expect(updatedPlaylist[4].video.toString()).to.equal('9cb81150594b2e75f06ba90c')
        })
    })
})