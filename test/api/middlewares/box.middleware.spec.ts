import * as bodyParser from 'body-parser'
import * as chai from "chai"
import * as express from "express"
import * as supertest from "supertest"
const expect = chai.expect

import BoxApi from './../../../src/api/routes/box.api'
const Box = require('./../../../src/models/box.model')
import { Video } from './../../../src/models/video.model'
import { Session } from "./../../../src/models/session.model"
import authService from '../../../src/api/services/auth.service'
import { Subscriber } from '../../../src/models/subscriber.model'
import { User } from '../../../src/models/user.model'
import { QueueItemModel } from '../../../src/models/queue-item.model'

describe("Box Middleware", () => {
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

        await Box.create([
            {
                _id: '9cb763b6e72611381ef053f4',
                description: null,
                lang: 'English',
                name: 'Box with a video already added to it',
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
            },
            {
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
            }
        ])

        await QueueItemModel.create([
            {
                box: '9cb763b6e72611381ef063f4',
                isPreselected: false,
                stateForcedWithBerries: false,
                _id: '9cb763b6e72611381ef04402',
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

        ashJWT = authService.createSession(ashUser)
        shironaJWT = authService.createSession(shironaUser)
        brockJWT = authService.createSession(brockUser)
    })

    after(async () => {
        await Box.deleteMany({})
        await User.deleteMany({})
        await Video.deleteMany({})
        await Subscriber.deleteMany({})
        await QueueItemModel.deleteMany({})
    })

    describe("Privacy", () => {
        it("Sends a 404 if the box does not exist", () => {
            return supertest(expressApp)
                .get('/9cb763b6e72611381ef053f5/queue')
                .expect(404, 'BOX_NOT_FOUND')
        })

        it("Sends a 404 if the box is private and the user is not authenticated", () => {
            return supertest(expressApp)
                .get('/9cb763b6e72611381ef053f4/queue')
                .expect(404, 'BOX_NOT_FOUND')
        })

        it("Sends a 404 if the box is private, the user is authenticated but never accessed the box", () => {
            return supertest(expressApp)
                .get('/9cb763b6e72611381ef053f4/queue')
                .set('Authorization', `Bearer ${shironaJWT.bearer}`)
                .expect(404, 'BOX_NOT_FOUND')
        })

        it("Lets the request go through if the box is private, the user is authenticated and has access to the box", () => {
            return supertest(expressApp)
                .get('/9cb763b6e72611381ef053f4/queue')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(200)
        })

        it("Lets the request go through if the box is public", () => {
            return supertest(expressApp)
                .get('/9cb763b6e72611381ef063f4/queue')
                .expect(200)
                .then((response) => {
                    const queue = response.body

                    expect(queue).to.length(1)
                })
        })
    })

    describe("Box Open", () => {
        it("Refuses request if the box is closed", async () => {
            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043e5/queue')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .send({ _id: '9cb81150594b2e75f06ba8fe' })
                .expect(403, 'BOX_CLOSED')
        })
    })
})