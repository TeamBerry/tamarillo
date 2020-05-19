import * as chai from "chai"
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const expect = chai.expect
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId
import * as _ from 'lodash'

import queueService from '../../../src/services/BoxService/queue.service'
const Box = require('../../../src/models/box.model')

import { QueueItemActionRequest, BoxScope } from '@teamberry/muscadine'
import { Video } from '../../../src/models/video.model'
import { UserPlaylist, UserPlaylistDocument } from "../../../src/models/user-playlist.model"
import { Subscriber } from "../../../src/models/subscriber.model"
import { User } from "../../../src/models/user.model"

describe("Queue Service", () => {

    before(async () => {
        await Box.deleteMany({})
        await User.deleteMany({})
        await Video.deleteMany({})
        await UserPlaylist.deleteMany({})
        await Subscriber.deleteMany({})

        await User.create([
            {
                _id: '9ca0df5f86abeb66da97ba5d',
                name: 'Ash Ketchum',
                mail: 'ash@pokemon.com',
                password: 'Pikachu'
            },
            {
                _id: '9ca0df5f86abeb66da97ba5e',
                name: 'Shirona',
                mail: 'shirona@pokemon.com',
                password: 'Piano'
            },
            {
                _id: '9ca0df5f86abeb66da97ba5f',
                name: 'Brock',
                mail: 'brock@pokemon.com',
                password: 'Joel'
            }
        ])

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
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false
                }
            ],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: false,
            options: {
                random: true,
                refresh: false
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
        await User.deleteMany({})
        await Video.deleteMany({})
        await UserPlaylist.deleteMany({})
        await Subscriber.deleteMany({})
    })

    describe("Submit video to box", () => {
        before(async () => {
            await Box.create([
                {
                    _id: '9cb763b6e72611381ef043e4',
                    description: null,
                    lang: 'English',
                    name: 'Box with empty playlist',
                    playlist: [],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: false,
                        berries: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ef053f4',
                    description: null,
                    lang: 'English',
                    name: 'Box with a video already added to it',
                    playlist: [
                        {
                            isPreselected: false,
                            stateForcedWithBerries: false,
                            _id: '9cb763b6e72611381ef04401',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: '2020-04-23T15:50:31.921Z',
                            endTime: null,
                            submittedAt: '2020-04-23T15:50:30.896Z',
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: true,
                        berries: true
                    }
                }
            ])
        })

        after(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e4')
            await Box.findByIdAndDelete('9cb763b6e72611381ef053f4')
        })

        const video = {
            _id: '9cb81150594b2e75f06ba8fe',
            link: 'Ivi1e-yCPcI',
            name: 'Destroid - Annihilate',
        }

        // On Video submission
        it("Refuses the submission if the video does not exist", async () => {
            try {
                await queueService.onVideoSubmitted({ link: 'notFound', userToken: '9ca0df5f86abeb66da97ba5d', boxToken: '9cb763b6e72611381ef043e4' })
            } catch (error) {
                expect(error.message).to.equal("The link does not match any video.")
            }
        })

        // Add video to queue
        it("Refuses video if the box is closed", async () => {
            try {
                await queueService.addVideoToQueue(video, '9cb763b6e72611381ef043e5', '9ca0df5f86abeb66da97ba5d')
            } catch (error) {
                expect(error.message).to.equal('This box is closed. Submission is disallowed.')
            }
        })

        it('Accepts the video even if it already is in the queue, without adding it', async () => {
            const updatedBox = await queueService.addVideoToQueue(video, '9cb763b6e72611381ef053f4', '9ca0df5f86abeb66da97ba5d')

            expect(updatedBox.playlist).to.length(1)

            const updatedBoxAgain = await queueService.addVideoToQueue(video, '9cb763b6e72611381ef053f4', '9ca0df5f86abeb66da97ba5d')
            expect(updatedBoxAgain.playlist).to.length(1)
        })

        it("Accepts the video and sends back the updated box", async () => {
            const updatedBox = await queueService.addVideoToQueue(video, '9cb763b6e72611381ef043e4', '9ca0df5f86abeb66da97ba5d')

            expect(updatedBox.playlist.length).to.eql(1)
        })

        // Feedback
        it("Sends message with user name if user exists", async () => {
            const { feedback, updatedBox } = await queueService.onVideoSubmitted({ link: 'Ivi1e-yCPcI', userToken: '9ca0df5f86abeb66da97ba5d', boxToken: '9cb763b6e72611381ef043e4' })

            expect(feedback.contents).to.equal(`Ash Ketchum has added the video "Destroid - Annihilate" to the queue.`)
        })

        it("Sends generic message if the submitter is the system (no user given)", async () => {
            const { feedback, updatedBox } = await queueService.onVideoSubmitted({ link: 'Ivi1e-yCPcI', userToken: null, boxToken: '9cb763b6e72611381ef043e4' })

            expect(feedback.contents).to.equal(`The video "Destroid - Annihilate" has been added to the queue.`)
        })
    })

    describe("Submit playlist to the box", () => {
        before(async () => {
            await Box.create([
                {
                    _id: '9cb763b6e72611381ef043e4',
                    description: null,
                    lang: 'English',
                    name: 'Box with empty queue',
                    playlist: [],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        refresh: false
                    }
                },
                {
                    _id: '9cb763b6e72611381ef043e8',
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
                }
            ])

            await UserPlaylist.create({
                _id: "8da1e01fda34eb8c1b9db46e",
                name: "Favorites",
                isPrivate: false,
                user: "9ca0df5f86abeb66da97ba5d",
                videos: ['9cb81150594b2e75f06ba8fe', '9cb81150594b2e75f06ba914', '9cb81150594b2e75f06ba912'],
                isDeletable: false
            })
        })

        after(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e4')
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e8')
            await UserPlaylist.deleteMany({})
        })

        it("Refuses playlist if the playlist does not exist", async () => {
            try {
                await queueService.onPlaylistSubmitted({ playlistId: '9da1e01fda34eb8c1b9db46e', boxToken: '9cb763b6e72611381ef043e4', userToken: '9ca0df5f86abeb66da97ba5d' })
            } catch (error) {
                expect(error.message).to.equal("The playlist could not be found. The submission has been rejected.")
            }
        })

        it("Refuses playlist if the user does not exist", async () => {
            try {
                await queueService.onPlaylistSubmitted({ playlistId: '8da1e01fda34eb8c1b9db46e', boxToken: '9cb763b6e72611381ef043e4', userToken: '8ca0df5f86abeb66da97ba5d' })
            } catch (error) {
                expect(error.message).to.equal("No user was found. The submission has been rejected.")
            }
        })

        // Add Playlist to Queue
        it("Refuses playlist if the box is closed", async () => {
            const userPlaylist: UserPlaylistDocument = await UserPlaylist.findById('8da1e01fda34eb8c1b9db46e')
            try {
                await queueService.addPlaylistToQueue(userPlaylist, '9cb763b6e72611381ef043e5', '9ca0df5f86abeb66da97ba5d')
            } catch (error) {
                expect(error.message).to.equal("This box is closed. Submission is disallowed.")
            }
        })

        it("Accepts playlist and sends back the updated box", async () => {
            const userPlaylist: UserPlaylistDocument = await UserPlaylist.findById('8da1e01fda34eb8c1b9db46e')
            const updatedBox = await queueService.addPlaylistToQueue(userPlaylist, '9cb763b6e72611381ef043e8', '9ca0df5f86abeb66da97ba5d')

            expect(updatedBox.playlist.length).to.equal(3)
        })
    })

    describe("Remove video from box", () => {
        before(async () => {
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
                        submittedAt: "2019-05-31T09:19:41+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d',
                        isPreselected: false
                    },
                    {
                        _id: '9cb763b6e72611381ef043e7',
                        video: '9cb81150594b2e75f06ba90a',
                        startTime: "2019-05-31T09:19:44+0000",
                        endTime: null,
                        submittedAt: "2019-05-31T09:19:41+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d',
                        isPreselected: false
                    }
                ],
                creator: '9ca0df5f86abeb66da97ba5d',
                open: true,
                options: {
                    random: false,
                    refresh: false
                }
            })
        })

        after(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e6')
        })

        it("Refuses video if the box is closed", async () => {
            const cancelPayload: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043e9'
            }

            try {
                await queueService.onVideoCancelled(cancelPayload)
            } catch (error) {
                expect(error.message).to.equal("The box is closed. The queue cannot be modified.")

            }

        })

        it("Removes the video from the queue", async () => {
            const cancelPayload: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e6',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043e8'
            }

            const { feedback, updatedBox } = await queueService.onVideoCancelled(cancelPayload)

            const box = await Box.findById('9cb763b6e72611381ef043e6')

            expect(box.playlist).to.have.lengthOf(1)
            expect(feedback.contents).to.equal('Ash Ketchum has removed the video "The Piano Before Cynthia" from the queue.')
        })
    })

    describe('Preselect a video', () => {
        before(async () => {
            await Subscriber.create([
                {
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 0
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 7
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef143e7',
                    connexions: [],
                    berries: 11
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef243e7',
                    connexions: [],
                    berries: 78
                }
            ])
        })

        after(async () => {
            await Subscriber.deleteMany({})
        })

        beforeEach(async () => {
            await Box.create([
                {
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
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef043f3',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef043f2',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef043f1',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef043f0',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: "2019-05-31T09:19:44+0000",
                            endTime: "2019-05-31T09:21:12+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        refresh: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ef143e7',
                    description: 'Box with a video playing',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    playlist: [
                        {
                            _id: '9cb763b6e72611381ef143f4',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef143f3',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef143f2',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef143f1',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef143f0',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: "2019-05-31T09:19:44+0000",
                            endTime: "2019-05-31T09:21:12+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        refresh: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ef243e7',
                    description: 'Box with a video playing and a preselected video with berries',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    playlist: [
                        {
                            _id: '9cb763b6e72611381ef243f4',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: false
                        },
                        {
                            _id: '9cb763b6e72611381ef243f3',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: true,
                            stateForcedWithBerries: true
                        },
                        {
                            _id: '9cb763b6e72611381ef243f2',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: false
                        },
                        {
                            _id: '9cb763b6e72611381ef243f1',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: false
                        },
                        {
                            _id: '9cb763b6e72611381ef243f0',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: "2019-05-31T09:19:44+0000",
                            endTime: "2019-05-31T09:21:12+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: false
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        refresh: true
                    }
                }
            ])
        })

        afterEach(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef143e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef243e7')
        })

        it('Refuses the order if the box is closed', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043e9'
            }

            try {
                await queueService.onVideoPreselected(preselectRequest)
            } catch (error) {
                expect(error.message).to.equal("The box is closed. The queue cannot be modified.")
            }
        })

        it('Refuses if the video does not exist in the queue', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '8cb763b6e72611381ef043f4'
            }

            try {
                await queueService.onVideoPreselected(preselectRequest)
            } catch (error) {
                expect(error.message).to.equal("The video you selected could not be found.")
            }
        })

        it('Refuses if the video is playing', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f1'
            }

            try {
                await queueService.onVideoPreselected(preselectRequest)
            } catch (error) {
                expect(error.message).to.equal("The video you selected is currently playing.")
            }
        })

        it('Refuses if the video has been played', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f0'
            }

            try {
                await queueService.onVideoPreselected(preselectRequest)
            } catch (error) {
                expect(error.message).to.equal("The video you selected has already been played.")
            }
        })

        it('Refuses if the non-admin user does not have enough berries', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5e',
                item: '9cb763b6e72611381ef043f4'
            }

            try {
                await queueService.onVideoPreselected(preselectRequest)
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal("You do not have enough berries to use this action. You need 3 more.")
            }
        })

        it('Refuses if there is another video already preselected with berries', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef243e7',
                userToken: '9ca0df5f86abeb66da97ba5f',
                item: '9cb763b6e72611381ef243f4'
            }

            try {
                await queueService.onVideoPreselected(preselectRequest)
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal("Another video has already been preselected with berries. You cannot overwrite the preselected video.")
            }
        })

        it('Accepts the non-admin requests and subtracts the amount of berries', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef143e7',
                userToken: '9ca0df5f86abeb66da97ba5f',
                item: '9cb763b6e72611381ef143f4'
            }

            const result = await queueService.onVideoPreselected(preselectRequest)

            const box = await Box.findById('9cb763b6e72611381ef143e7')

            const preselectedVideo = box.playlist.find(video => video._id.toString() === '9cb763b6e72611381ef143f4')

            const targetSubscription = await Subscriber.findOne({ userToken: '9ca0df5f86abeb66da97ba5f', boxToken: '9cb763b6e72611381ef143e7' })

            expect(targetSubscription.berries).to.equal(1)
            expect(preselectedVideo.isPreselected).to.equal(true)
            expect(result.feedback.contents).to.equal(`Brock has spent 10 berries to preselect the video "Connected". It will be the next video to play.`)
        })

        it('Preselects a video if no other video is preselected', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f4'
            }

            const result = await queueService.onVideoPreselected(preselectRequest)

            const box = await Box.findById('9cb763b6e72611381ef043e7')

            const preselectedVideo = box.playlist.find(video => video._id.toString() === '9cb763b6e72611381ef043f4')

            expect(preselectedVideo.isPreselected).to.equal(true)
            expect(result.feedback.contents).to.equal(`Ash Ketchum has preselected the video "Connected". It will be the next video to play.`)
        })

        it('Preselects a video and unselects the preselected one if it is different', async () => {
            await queueService.onVideoPreselected({
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f4'
            })

            await queueService.onVideoPreselected({
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f3'
            })

            const box = await Box.findById('9cb763b6e72611381ef043e7')

            const previousSelectedVideo = box.playlist.find(video => video._id.toString() === '9cb763b6e72611381ef043f4')
            expect(previousSelectedVideo.isPreselected).to.equal(false)

            const preselectedVideo = box.playlist.filter(video => video.isPreselected)
            expect(preselectedVideo).to.have.lengthOf(1)

            expect(preselectedVideo[0]._id.toString()).to.equal('9cb763b6e72611381ef043f3')
        })

        it('Unselects a video if it is the one preselected', async () => {
            await queueService.onVideoPreselected({
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f4'
            })

            const result = await queueService.onVideoPreselected({
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f4'
            })

            expect(result.feedback.contents).to.equal(`Ash Ketchum has removed the preselection on "Connected".`)

            const box = await Box.findById('9cb763b6e72611381ef043e7')

            const previousSelectedVideo = box.playlist.find(video => video._id.toString() === '9cb763b6e72611381ef043f4')
            expect(previousSelectedVideo.isPreselected).to.equal(false)

            const preselectedVideo = box.playlist.filter(video => video.isPreselected)
            expect(preselectedVideo).to.have.lengthOf(0)
        })
    })

    describe('Force play a video', () => {
        before(async () => {
            await Subscriber.create([
                {
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 0
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 7
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef143e7',
                    connexions: [],
                    berries: 51
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef243e7',
                    connexions: [],
                    berries: 78
                }
            ])
        })

        after(async () => {
            await Subscriber.deleteMany({})
        })

        beforeEach(async () => {
            await Box.create([
                {
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
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef043f3',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef043f2',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: true
                        },
                        {
                            _id: '9cb763b6e72611381ef043f1',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef043f0',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: "2019-05-31T09:19:44+0000",
                            endTime: "2019-05-31T09:21:12+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        refresh: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ef143e7',
                    description: 'Box with a video playing',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    playlist: [
                        {
                            _id: '9cb763b6e72611381ef143f4',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef143f3',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef143f2',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef143f1',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef143f0',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: "2019-05-31T09:19:44+0000",
                            endTime: "2019-05-31T09:21:12+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        refresh: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ef243e7',
                    description: 'Box with a video playing and a preselected video with berries',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    playlist: [
                        {
                            _id: '9cb763b6e72611381ef243f4',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: false
                        },
                        {
                            _id: '9cb763b6e72611381ef243f3',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: true,
                            stateForcedWithBerries: true
                        },
                        {
                            _id: '9cb763b6e72611381ef243f2',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: false
                        },
                        {
                            _id: '9cb763b6e72611381ef243f1',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: true
                        },
                        {
                            _id: '9cb763b6e72611381ef243f0',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: "2019-05-31T09:19:44+0000",
                            endTime: "2019-05-31T09:21:12+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: false
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        refresh: true
                    }
                }
            ])
        })

        afterEach(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef143e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef243e7')
        })

        it('Refuses the order if the box is closed', async () => {
            const forcePlayRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043e9'
            }

            try {
                await queueService.onVideoForcePlayed(forcePlayRequest)
            } catch (error) {
                expect(error.message).to.equal("The box is closed. The queue cannot be modified.")
            }
        })

        it('Refuses the order if the video does not exist in the queue', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '8cb763b6e72611381ef043f4'
            }

            try {
                await queueService.onVideoForcePlayed(preselectRequest)
            } catch (error) {
                expect(error.message).to.equal("The video you selected could not be found.")
            }
        })

        it('Refuses if the video is already playing', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f1'
            }

            try {
                await queueService.onVideoForcePlayed(preselectRequest)
            } catch (error) {
                expect(error.message).to.equal("The video you selected is currently playing.")
            }
        })

        it('Refuses if the video has already been played', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f0'
            }

            try {
                await queueService.onVideoForcePlayed(preselectRequest)
            } catch (error) {
                expect(error.message).to.equal("The video you selected has already been played.")
            }
        })

        it('Refuses if the non-admin user does not have enough berries', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5e',
                item: '9cb763b6e72611381ef043f4'
            }

            try {
                await queueService.onVideoForcePlayed(preselectRequest)
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal("You do not have enough berries to use this action. You need 43 more.")
            }
        })

        it('Refuses if there is another video already playing with berries', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef243e7',
                userToken: '9ca0df5f86abeb66da97ba5f',
                item: '9cb763b6e72611381ef243f4'
            }

            try {
                await queueService.onVideoForcePlayed(preselectRequest)
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal("An user has used berries to play the currently playing video. You cannot overwrite it.")
            }
        })

        it('Accepts the non-admin requests and subtracts the amount of berries', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef143e7',
                userToken: '9ca0df5f86abeb66da97ba5f',
                item: '9cb763b6e72611381ef143f4'
            }

            const result = await queueService.onVideoForcePlayed(preselectRequest)

            const box = await Box.findById('9cb763b6e72611381ef143e7')

            const targetSubscription = await Subscriber.findOne({ userToken: '9ca0df5f86abeb66da97ba5f', boxToken: '9cb763b6e72611381ef143e7' })
            const playingVideo = box.playlist.find(video => video.startTime !== null)

            expect(targetSubscription.berries).to.equal(1)
            expect(playingVideo._id.toString()).to.equal('9cb763b6e72611381ef143f4')
            expect(result.feedbackMessage.contents).to.equal(`Brock has spent 50 berries to play "Connected".`)
        })

        it('Plays the designated track, even if there is a preselected track', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f3'
            }

            const result = await queueService.onVideoForcePlayed(preselectRequest)

            const box = await Box.findById('9cb763b6e72611381ef043e7')

            const preselectedVideo = box.playlist.find(video => video._id.toString() === '9cb763b6e72611381ef043f2')
            const playingVideo = box.playlist.find(video => video.startTime !== null)

            expect(preselectedVideo.isPreselected).to.equal(true)
            expect(playingVideo._id.toString()).to.equal('9cb763b6e72611381ef043f3')
            expect(result.feedbackMessage.contents).to.equal(`Currently playing: The Evil King`)
        })
    })

    describe('Skip a video', () => {
        before(async () => {
            await Subscriber.create([
                {
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 0
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 7
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef143e7',
                    connexions: [],
                    berries: 51
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef243e7',
                    connexions: [],
                    berries: 78
                }
            ])
        })

        after(async () => {
            await Subscriber.deleteMany({})
        })

        beforeEach(async () => {
            await Box.create([
                {
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
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef043f3',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef043f2',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: true
                        },
                        {
                            _id: '9cb763b6e72611381ef043f1',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef043f0',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: "2019-05-31T09:19:44+0000",
                            endTime: "2019-05-31T09:21:12+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        refresh: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ef143e7',
                    description: 'Box with a video playing',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    playlist: [
                        {
                            _id: '9cb763b6e72611381ef143f4',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef143f3',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef143f2',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef143f1',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        },
                        {
                            _id: '9cb763b6e72611381ef143f0',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: "2019-05-31T09:19:44+0000",
                            endTime: "2019-05-31T09:21:12+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        refresh: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ef243e7',
                    description: 'Box with a video playing and a preselected video with berries',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    playlist: [
                        {
                            _id: '9cb763b6e72611381ef243f4',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: false
                        },
                        {
                            _id: '9cb763b6e72611381ef243f3',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: true,
                            stateForcedWithBerries: true
                        },
                        {
                            _id: '9cb763b6e72611381ef243f2',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: false
                        },
                        {
                            _id: '9cb763b6e72611381ef243f1',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: true
                        },
                        {
                            _id: '9cb763b6e72611381ef243f0',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: "2019-05-31T09:19:44+0000",
                            endTime: "2019-05-31T09:21:12+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: false
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        refresh: true
                    }
                }
            ])
        })

        afterEach(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef143e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef243e7')
        })

        it('Refuses the order if the box is closed', async () => {
            const skipRequest: BoxScope = {
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba5d',
            }

            try {
                await queueService.onVideoSkipped(skipRequest)
            } catch (error) {
                expect(error.message).to.equal("The box is closed. The queue cannot be modified.")
            }
        })

        it('Refuses if the non-admin user does not have enough berries', async () => {
            const skipRequest: BoxScope = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5e',
            }

            try {
                await queueService.onVideoSkipped(skipRequest)
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal("You do not have enough berries to use this action. You need 23 more.")
            }
        })

        it('Refuses if there is another video already playing with berries', async () => {
            const skipRequest: BoxScope = {
                boxToken: '9cb763b6e72611381ef243e7',
                userToken: '9ca0df5f86abeb66da97ba5f',
            }

            try {
                await queueService.onVideoSkipped(skipRequest)
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal("An user has used berries to play the currently playing video. You cannot skip it.")
            }
        })

        it('Accepts the non-admin requests and subtracts the amount of berries', async () => {
            const skipRequest: BoxScope = {
                boxToken: '9cb763b6e72611381ef143e7',
                userToken: '9ca0df5f86abeb66da97ba5f',
            }

            const result = await queueService.onVideoSkipped(skipRequest)

            const box = await Box
                .findById('9cb763b6e72611381ef143e7')
                .populate("playlist.video")

            const targetSubscription = await Subscriber.findOne({ userToken: '9ca0df5f86abeb66da97ba5f', boxToken: '9cb763b6e72611381ef143e7' })
            const playingVideo = box.playlist.find(video => video.startTime !== null && video.endTime === null)

            expect(targetSubscription.berries).to.equal(21)
            expect(result.feedbackMessage.contents).to.equal(`Brock has spent 30 berries to skip the current video. Currently playing: "${playingVideo.video.name}".`)
        })

        it('Skip the track', async () => {
            const skipRequest: BoxScope = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
            }

            const result = await queueService.onVideoSkipped(skipRequest)

            const box = await Box
                .findById('9cb763b6e72611381ef043e7')
                .populate("playlist.video")

            const playingVideo = box.playlist.find(video => video.startTime !== null && video.endTime === null)

            expect(result.feedbackMessage.contents).to.equal(`The previous video has been skipped. Currently playing: "${playingVideo.video.name}".`)
        })
    })

    describe("Get current video", () => {
        before(async () => {
            await Box.create([
                {
                    _id: '9cb763b6e72611381ef043e4',
                    description: null,
                    lang: 'English',
                    name: 'Test box',
                    playlist: [],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true
                },
                {
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
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef043e7',
                            video: '9cb81150594b2e75f06ba90a',
                            // 20 seconds ago
                            startTime: new Date(Date.now() - 20000),
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true
                }
            ])
        })

        after(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e4')
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e6')
        })

        it("Returns null when there's no currently playing video", async () => {
            const currentVideo = await queueService.getCurrentVideo('9cb763b6e72611381ef043e4')

            expect(currentVideo).to.equal(null)
        })

        it("Throws an error if the box is closed", async () => {
            try {
                await queueService.getCurrentVideo('9cb763b6e72611381ef043e5')
            } catch (error) {
                expect(error.message).to.equal('This box is closed. Video play is disabled.')

            }
        })

        it("Returns the currently playing video", async () => {
            const currentVideo = await queueService.getCurrentVideo('9cb763b6e72611381ef043e6')

            expect(currentVideo._id.toString()).to.equal('9cb763b6e72611381ef043e7')
            expect(currentVideo.video).to.eql({
                _id: new ObjectId('9cb81150594b2e75f06ba90a'),
                link: 'j6okxJ1CYJM',
                name: 'The Piano Before Cynthia',
            })
            expect(currentVideo.submitted_by).to.eql({
                _id: new ObjectId('9ca0df5f86abeb66da97ba5d'),
                name: 'Ash Ketchum'
            })
            expect(currentVideo.position).to.approximately(20, 1)
        })
    })

    describe("Get next video", () => {
        before(async () => {
            await Box.create([
                {
                    _id: '9cb763b6e72611381ef043e4',
                    description: null,
                    lang: 'English',
                    name: 'Test box',
                    playlist: [],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true
                },
                {
                    _id: '9cb763b6e72611381ff043e5',
                    description: 'Closed box',
                    lang: 'English',
                    name: 'Closed box',
                    playlist: [
                        {
                            _id: '9cb763b6e72611381ef043e9',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: false,
                    options: {
                        random: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ff043e6',
                    description: 'Box with a video playing',
                    lang: 'English',
                    name: 'Box playing',
                    playlist: [
                        {
                            _id: '9cb763b6e72611381ef043e8',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef043e7',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:19:44+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true
                },
                {
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
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef043f3',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef043f2',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef043f1',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef043f0',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: "2019-05-31T09:19:44+0000",
                            endTime: "2019-05-31T09:21:12+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ef04500',
                    description: 'Box with a video playing and a preselected video',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    playlist: [
                        {
                            _id: '9cb763b6e72611381ef04505',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef04504',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: true
                        },
                        {
                            _id: '9cb763b6e72611381ef04503',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef04502',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef04501',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: "2019-05-31T09:19:44+0000",
                            endTime: "2019-05-31T09:21:12+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ef043f5',
                    description: 'Box with a video playing',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    playlist: [
                        {
                            _id: '9cb763b6e72611381ef04400',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: "2019-05-31T09:21:27+0000",
                            endTime: "2019-05-31T09:21:29+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef043f9',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: "2019-05-31T09:21:17+0000",
                            endTime: "2019-05-31T09:21:27+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef043f8',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: "2019-05-31T09:21:14+0000",
                            endTime: "2019-05-31T09:21:17+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef043f7',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: "2019-05-31T09:21:14+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef043f6',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ef05500',
                    description: 'Box with a video playing and a preselected video',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    playlist: [
                        {
                            _id: '9cb763b6e72611381ef05505',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef05504',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: true
                        },
                        {
                            _id: '9cb763b6e72611381ef05503',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef05502',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        },
                        {
                            _id: '9cb763b6e72611381ef05501',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: "2019-05-31T09:19:44+0000",
                            endTime: "2019-05-31T09:21:12+0000",
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d'
                        }
                    ],
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true
                    }
                }
            ])
        })

        after(async () => {
            await Box.deleteMany({
                _id: {
                    $in: ['9cb763b6e72611381ef043e4', '9cb763b6e72611381ff043e5',
                        '9cb763b6e72611381ff043e6', '9cb763b6e72611381ef043e7',
                        '9cb763b6e72611381ef04500', '9cb763b6e72611381ef043f5',
                        '9cb763b6e72611381ef05500'
                    ]
                }
            })
        })

        it("Sends null if there's no next video", async () => {
            const response = await queueService.getNextVideo('9cb763b6e72611381ef043e4')

            expect(response.nextVideo).to.equal(null)
        })

        it("Get the next video if no video just ended", async () => {
            const response = await queueService.getNextVideo('9cb763b6e72611381ff043e6')

            expect(response.nextVideo._id.toString()).to.equal('9cb763b6e72611381ef043e8')
        })

        it("Get next video when no video was playing before", async () => {
            const response = await queueService.getNextVideo('9cb763b6e72611381ff043e5')

            expect(response.nextVideo._id.toString()).to.equal('9cb763b6e72611381ef043e9')
        })

        it("Gets the next video in random mode", async () => {
            const response = await queueService.getNextVideo('9cb763b6e72611381ef043e7')

            const box = await Box.findById('9cb763b6e72611381ef043e7')

            const possibleVideos = ['9cb763b6e72611381ef043f4', '9cb763b6e72611381ef043f3', '9cb763b6e72611381ef043f2']

            expect(possibleVideos.indexOf(response.nextVideo._id.toString())).to.not.equal(-1)

            const playingIndex = _.findIndex(box.playlist, (video) => video.startTime !== null && video.endTime === null)

            expect(playingIndex).to.equal(2)
        })

        it("Gets the next video in random mode even if it's way at the bottom", async () => {
            const response = await queueService.getNextVideo('9cb763b6e72611381ef043f5')

            expect(response.nextVideo._id.toString()).to.equal('9cb763b6e72611381ef043f6')
        })

        it('Gets the preselected video if it exists', async () => {
            const response = await queueService.getNextVideo('9cb763b6e72611381ef04500')

            expect(response.nextVideo._id.toString()).to.equal('9cb763b6e72611381ef04504')
        })

        it('Gets the selected video (overwrite by forcePlay)', async () => {
            const response = await queueService.getNextVideo('9cb763b6e72611381ef05500', '9cb763b6e72611381ef05503')

            expect(response.nextVideo._id.toString()).to.equal('9cb763b6e72611381ef05503')
        })
    })

    describe("Loop Mode", () => {
        it("Loops the queue when no more videos are upcoming", async () => {
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
                        submittedAt: "2019-05-31T09:19:45+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    },
                    {
                        _id: '9cb763b6e72611381ef04401',
                        video: '9cb81150594b2e75f06ba910',
                        startTime: "2019-05-31T09:28:11+0000",
                        endTime: "2019-05-31T09:34:03+0000",
                        submittedAt: "2019-05-31T09:19:44+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    },
                    {
                        _id: '9cb763b6e72611381ef04402',
                        video: '9cb81150594b2e75f06ba914',
                        startTime: "2019-05-31T09:25:36+0000",
                        endTime: "2019-05-31T09:28:11+0000",
                        submittedAt: "2019-05-31T09:19:43+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    },
                    {
                        _id: '9cb763b6e72611381ef04403',
                        video: '9cb81150594b2e75f06ba8fe',
                        startTime: "2019-05-31T09:23:12+0000",
                        endTime: "2019-05-31T09:25:36+0000",
                        submittedAt: "2019-05-31T09:19:42+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    },
                    {
                        _id: '9cb763b6e72611381ef04404',
                        video: '9cb81150594b2e75f06ba90c',
                        startTime: "2019-05-31T09:19:41+0000",
                        endTime: "2019-05-31T09:23:12+0000",
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

            const updatedPlaylist = await queueService.loopPlaylist(box)

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