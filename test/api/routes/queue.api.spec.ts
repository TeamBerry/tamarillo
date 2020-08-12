import * as bodyParser from 'body-parser'
import * as chai from "chai"
import * as express from "express"
import * as supertest from "supertest"
const expect = chai.expect

import BoxApi from './../../../src/api/routes/box.api'
const Box = require('./../../../src/models/box.model')
import { Video } from './../../../src/models/video.model'
import { Session } from "./../../../src/models/session.model"
import { UserPlaylistClass, UserPlaylist, UserPlaylistDocument } from '../../../src/models/user-playlist.model';
import authService from '../../../src/api/services/auth.service'
import { Subscriber, ActiveSubscriber } from '../../../src/models/subscriber.model'
import { User } from '../../../src/models/user.model'
import { QueueItem } from '@teamberry/muscadine'

describe("Queue API", () => {
    const expressApp = express()

    let ashJWT: Session = null
    let shironaJWT: Session = null
    let brockJWT: Session = null

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }))
        expressApp.use('/', BoxApi)

        await Box.deleteMany({})
        await User.deleteMany({})
        await Video.deleteMany({})
        await UserPlaylist.deleteMany({})
        await Subscriber.deleteMany({})

        const ashUser = await User.create({
            _id: '9ca0df5f86abeb66da97ba5d',
            name: 'Ash Ketchum',
            mail: 'ash@pokemon.com',
            password: 'Pikachu',
        })

        const shironaUser = await User.create({
            _id: '9ca0df5f86abeb66da97ba5e',
            name: 'Shirona',
            mail: 'shirona@sinnoh-league.com',
            password: 'Piano',
        })

        const brockUser = await User.create({
            _id: '9ca0df5f86abeb66da97ba5f',
            name: 'Brock',
            mail: 'brock@pokemon.com',
            password: 'Joel'
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
                    submittedAt: "2019-05-31T09:19:41+0000",
                    submitted_by: '9ca0df5f86abeb66da97ba5d',
                    isPreselected: false
                }
            ],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: false,
            options: {
                random: true,
                loop: false
            }
        })

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

        ashJWT = authService.createSession(ashUser)
        shironaJWT = authService.createSession(shironaUser)
        brockJWT = authService.createSession(brockUser)
    })

    after(async () => {
        await Box.deleteMany({})
        await User.deleteMany({})
        await Video.deleteMany({})
        await UserPlaylist.deleteMany({})
        await Subscriber.deleteMany({})
    })

    describe("Get box queue", () => {
        before(async () => {
            await Box.create([
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
                    private: true,
                    options: {
                        random: true,
                        loop: true,
                        berries: true
                    }
                },
                {
                    _id: '9cb763b6e72611381ef063f4',
                    description: null,
                    lang: 'English',
                    name: 'Box with a 3 Minute duration restriction',
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
                    private: false,
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
                }
            ])
        })

        after(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e4')
            await Box.findByIdAndDelete('9cb763b6e72611381ef053f4')
            await Box.findByIdAndDelete('9cb763b6e72611381ef063f4')
            await Subscriber.deleteMany({})
        })

        it("Sends the private box queue", () => {
            return supertest(expressApp)
                .get('/9cb763b6e72611381ef053f4/queue')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(200)
        })

        it("Sends the public box queue", () => {
            return supertest(expressApp)
                .get('/9cb763b6e72611381ef063f4/queue')
                .expect(200)
                .then((response) => {
                    const queue = response.body

                    expect(queue).to.length(1)
                })
        })
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
                    _id: '9cb763b6e72611381ef063f4',
                    description: null,
                    lang: 'English',
                    name: 'Box with a 3 Minute duration restriction',
                    playlist: [
                    ],
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
                    boxToken: '9cb763b6e72611381ef053f4',
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
                }
            ])
        })

        after(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e4')
            await Box.findByIdAndDelete('9cb763b6e72611381ef053f4')
            await Subscriber.deleteMany({})
        })

        const video = {
            _id: '9cb81150594b2e75f06ba8fe',
            link: 'Ivi1e-yCPcI',
            name: 'Destroid - Annihilate',
            duration: 'PT5M11S'
        }

        it("Refuses the submission if there's no link sent", async () => {
            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043e4/queue')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .expect(412, 'MISSING_PARAMETERS')
        })

        it("Refuses the submission if the user does not have sufficient ACL powers", async () => {
            return supertest(expressApp)
                .post('/9cb763b6e72611381ef053f4/queue')
                .set('Authorization', `Bearer ${shironaJWT.bearer}`)
                .send({ link: 'Ivi1e-yCPcI' })
                .expect(403)
        })

        it("Refuses the submission if the video does not exist", async () => {
            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043e4/queue')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .send({ link: 'notFound' })
                .expect(404, 'VIDEO_NOT_FOUND')
        })

        it("Refuses the submission if the video cannot be played remotely", async () => {
            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043e4/queue')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .send({ link: 'CwiHSG_tYaQ' })
                .expect(403, 'EMBED_NOT_ALLOWED')
        })

        it("Refuses the submission if the video is too long for the restriction put in place", async () => {
            return supertest(expressApp)
                .post('/9cb763b6e72611381ef063f4/queue')
                .set('Authorization', `Bearer ${shironaJWT.bearer}`)
                .send({ link: 'Ivi1e-yCPcI' })
                .expect(403, 'DURATION_EXCEEDED')
        })

        describe("Accepts a video that exceeds the duration if the user has the power to bypass the restriction", async () => {
            it("User is admin", () => {
                return supertest(expressApp)
                    .post('/9cb763b6e72611381ef063f4/queue')
                    .set('Authorization', `Bearer ${ashJWT.bearer}`)
                    .send({ link: 'Ivi1e-yCPcI' })
                    .expect(200)
            })

            it("User has ACL powers", () => {
                return supertest(expressApp)
                    .post('/9cb763b6e72611381ef063f4/queue')
                    .set('Authorization', `Bearer ${brockJWT.bearer}`)
                    .send({ link: 'Ivi1e-yCPcI' })
                    .expect(200)
            })
        })

        it("Accepts the video even if it already is in the queue, without adding it", async () => {
            return supertest(expressApp)
                .post('/9cb763b6e72611381ef053f4/queue')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .send({ link: 'Ivi1e-yCPcI' })
                .send({ link: 'Ivi1e-yCPcI' })
                .expect(200)
                .then((response) => {
                    const updatedBox = response.body

                    expect(updatedBox.playlist).to.length(1)
                })
        })

        it("Accepts the video and sends back the updated box", async () => {
            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043e4/queue')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .send({ link: 'Ivi1e-yCPcI' })
                .expect(200)
                .then((response) => {
                    const updatedBox = response.body

                    expect(updatedBox.playlist).to.length(1)
                })
        })
    })

    describe("Play video next", () => {
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
                    private: false,
                    options: {
                        random: true,
                        loop: false,
                        berries: true,
                        videoMaxDurationLimit: 0
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
                        loop: false
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
                        loop: false
                    }
                },
                {
                    _id: '9cb763b6e72611381ef343e7',
                    description: 'Box with a video playing and a preselected video with berries',
                    lang: 'English',
                    name: 'Box playing in loop + random mode',
                    playlist: [
                        {
                            _id: '9cb763b6e72611381ef343f4',
                            video: '9cb81150594b2e75f06ba90c',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: false
                        },
                        {
                            _id: '9cb763b6e72611381ef343f3',
                            video: '9cb81150594b2e75f06ba90b',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: true
                        },
                        {
                            _id: '9cb763b6e72611381ef343f2',
                            video: '9cb81150594b2e75f06ba8fe',
                            startTime: null,
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: false
                        },
                        {
                            _id: '9cb763b6e72611381ef343f1',
                            video: '9cb81150594b2e75f06ba90a',
                            startTime: "2019-05-31T09:21:12+0000",
                            endTime: null,
                            submittedAt: "2019-05-31T09:19:41+0000",
                            submitted_by: '9ca0df5f86abeb66da97ba5d',
                            isPreselected: false,
                            stateForcedWithBerries: false
                        },
                        {
                            _id: '9cb763b6e72611381ef343f0',
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
                        loop: true
                    }
                }
            ])
        })

        afterEach(async () => {
            await Box.findByIdAndDelete('9cb763b6e72611381ef043e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef143e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef243e7')
            await Box.findByIdAndDelete('9cb763b6e72611381ef343e7')
        })

        it('Refuses if the video does not exist in the queue', async () => {
            return supertest(expressApp)
                .put('/9cb763b6e72611381ef043e7/queue/8cb763b6e72611381ef043f4/next')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .expect(404, 'VIDEO_NOT_FOUND')
        })

        it('Refuses if the video is playing', async () => {
            return supertest(expressApp)
                .put('/9cb763b6e72611381ef043e7/queue/9cb763b6e72611381ef043f1/next')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .expect(409, 'VIDEO_ALREADY_PLAYING')
        })

        it('Refuses if the video has been played (non-loop)', async () => {
            return supertest(expressApp)
                .put('/9cb763b6e72611381ef043e7/queue/9cb763b6e72611381ef043f0/next')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .expect(409, 'VIDEO_ALREADY_PLAYED')
        })

        it('Refuses if the non-admin user does not have enough berries', async () => {
            return supertest(expressApp)
                .put('/9cb763b6e72611381ef043e7/queue/9cb763b6e72611381ef043f4/next')
                .set('Authorization', `Bearer ${shironaJWT.bearer}`)
                .expect(403, 'BERRIES_INSUFFICIENT')
        })

        it('Refuses if there is another video already preselected with berries', async () => {
            return supertest(expressApp)
                .put('/9cb763b6e72611381ef243e7/queue/9cb763b6e72611381ef243f4/next')
                .set('Authorization', `Bearer ${brockJWT.bearer}`)
                .expect(403, 'ANOTHER_TRACK_PRESELECTED')
        })

        it('Accepts the non-admin requests and subtracts the amount of berries', async () => {
            return supertest(expressApp)
                .put('/9cb763b6e72611381ef143e7/queue/9cb763b6e72611381ef143f4/next')
                .set('Authorization', `Bearer ${brockJWT.bearer}`)
                .expect(200)
                .then(async () => {
                    const box = await Box.findById('9cb763b6e72611381ef143e7')

                    const preselectedVideo: QueueItem = box.playlist.find((queueItem: QueueItem) => queueItem._id.toString() === '9cb763b6e72611381ef143f4')

                    const targetSubscription = await Subscriber.findOne({ userToken: '9ca0df5f86abeb66da97ba5f', boxToken: '9cb763b6e72611381ef143e7' })

                    expect(targetSubscription.berries).to.equal(1)
                    expect(preselectedVideo.isPreselected).to.equal(true)
                    expect(preselectedVideo.stateForcedWithBerries).to.equal(true)
                })
        })

        it('Accepts the played video in loop mode', async () => {
            return supertest(expressApp)
                .put('/9cb763b6e72611381ef343e7/queue/9cb763b6e72611381ef343f0/next')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .expect(200)
                .then(async () => {
                    const box = await Box.findById('9cb763b6e72611381ef343e7')

                    const preselectedVideo = box.playlist.find(video => video._id.toString() === '9cb763b6e72611381ef343f0')

                    expect(preselectedVideo.isPreselected).to.equal(true)
                })
        })

        it('Preselects a video if no other video is preselected', async () => {
            return supertest(expressApp)
                .put('/9cb763b6e72611381ef043e7/queue/9cb763b6e72611381ef043f4/next')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .expect(200)
                .then(async () => {
                    const box = await Box.findById('9cb763b6e72611381ef043e7')

                    const preselectedVideo = box.playlist.find(video => video._id.toString() === '9cb763b6e72611381ef043f4')

                    expect(preselectedVideo.isPreselected).to.equal(true)
                })
        })

        it('Preselects a video and unselects the preselected one if it is different', async () => {
            await supertest(expressApp)
                .put('/9cb763b6e72611381ef043e7/queue/9cb763b6e72611381ef043f4/next')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)

            return supertest(expressApp)
                .put('/9cb763b6e72611381ef043e7/queue/9cb763b6e72611381ef043f3/next')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .expect(200)
                .then(async () => {

                    const box = await Box.findById('9cb763b6e72611381ef043e7')

                    const previousSelectedVideo = box.playlist.find(video => video._id.toString() === '9cb763b6e72611381ef043f4')
                    expect(previousSelectedVideo.isPreselected).to.equal(false)

                    const preselectedVideo = box.playlist.filter(video => video.isPreselected)
                    expect(preselectedVideo).to.have.lengthOf(1)

                    expect(preselectedVideo[0]._id.toString()).to.equal('9cb763b6e72611381ef043f3')
            })

        })

        it('Unselects a video if it is the one preselected', async () => {
        await supertest(expressApp)
            .put('/9cb763b6e72611381ef043e7/queue/9cb763b6e72611381ef043f4/next')
            .set('Authorization', `Bearer ${ashJWT.bearer}`)

        return supertest(expressApp)
            .put('/9cb763b6e72611381ef043e7/queue/9cb763b6e72611381ef043f4/next')
            .set('Authorization', `Bearer ${ashJWT.bearer}`)
            .expect(200)
            .then(async () => {
                const box = await Box.findById('9cb763b6e72611381ef043e7')

                const previousSelectedVideo = box.playlist.find(video => video._id.toString() === '9cb763b6e72611381ef043f4')
                expect(previousSelectedVideo.isPreselected).to.equal(false)

                const preselectedVideo = box.playlist.filter(video => video.isPreselected)
                expect(preselectedVideo).to.have.lengthOf(0)
            })
        })
    })
});
