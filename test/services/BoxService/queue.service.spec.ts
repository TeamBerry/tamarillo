import * as chai from "chai"
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const expect = chai.expect
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

import queueService from '../../../src/services/BoxService/queue.service'
const Box = require('../../../src/models/box.model')

import { QueueItemActionRequest, BoxScope } from '@teamberry/muscadine'
import { Video } from '../../../src/models/video.model'
import { UserPlaylist, UserPlaylistDocument } from "../../../src/models/user-playlist.model"
import { Subscriber } from "../../../src/models/subscriber.model"
import { User } from "../../../src/models/user.model"
import { QueueItemModel } from "../../../src/models/queue-item.model"

describe.only("Queue Service", () => {

    before(async () => {
        await Box.deleteMany({})
        await User.deleteMany({})
        await Video.deleteMany({})
        await UserPlaylist.deleteMany({})
        await Subscriber.deleteMany({})
        await QueueItemModel.deleteMany({})

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
            creator: '9ca0df5f86abeb66da97ba5d',
            open: false,
            options: {
                random: true,
                loop: false
            }
        })

        await QueueItemModel.create([
            {
                _id: '9cb763b6e72611381ef043e9',
                box: '9cb763b6e72611381ef043e5',
                video: '9cb81150594b2e75f06ba90a',
                startTime: null,
                endTime: null,
                submittedAt: "2019-05-31T09:19:41+0000",
                submitted_by: '9ca0df5f86abeb66da97ba5d',
                isPreselected: false,
                setToNext: null,
                stateForcedWithBerries: false
            }
        ])

        await Video.create([
            {
                _id: '9cb81150594b2e75f06ba8fe',
                link: 'Ivi1e-yCPcI',
                name: 'Destroid - Annihilate',
                duration: 'PT5M11S'
            },
            {
                _id: '9cb81150594b2e75f06ba900',
                link: '6OmwKZ9r07o',
                name: 'ODDS&ENDS',
                duration: 'PT5M48S'
            },
            {
                _id: '9cb81150594b2e75f06ba90a',
                link: 'j6okxJ1CYJM',
                name: 'The Piano Before Cynthia',
                duration: 'PT2M4S'
            },
            {
                _id: '9cb81150594b2e75f06ba90b',
                link: 'SeSOzTr_yfA',
                name: 'The Evil King',
                duration: 'PT3M45S'
            },
            {
                _id: '9cb81150594b2e75f06ba90c',
                link: '0he85BszwL8',
                name: 'Connected',
                duration: ''
            },
            {
                _id: '9cb81150594b2e75f06ba90d',
                link: 'Kn8Vs_kKQMc',
                name: 'Sand Planet',
                duration: ''
            },
            {
                _id: '9cb81150594b2e75f06ba90e',
                link: 'AvTH7J2shuI',
                name: 'Two-Faced lovers',
                duration: ''
            },
            {
                _id: '9cb81150594b2e75f06ba90f',
                link: 'UC_qla6FQwM',
                name: 'Hibikase',
                duration: ''
            },
            {
                _id: '9cb81150594b2e75f06ba910',
                link: 'Z4LiNMCTV20',
                name: 'Hyper Reality Show',
                duration: ''
            },
            {
                _id: '9cb81150594b2e75f06ba911',
                link: 'hxSg2Ioz3LM',
                name: 'Hibana',
                duration: ''
            },
            {
                _id: '9cb81150594b2e75f06ba912',
                link: 'uMlv9VWAxko',
                name: 'Unhappy Refrain',
                duration: 'PT3M46S'
            },
            {
                _id: '9cb81150594b2e75f06ba913',
                link: 'aCxGqtDoB04',
                name: 'Peace Sign',
                duration: ''
            },
            {
                _id: '9cb81150594b2e75f06ba914',
                link: 'bmkY2yc1K7Q',
                name: 'Te wo',
                duration: 'PT3M31S'
            },
            {
                _id: '9cb81150594b2e75f06ba915',
                link: 'ZB75e7vzX0I',
                name: `World's End Dancehall`,
                duration: ''
            }
        ])
    })

    after(async () => {
        await Box.deleteMany({})
        await User.deleteMany({})
        await Video.deleteMany({})
        await UserPlaylist.deleteMany({})
        await Subscriber.deleteMany({})
        await QueueItemModel.deleteMany({})
    })

    describe("Submit video to box", () => {
        before(async () => {
            await Box.create([
                {
                    _id: '9cb763b6e72611381ef043e4',
                    description: null,
                    lang: 'English',
                    name: 'Box with empty playlist',
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
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: true,
                        berries: true
                    },
                    acl: {
                        moderator: [
                            'addVideo',
                            'removeVideo',
                            'promoteVIP',
                            'demoteVIP',
                            'forceNext',
                            'forcePlay'
                        ],
                        vip: [ 'addVideo', 'removeVideo', 'forceNext', 'bypassVideoDurationLimit' ],
                        simple: []
                    }
                },
                {
                    _id: '9cb763b6e72611381ef063f4',
                    description: null,
                    lang: 'English',
                    name: 'Box with a 3 Minute duration restriction',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: true,
                        berries: true,
                        videoMaxDurationLimit: 3
                    },
                    acl: {
                        moderator: [
                            'addVideo',
                            'removeVideo',
                            'promoteVIP',
                            'demoteVIP',
                            'forceNext',
                            'forcePlay'
                        ],
                        vip: [ 'addVideo', 'removeVideo', 'forceNext', 'bypassVideoDurationLimit' ],
                        simple: [ 'addVideo' ]
                    }
                }
            ])

            await QueueItemModel.create([
                {
                    box: '9cb763b6e72611381ef053f4',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                    _id: '9cb763b6e72611381ef04401',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: '2020-04-23T15:50:31.921Z',
                    endTime: null,
                    submittedAt: '2020-04-23T15:50:30.896Z',
                    submitted_by: '9ca0df5f86abeb66da97ba5d'
                }
            ])

            await Subscriber.create([
                {
                    boxToken: '9cb763b6e72611381ef043e4',
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    connexions: [],
                    berries: 0,
                    role: 'admin'
                },
                {
                    boxToken: '9cb763b6e72611381ef053f4',
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    connexions: [],
                    berries: 0,
                    role: 'admin'
                },
                {
                    boxToken: '9cb763b6e72611381ef063f4',
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    connexions: [],
                    berries: 0,
                    role: 'admin'
                },
                {
                    boxToken: '9cb763b6e72611381ef063f4',
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    connexions: [],
                    berries: 0,
                    role: 'simple'
                },
                {
                    boxToken: '9cb763b6e72611381ef063f4',
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    connexions: [],
                    berries: 0,
                    role: 'vip'
                },
                {
                    boxToken: '9cb763b6e72611381ef053f4',
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    connexions: [],
                    berries: 0,
                    role: 'simple'
                }
            ])
        })

        after(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e4')
            await Box.findByIdAndDelete('9cb763b6e72611381ef053f4')
            await QueueItemModel.deleteMany({
                box: { $in: ['9cb763b6e72611381ef043e4', '9cb763b6e72611381ef053f4', '9cb763b6e72611381ef063f4'] }
            })
            await Subscriber.deleteMany({})
        })

        it("Refuses the submission if the video does not exist", async () => {
            try {
                await queueService.onVideoSubmitted({ link: 'notFound', userToken: '9ca0df5f86abeb66da97ba5d', boxToken: '9cb763b6e72611381ef043e4' })
            } catch (error) {
                expect(error.message).to.equal("The link does not match any video.")
            }
        })

        it("Refuses the submission if the video cannot be played remotely", async () => {
            try {
                await queueService.onVideoSubmitted({ link: 'CwiHSG_tYaQ', userToken: '9ca0df5f86abeb66da97ba5d', boxToken: '9cb763b6e72611381ef043e4' })
            } catch (error) {
                expect(error.message).to.equal("This video unfortunately cannot be played outside of YouTube. Please try to find another video not restricted.")
            }
        })

        it("Refuses video if the user does not have enough ACL powers", async () => {
            try {
                await queueService.onVideoSubmitted({ link: 'CwiHSG_tYaQ', userToken: '9ca0df5f86abeb66da97ba5f', boxToken: '9cb763b6e72611381ef053f4' })
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal("You do not have the authorization to do this.")
            }
        })

        it("Refuses the submission if the video is too long for the restriction put in place", async () => {
            try {
                await queueService.addVideoToQueue({
                    _id: '9cb81150594b2e75f06ba8fe',
                    link: 'Ivi1e-yCPcI',
                    name: 'Destroid - Annihilate',
                    duration: 'PT5M11S'
                }, '9cb763b6e72611381ef063f4', '9ca0df5f86abeb66da97ba5e')
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal('This video exceeds the limit of 3 minutes. Please submit a shorter video.')
            }
        })

        it("Accepts a video that exceeds the duration if the user has the power to bypass the restriction", async () => {
            await queueService.addVideoToQueue({
                _id: '9cb81150594b2e75f06ba8fe',
                link: 'Ivi1e-yCPcI',
                name: 'Destroid - Annihilate',
                duration: 'PT5M11S'
            }, '9cb763b6e72611381ef063f4', '9ca0df5f86abeb66da97ba5d')

            expect(await QueueItemModel.count({ box: '9cb763b6e72611381ef063f4'})).to.equal(1)
            
            await queueService.addVideoToQueue({
                _id: '9cb81150594b2e75f06ba900',
                link: '6OmwKZ9r07o',
                name: 'ODDS&ENDS',
                duration: 'PT5M48S'
            }, '9cb763b6e72611381ef063f4', '9ca0df5f86abeb66da97ba5f')

            expect(await QueueItemModel.count({ box: '9cb763b6e72611381ef063f4'})).to.equal(2)
        })

        it('Accepts the video even if it already is in the queue, without adding it', async () => {
            await queueService.addVideoToQueue({
                _id: '9cb81150594b2e75f06ba8fe',
                link: 'Ivi1e-yCPcI',
                name: 'Destroid - Annihilate',
                duration: 'PT5M11S'
            }, '9cb763b6e72611381ef053f4', '9ca0df5f86abeb66da97ba5d')

            expect(await QueueItemModel.count({ box: '9cb763b6e72611381ef053f4'})).to.equal(1)

            await queueService.addVideoToQueue({
                _id: '9cb81150594b2e75f06ba8fe',
                link: 'Ivi1e-yCPcI',
                name: 'Destroid - Annihilate',
                duration: 'PT5M11S'
            }, '9cb763b6e72611381ef053f4', '9ca0df5f86abeb66da97ba5d')

            expect(await QueueItemModel.count({ box: '9cb763b6e72611381ef053f4'})).to.equal(1)
        })

        it("Accepts the video and sends back the updated box", async () => {
            const updatedBox = await queueService.addVideoToQueue({
                _id: '9cb81150594b2e75f06ba8fe',
                link: 'Ivi1e-yCPcI',
                name: 'Destroid - Annihilate',
                duration: 'PT5M11S'
            }, '9cb763b6e72611381ef043e4', '9ca0df5f86abeb66da97ba5d')

            expect(await QueueItemModel.count({ box: '9cb763b6e72611381ef043e4'})).to.equal(1)
        })

        // Feedback
        it("Sends message with user name if user exists", async () => {
            const { systemMessage, feedbackMessage } = await queueService.onVideoSubmitted({ link: 'Ivi1e-yCPcI', userToken: '9ca0df5f86abeb66da97ba5d', boxToken: '9cb763b6e72611381ef043e4' })

            expect(systemMessage.contents).to.equal(`Ash Ketchum has added the video "Destroid - Annihilate" to the queue.`)
            expect(feedbackMessage.contents).to.equal(`Your video "Destroid - Annihilate" has been added to the queue.`)
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
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: false
                    }
                },
                {
                    _id: '9cb763b6e72611381ef043e8',
                    description: null,
                    lang: 'English',
                    name: 'Test box',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: false
                    }
                },
                {
                    _id: '9cb763b6e72611381ef053e8',
                    description: null,
                    lang: 'English',
                    name: 'Box with a 3 Minute duration restriction',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: true,
                        berries: true,
                        videoMaxDurationLimit: 3
                    },
                    acl: {
                        moderator: [
                            'addVideo',
                            'removeVideo',
                            'promoteVIP',
                            'demoteVIP',
                            'forceNext',
                            'forcePlay'
                        ],
                        vip: ['addVideo', 'removeVideo', 'forceNext', 'bypassVideoDurationLimit'],
                        simple: []
                    }
                },
                {
                    _id: '9cb763b6e72611381ef063e8',
                    description: null,
                    lang: 'English',
                    name: 'Box with a 3 Minute duration restriction',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: true,
                        berries: true,
                        videoMaxDurationLimit: 3
                    },
                    acl: {
                        moderator: [
                            'addVideo',
                            'removeVideo',
                            'promoteVIP',
                            'demoteVIP',
                            'forceNext',
                            'forcePlay'
                        ],
                        vip: ['addVideo', 'removeVideo', 'forceNext', 'bypassVideoDurationLimit'],
                        simple: ['addVideo']
                    }
                }
            ])

            await UserPlaylist.create([
                {
                    _id: "8da1e01fda34eb8c1b9db46e",
                    name: "Favorites",
                    isPrivate: false,
                    user: "9ca0df5f86abeb66da97ba5d",
                    videos: ['9cb81150594b2e75f06ba8fe', '9cb81150594b2e75f06ba914', '9cb81150594b2e75f06ba912'],
                    isDeletable: false
                },
                {
                    _id: "8da1e01fda34eb8c1b9db56e",
                    name: "Favorites 2",
                    isPrivate: false,
                    user: "9ca0df5f86abeb66da97ba5d",
                    videos: ['9cb81150594b2e75f06ba8fe', '9cb81150594b2e75f06ba914', '9cb81150594b2e75f06ba912', '9cb81150594b2e75f06ba90a'],
                    isDeletable: false
                },
                {
                    _id: "8da1e01fda34eb8c1b9db66e",
                    name: "Favorites",
                    isPrivate: false,
                    user: "9ca0df5f86abeb66da97ba5e",
                    videos: ['9cb81150594b2e75f06ba8fe', '9cb81150594b2e75f06ba914', '9cb81150594b2e75f06ba912', '9cb81150594b2e75f06ba90a'],
                    isDeletable: false
                }
            ])

            await Subscriber.create([
                {
                    boxToken: '9cb763b6e72611381ef053e8',
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    connexions: [],
                    berries: 0,
                    role: 'admin'
                },
                {
                    boxToken: '9cb763b6e72611381ef053e8',
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    connexions: [],
                    berries: 0,
                    role: 'simple'
                },
                {
                    boxToken: '9cb763b6e72611381ef063e8',
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    connexions: [],
                    berries: 0,
                    role: 'admin'
                },
                {
                    boxToken: '9cb763b6e72611381ef063e8',
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    connexions: [],
                    berries: 0,
                    role: 'simple'
                },
                {
                    boxToken: '9cb763b6e72611381ef063e8',
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    connexions: [],
                    berries: 0,
                    role: 'vip'
                },
                {
                    boxToken: '9cb763b6e72611381ef043e4',
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    connexions: [],
                    berries: 17,
                    role: 'simple'
                }
            ])
        })

        after(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e4')
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e8')
            await Box.findByIdAndDelete('9cb763b6e72611381ef053e8')
            await Box.findByIdAndDelete('9cb763b6e72611381ef063e8')
            await UserPlaylist.deleteMany({})
            await Subscriber.deleteMany({})
            await QueueItemModel.deleteMany({
                box: { $in: ['9cb763b6e72611381ef043e4', '9cb763b6e72611381ef043e8', '9cb763b6e72611381ef053e8', '9cb763b6e72611381ef063e8'] }
            })
        })

        it("Refuses playlist if the playlist does not exist", async () => {
            try {
                await queueService.onPlaylistSubmitted({ playlistId: '9da1e01fda34eb8c1b9db46e', boxToken: '9cb763b6e72611381ef043e4', userToken: '9ca0df5f86abeb66da97ba5d' })
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal("The playlist could not be found. The submission has been rejected.")
            }
        })

        it("Refuses playlist if the user does not have enough ACL powers", async () => {
            try {
                await queueService.onPlaylistSubmitted({ playlistId: '8da1e01fda34eb8c1b9db66e', userToken: '9ca0df5f86abeb66da97ba5e', boxToken: '9cb763b6e72611381ef053e8' })
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal("You do not have the authorization to do this.")
            }
        })

        it("Accepts playlist and sends back the updated box", async () => {
            const userPlaylist: UserPlaylistDocument = await UserPlaylist.findById('8da1e01fda34eb8c1b9db46e')
            const updatedBox = await queueService.addPlaylistToQueue(userPlaylist, '9cb763b6e72611381ef043e8', '9ca0df5f86abeb66da97ba5d')

            expect(await QueueItemModel.count({ box: '9cb763b6e72611381ef043e8' })).to.equal(3)
        })

        it("Filters videos that exceed the duration setting if the user does not have the power to bypass it", async () => {
            const userPlaylist = await UserPlaylist.findById('8da1e01fda34eb8c1b9db56e')
            const updatedBox = await queueService.addPlaylistToQueue(userPlaylist, '9cb763b6e72611381ef053e8', '9ca0df5f86abeb66da97ba5e')

            expect(await QueueItemModel.count({ box: '9cb763b6e72611381ef053e8' })).to.equal(1)
        })

        it("Doesn't filter videos on their duration if the user has the power to bypass it", async () => {
            const userPlaylist = await UserPlaylist.findById('8da1e01fda34eb8c1b9db66e')
            const updatedBox = await queueService.addPlaylistToQueue(userPlaylist, '9cb763b6e72611381ef063e8', '9ca0df5f86abeb66da97ba5d')

            expect(await QueueItemModel.count({ box: '9cb763b6e72611381ef063e8' })).to.equal(4)
        })
    })

    describe("Remove video from box", () => {
        before(async () => {
            await Subscriber.create([
                {
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 0,
                    role: 'admin'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 7,
                    role: 'simple'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef143e7',
                    connexions: [],
                    berries: 11,
                    role: 'simple'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef243e7',
                    connexions: [],
                    berries: 78,
                    role: 'simple'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    boxToken: '9cb763b6e72611381ef343e7',
                    connexions: [],
                    berries: 0,
                    role: 'admin'
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
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: false
                    }
                },
                {
                    _id: '9cb763b6e72611381ef143e7',
                    description: 'Box with a video playing',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: false
                    }
                },
                {
                    _id: '9cb763b6e72611381ef243e7',
                    description: 'Box with a video playing and a preselected video with berries',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: false
                    }
                },
                {
                    _id: '9cb763b6e72611381ef343e7',
                    description: 'Box with a video playing and a preselected video with berries',
                    lang: 'English',
                    name: 'Box playing in loop + random mode',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: false,
                    options: {
                        random: true,
                        loop: true
                    }
                }
            ])

            await QueueItemModel.create([
                {
                    _id: '9cb763b6e72611381ef043f4',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef043f3',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef043f2',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef043f1',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef043f0',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f4',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f3',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f2',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f1',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f0',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef243f4',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef243f3',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: true,
                    setToNext: "2019-05-31T09:19:41Z",
                    stateForcedWithBerries: true
                },
                {
                    _id: '9cb763b6e72611381ef243f2',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef243f1',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef243f0',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef343f4',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef343f3',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: true
                },
                {
                    _id: '9cb763b6e72611381ef343f2',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef343f1',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef343f0',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                }
            ])
        })

        afterEach(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef143e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef243e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef343e7')
            await QueueItemModel.deleteMany({
                box: { $in: ['9cb763b6e72611381ef043e7', '9cb763b6e72611381ef143e7', '9cb763b6e72611381ef243e7', '9cb763b6e72611381ef343e7']}
            })
        })

        it("Refuses if the user does not have enough ACL powers", async () => {
            const cancelPayload: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5e',
                item: '9cb763b6e72611381ef043e9'
            }

            try {
                await queueService.onVideoCancelled(cancelPayload)
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal("You do not have the authorization to do this.")
            }
        })

        it("Removes the video from the queue", async () => {
            const cancelPayload: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f0'
            }

            const { systemMessage, feedbackMessage } = await queueService.onVideoCancelled(cancelPayload)

            expect(await QueueItemModel.count({ box: '9cb763b6e72611381ef043e7'})).to.equal(4)
            expect(systemMessage.contents).to.equal('Ash Ketchum has removed the video "Connected" from the queue.')
            expect(feedbackMessage.contents).to.equal('You have removed the video "Connected" from the queue.')
        })
    })

    describe('Preselect a video', () => {
        before(async () => {
            await Subscriber.create([
                {
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 0,
                    role: 'admin'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 7,
                    role: 'simple'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef143e7',
                    connexions: [],
                    berries: 11,
                    role: 'simple'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef243e7',
                    connexions: [],
                    berries: 78,
                    role: 'simple'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    boxToken: '9cb763b6e72611381ef343e7',
                    connexions: [],
                    berries: 0,
                    role: 'admin'
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
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: false
                    }
                },
                {
                    _id: '9cb763b6e72611381ef143e7',
                    description: 'Box with a video playing',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: false
                    }
                },
                {
                    _id: '9cb763b6e72611381ef243e7',
                    description: 'Box with a video playing and a preselected video with berries',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: false
                    }
                },
                {
                    _id: '9cb763b6e72611381ef343e7',
                    description: 'Box with a video playing and a preselected video with berries',
                    lang: 'English',
                    name: 'Box playing in loop + random mode',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: true
                    }
                }
            ])

            await QueueItemModel.create([
                {
                    _id: '9cb763b6e72611381ef043f4',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef043f3',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef043f2',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef043f1',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef043f0',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f4',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f3',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f2',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f1',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f0',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef243f4',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef243f3',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: true,
                    setToNext: "2019-05-31T09:19:41Z",
                    stateForcedWithBerries: true
                },
                {
                    _id: '9cb763b6e72611381ef243f2',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef243f1',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef243f0',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef343f4',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef343f3',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: true
                },
                {
                    _id: '9cb763b6e72611381ef343f2',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef343f1',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef343f0',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                }
            ])
        })

        afterEach(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef143e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef243e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef343e7')
            await QueueItemModel.deleteMany({
                box: {$in: ['9cb763b6e72611381ef043e7', '9cb763b6e72611381ef143e7', '9cb763b6e72611381ef243e7', '9cb763b6e72611381ef343e7']}
            })
        })

        it('Refuses if the video does not exist in the queue', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '8cb763b6e72611381ef043f4'
            }

            try {
                await queueService.onVideoPreselected(preselectRequest)
                expect.fail()
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
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal("The video you selected is currently playing.")
            }
        })

        it('Refuses if the video has been played (non-loop)', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f0'
            }

            try {
                await queueService.onVideoPreselected(preselectRequest)
                expect.fail()
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

        it('Accepts the non-admin requests and subtracts the amount of berries', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef143e7',
                userToken: '9ca0df5f86abeb66da97ba5f',
                item: '9cb763b6e72611381ef143f4'
            }

            const { systemMessage, feedbackMessage } = await queueService.onVideoPreselected(preselectRequest)

            const targetVideo = await QueueItemModel.findOne({ box: '9cb763b6e72611381ef143e7', _id: '9cb763b6e72611381ef143f4' }).lean()
            expect(targetVideo.setToNext).to.not.be.null

            const targetSubscription = await Subscriber.findOne({ userToken: '9ca0df5f86abeb66da97ba5f', boxToken: '9cb763b6e72611381ef143e7' })

            expect(targetSubscription.berries).to.equal(1)
            expect(systemMessage.contents).to.equal(`Brock has spent 10 berries to select the video "Connected" to play in priority.`)
            expect(feedbackMessage.contents).to.equal(`You spent 10 berries to play "Connected" in priority.`)
        })

        it('Accepts the played video in loop mode', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef343e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef343f0'
            }

            const { systemMessage, feedbackMessage } = await queueService.onVideoPreselected(preselectRequest)

            const preselectedVideo = await QueueItemModel.findOne({ box: '9cb763b6e72611381ef343e7', _id: '9cb763b6e72611381ef343f0' }).lean()
            expect(preselectedVideo.setToNext).to.not.be.null

            expect(systemMessage.contents).to.equal(`Ash Ketchum has selected the video "Connected" to play in priority.`)
            expect(feedbackMessage.contents).to.equal(`You selected "Connected" to play in priority.`)
        })

        it('Adds the video to the "next" mini-queue', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f4'
            }

            const { systemMessage, feedbackMessage } = await queueService.onVideoPreselected(preselectRequest)

            const targetVideo = await QueueItemModel.findOne({ box: '9cb763b6e72611381ef043e7', _id: '9cb763b6e72611381ef043f4' }).lean()
            expect(targetVideo.setToNext).to.not.be.null

            expect(systemMessage.contents).to.equal(`Ash Ketchum has selected the video "Connected" to play in priority.`)
            expect(feedbackMessage.contents).to.equal(`You selected "Connected" to play in priority.`)
        })

        it('Removes the video from the "next" mini-queue', async () => {
            await queueService.onVideoPreselected({
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f4'
            })

            const { systemMessage, feedbackMessage } = await queueService.onVideoPreselected({
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f4'
            })

            const targetVideo = await QueueItemModel.findOne({ box: '9cb763b6e72611381ef043e7', _id: '9cb763b6e72611381ef043f4' }).lean()
            expect(targetVideo.setToNext).to.equal(null)

            expect(systemMessage.contents).to.equal(`Ash Ketchum has removed the priority on "Connected".`)
            expect(feedbackMessage.contents).to.equal(`You removed the priority on "Connected".`)
        })
    })

    describe('Force play a video', () => {
        before(async () => {
            await Subscriber.create([
                {
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 0,
                    role: 'admin'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 7,
                    role: 'simple'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef143e7',
                    connexions: [],
                    berries: 51,
                    role: 'simple'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef243e7',
                    connexions: [],
                    berries: 78,
                    role: 'simple'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    boxToken: '9cb763b6e72611381ef343e7',
                    connexions: [],
                    berries: 0,
                    role: 'admin'
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
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: false
                    }
                },
                {
                    _id: '9cb763b6e72611381ef143e7',
                    description: 'Box with a video playing',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: false
                    }
                },
                {
                    _id: '9cb763b6e72611381ef243e7',
                    description: 'Box with a video playing and a preselected video with berries',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: false
                    }
                },
                {
                    _id: '9cb763b6e72611381ef343e7',
                    description: 'Box with a video playing and a preselected video with berries',
                    lang: 'English',
                    name: 'Box playing in loop + random mode',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: true
                    }
                }
            ])

            await QueueItemModel.create([
                {
                    _id: '9cb763b6e72611381ef043f4',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef043f3',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef043f2',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: true,
                    setToNext: "2019-05-31T09:19:41Z",
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef043f1',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef043f0',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f4',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f3',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f2',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f1',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f0',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef243f4',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef243f3',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: true,
                    setToNext: "2019-05-31T09:19:41Z",
                    stateForcedWithBerries: true
                },
                {
                    _id: '9cb763b6e72611381ef243f2',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef243f1',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: true
                },
                {
                    _id: '9cb763b6e72611381ef243f0',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef343f4',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef343f3',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: true
                },
                {
                    _id: '9cb763b6e72611381ef343f2',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef343f1',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef343f0',
                    box: '9cb763b6e72611381ef343e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                }
            ])
        })

        afterEach(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef143e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef243e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef343e7')
            await QueueItemModel.deleteMany({
                box: { $in: ['9cb763b6e72611381ef043e7', '9cb763b6e72611381ef143e7', '9cb763b6e72611381ef243e7', '9cb763b6e72611381ef343e7'] }
            })
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

        it('Refuses if the video has already been played (non-loop)', async () => {
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
                expect(error.message).to.equal("You do not have enough berries to use this action. You need 23 more.")
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

            const { systemMessage, feedbackMessage } = await queueService.onVideoForcePlayed(preselectRequest)

            const playingVideo = await QueueItemModel.findOne({ box: '9cb763b6e72611381ef143e7', startTime: { $ne: null }, endTime: null })
            expect(playingVideo._id.toString()).to.equal('9cb763b6e72611381ef143f4')
            
            const targetSubscription = await Subscriber.findOne({ userToken: '9ca0df5f86abeb66da97ba5f', boxToken: '9cb763b6e72611381ef143e7' })
            expect(targetSubscription.berries).to.equal(21)

            expect(systemMessage.contents).to.equal(`Brock has spent 30 berries to play "Connected" now.`)
            expect(feedbackMessage.contents).to.equal(`You spent 30 berries to play "Connected" now.`)
        })

        it('Accepts the played video in loop mode', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef343e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef343f0'
            }

            const { systemMessage, feedbackMessage } = await queueService.onVideoForcePlayed(preselectRequest)

            const playingVideo = await QueueItemModel.findOne({ box: '9cb763b6e72611381ef343e7', startTime: { $ne: null }, endTime: null })
            expect(playingVideo._id.toString()).to.equal('9cb763b6e72611381ef343f0')

            expect(systemMessage.contents).to.equal(`Currently playing: "Connected".`)
            expect(feedbackMessage.contents).to.equal(`You force played "Connected".`)
        })

        it('Plays the designated track, even if there is a preselected track', async () => {
            const preselectRequest: QueueItemActionRequest = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f3'
            }

            const { systemMessage, feedbackMessage } = await queueService.onVideoForcePlayed(preselectRequest)

            const playingVideo = await QueueItemModel.findOne({ box: '9cb763b6e72611381ef043e7', startTime: { $ne: null }, endTime: null })
            expect(playingVideo._id.toString()).to.equal('9cb763b6e72611381ef043f3')

            expect(systemMessage.contents).to.equal(`Currently playing: "The Evil King".`)
            expect(feedbackMessage.contents).to.equal(`You force played "The Evil King".`)
        })
    })

    describe('Skip a video', () => {
        before(async () => {
            await Subscriber.create([
                {
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 0,
                    role: 'admin'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    boxToken: '9cb763b6e72611381ef043e7',
                    connexions: [],
                    berries: 7,
                    role: 'simple'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef143e7',
                    connexions: [],
                    berries: 51,
                    role: 'simple'
                },
                {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef243e7',
                    connexions: [],
                    berries: 78,
                    role: 'simple'
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
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ef143e7',
                    description: 'Box with a video playing',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ef243e7',
                    description: 'Box with a video playing and a preselected video with berries',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: true
                    }
                }
            ])

            await QueueItemModel.create([
                {
                    _id: '9cb763b6e72611381ef043f4',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f3',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f2',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: true,
                    setToNext: "2019-05-31T09:19:41Z",
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f1',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f0',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef143f4',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f3',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f2',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f1',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef143f0',
                    box: '9cb763b6e72611381ef143e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false,
                },
                {
                    _id: '9cb763b6e72611381ef243f4',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef243f3',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: true,
                    setToNext: "2019-05-31T09:19:41Z",
                    stateForcedWithBerries: true
                },
                {
                    _id: '9cb763b6e72611381ef243f2',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef243f1',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: true
                },
                {
                    _id: '9cb763b6e72611381ef243f0',
                    box: '9cb763b6e72611381ef243e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                }
            ])
        })

        afterEach(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef143e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef243e7')
            await QueueItemModel.deleteMany({
                box: { $in: ['9cb763b6e72611381ef043e7', '9cb763b6e72611381ef143e7', '9cb763b6e72611381ef243e7'] }
            })
        })

        it('Refuses if the non-admin user does not have enough berries', async () => {
            const skipRequest: BoxScope = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5e'
            }

            try {
                await queueService.onVideoSkipped(skipRequest)
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal("You do not have enough berries to use this action. You need 13 more.")
            }
        })

        it('Refuses if there is another video already playing with berries', async () => {
            const skipRequest: BoxScope = {
                boxToken: '9cb763b6e72611381ef243e7',
                userToken: '9ca0df5f86abeb66da97ba5f'
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
                userToken: '9ca0df5f86abeb66da97ba5f'
            }

            const { systemMessage, feedbackMessage } = await queueService.onVideoSkipped(skipRequest)

            const targetSubscription = await Subscriber.findOne({ userToken: '9ca0df5f86abeb66da97ba5f', boxToken: '9cb763b6e72611381ef143e7' })

            const playingVideo = await QueueItemModel.findOne({ box: '9cb763b6e72611381ef143e7', startTime: { $ne: null }, endTime: null }).populate('video').lean()

            expect(targetSubscription.berries).to.equal(31)
            expect(systemMessage.contents).to.equal(`Brock has spent 20 berries to skip the previous video. Currently playing: "${playingVideo.video.name}".`)
            expect(feedbackMessage.contents).to.equal(`You spent 20 berries to skip the previous video.`)
        })

        it('Skip the track', async () => {
            const skipRequest: BoxScope = {
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d'
            }

            const { systemMessage, feedbackMessage } = await queueService.onVideoSkipped(skipRequest)

            const playingVideo = await QueueItemModel.findOne({ box: '9cb763b6e72611381ef043e7', startTime: { $ne: null }, endTime: null }).populate('video').lean()

            expect(systemMessage.contents).to.equal(`Ash Ketchum has skipped the previous video. Currently playing: "${playingVideo.video.name}".`)
            expect(feedbackMessage.contents).to.equal(`You skipped the previous video.`)

        })
    })

    describe('Replay a video', () => {
        before(async () => {
            await Subscriber.create([
                {
                    boxToken: '9cb763b6e72611381ef043e7',
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    connexions: [],
                    berries: 0,
                    role: 'admin'
                },
                {
                    boxToken: '9cb763b6e72611381ef043e7',
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    connexions: [],
                    berries: 17,
                    role: 'simple'
                },
            ])

            await Box.create([
                {
                    _id: '9cb763b6e72611381ef043e7',
                    description: 'Box with a video playing',
                    lang: 'English',
                    name: 'Box playing in random mode',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true,
                        loop: true
                    },
                    acl: {
                        moderator: [
                            'addVideo',
                            'removeVideo',
                            'promoteVIP',
                            'demoteVIP',
                            'forceNext',
                            'forcePlay'
                        ],
                        vip: [ 'addVideo', 'removeVideo', 'forceNext', 'bypassVideoDurationLimit' ],
                        simple: []
                    }
                }
            ])

            await QueueItemModel.create([
                {
                    _id: '9cb763b6e72611381ef043f4',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f3',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f2',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: true,
                    setToNext: "2019-05-31T09:19:41Z",
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f1',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f0',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
            ])
        })

        after(async () => {
            await Subscriber.deleteMany({})
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef143e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef243e7')
            await QueueItemModel.deleteMany({
                box: { $in: ['9cb763b6e72611381ef043e7', '9cb763b6e72611381ef143e7', '9cb763b6e72611381ef243e7'] }
            })
        })

        it("Refuses video if the user does not have enough ACL powers", async () => {
            try {
                await queueService.onVideoReplayed({
                    boxToken: '9cb763b6e72611381ef043e7',
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    item: '9cb763b6e72611381ef043f0'
                })
                expect.fail()
            } catch (error) {
                expect(error.message).to.equal("You do not have the authorization to do this.")
            }
        })

        it("Re-adds the video", async () => {
            const { systemMessage, feedbackMessage } = await queueService.onVideoReplayed({
                boxToken: '9cb763b6e72611381ef043e7',
                userToken: '9ca0df5f86abeb66da97ba5d',
                item: '9cb763b6e72611381ef043f0'
            })

            const replayedVideo = await QueueItemModel.findOne({ box: '9cb763b6e72611381ef043e7', _id: '9cb763b6e72611381ef043f0' }).lean()

            expect(replayedVideo.startTime).to.equal(null)
            expect(replayedVideo.endTime).to.equal(null)

            expect(systemMessage.contents).to.equal(`Ash Ketchum has re-added the video "Connected" to the queue.`)
            expect(feedbackMessage.contents).to.equal(`The video "Connected" has been re-added to the queue.`)
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
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true
                },
                {
                    _id: '9cb763b6e72611381ef043e6',
                    description: 'Box with a video playing',
                    lang: 'English',
                    name: 'Box playing',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true
                }
            ])

            await QueueItemModel.create([
                {
                    _id: '9cb763b6e72611381ef043e8',
                    box: '9cb763b6e72611381ef043e6',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043e7',
                    box: '9cb763b6e72611381ef043e6',
                    video: '9cb81150594b2e75f06ba90a',
                    // 20 seconds ago
                    startTime: new Date(Date.now() - 20000),
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                }
            ])
        })

        after(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e4')
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e6')
            await QueueItemModel.deleteMany({
                box: { $in: ['9cb763b6e72611381ef043e4', '9cb763b6e72611381ef043e6'] }
            })
        })

        it("Returns null when there's no currently playing video", async () => {
            const currentVideo = await queueService.getCurrentVideo('9cb763b6e72611381ef043e4')

            expect(currentVideo).to.equal(null)
        })

        it("Returns the currently playing video", async () => {
            const currentVideo = await queueService.getCurrentVideo('9cb763b6e72611381ef043e6')

            expect(currentVideo._id.toString()).to.equal('9cb763b6e72611381ef043e7')
            expect(currentVideo.video).to.eql({
                _id: new ObjectId('9cb81150594b2e75f06ba90a'),
                link: 'j6okxJ1CYJM',
                name: 'The Piano Before Cynthia',
                duration: 'PT2M4S'
            })
            expect(currentVideo.submitted_by).to.eql({
                _id: new ObjectId('9ca0df5f86abeb66da97ba5d'),
                name: 'Ash Ketchum',
                settings: {
                    picture: 'default-picture'
                }
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
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true
                },
                {
                    _id: '9cb763b6e72611381ff043e5',
                    description: 'Closed box',
                    lang: 'English',
                    name: 'Closed box',
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
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true
                },
                {
                    _id: '9cb763b6e72611381ef043e7',
                    description: 'Box with a video playing',
                    lang: 'English',
                    name: 'Box playing in random mode',
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
                    creator: '9ca0df5f86abeb66da97ba5d',
                    open: true,
                    options: {
                        random: true
                    }
                }
            ])

            await QueueItemModel.create([
                {
                    _id: '9cb763b6e72611381ef143e9',
                    box: '9cb763b6e72611381ff043e5',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043e8',
                    box: '9cb763b6e72611381ff043e6',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043e7',
                    box: '9cb763b6e72611381ff043e6',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f4',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f3',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f2',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f1',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f0',
                    box: '9cb763b6e72611381ef043e7',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef04505',
                    box: '9cb763b6e72611381ef04500',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef04504',
                    box: '9cb763b6e72611381ef04500',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: true,
                    setToNext: "2019-05-31T09:19:41Z",
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef04503',
                    box: '9cb763b6e72611381ef04500',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: true,
                    setToNext: "2019-05-31T09:19:42Z",
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef04502',
                    box: '9cb763b6e72611381ef04500',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef04501',
                    box: '9cb763b6e72611381ef04500',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef04400',
                    box: '9cb763b6e72611381ef043f5',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:21:27+0000",
                    endTime: "2019-05-31T09:21:29+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f9',
                    box: '9cb763b6e72611381ef043f5',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: "2019-05-31T09:21:17+0000",
                    endTime: "2019-05-31T09:21:27+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f8',
                    box: '9cb763b6e72611381ef043f5',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: "2019-05-31T09:21:14+0000",
                    endTime: "2019-05-31T09:21:17+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f7',
                    box: '9cb763b6e72611381ef043f5',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: "2019-05-31T09:21:14+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef043f6',
                    box: '9cb763b6e72611381ef043f5',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef05505',
                    box: '9cb763b6e72611381ef05500',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef05504',
                    box: '9cb763b6e72611381ef05500',
                    video: '9cb81150594b2e75f06ba90b',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: true,
                    setToNext: "2019-05-31T09:19:41",
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef05503',
                    box: '9cb763b6e72611381ef05500',
                    video: '9cb81150594b2e75f06ba8fe',
                    startTime: null,
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef05502',
                    box: '9cb763b6e72611381ef05500',
                    video: '9cb81150594b2e75f06ba90a',
                    startTime: "2019-05-31T09:21:12+0000",
                    endTime: null,
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
                },
                {
                    _id: '9cb763b6e72611381ef05501',
                    box: '9cb763b6e72611381ef05500',
                    video: '9cb81150594b2e75f06ba90c',
                    startTime: "2019-05-31T09:19:44+0000",
                    endTime: "2019-05-31T09:21:12+0000",
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false,
                    setToNext: null,
                    stateForcedWithBerries: false
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

            await QueueItemModel.deleteMany({
                box: {
                    $in: ['9cb763b6e72611381ef043e4', '9cb763b6e72611381ff043e5',
                        '9cb763b6e72611381ff043e6', '9cb763b6e72611381ef043e7',
                        '9cb763b6e72611381ef04500', '9cb763b6e72611381ef043f5',
                        '9cb763b6e72611381ef05500'
                    ]
                }
            })
        })

        it("Sends null if there's no next video", async () => {
            const nextVideo = await queueService.getNextVideo('9cb763b6e72611381ef043e4')

            expect(nextVideo).to.equal(null)
        })

        it("Get the next video if no video just ended", async () => {
            const nextVideo = await queueService.getNextVideo('9cb763b6e72611381ff043e6')

            expect(nextVideo._id.toString()).to.equal('9cb763b6e72611381ef043e8')
        })

        it("Get next video when no video was playing before", async () => {
            const nextVideo = await queueService.getNextVideo('9cb763b6e72611381ff043e5')

            expect(nextVideo._id.toString()).to.equal('9cb763b6e72611381ef143e9')
        })

        it("Gets the next video in random mode", async () => {
            const nextVideo = await queueService.getNextVideo('9cb763b6e72611381ef043e7')

            const possibleVideos = ['9cb763b6e72611381ef043f4', '9cb763b6e72611381ef043f3', '9cb763b6e72611381ef043f2']
            expect(possibleVideos).to.includes(nextVideo._id.toString())
            
            const playingVideo = await QueueItemModel.findOne({ box: '9cb763b6e72611381ef043e7', startTime: { $ne: null }, endTime: null })
            expect(possibleVideos).to.includes(playingVideo._id.toString())
        })

        it("Gets the next video in random mode even if it's way at the bottom", async () => {
            const nextVideo = await queueService.getNextVideo('9cb763b6e72611381ef043f5')

            expect(nextVideo._id.toString()).to.equal('9cb763b6e72611381ef043f6')
        })

        it('Gets the next video from the "next" mini-queue', async () => {
            const nextVideo = await queueService.getNextVideo('9cb763b6e72611381ef04500')

            expect(nextVideo._id.toString()).to.equal('9cb763b6e72611381ef04504')
            expect(nextVideo.endTime).to.equal(null)
            expect(nextVideo.setToNext).to.equal(null)
        })

        it('Gets the selected video (overwrite by forcePlay)', async () => {
            const nextVideo = await queueService.getNextVideo('9cb763b6e72611381ef05500', '9cb763b6e72611381ef05503')

            expect(nextVideo._id.toString()).to.equal('9cb763b6e72611381ef05503')
        })
    })
})
