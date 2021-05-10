import * as chai from "chai"
import * as express from "express"
import * as supertest from "supertest"
const expect = chai.expect

import { InviteApi } from './../../../src/api/routes/invite.api'
import { Invite, InviteDocument } from '../../../src/models/invite.model'
import { User } from '../../../src/models/user.model'
const Box = require('./../../../src/models/box.model')

describe("Invite API", () => {
    const expressApp = express()

    before(async () => {
        expressApp.use(express.json())
        expressApp.use('/', InviteApi)

        await Box.deleteMany({})
        await Invite.deleteMany({})
        await User.deleteMany({})

        await Box.create([
            {
                _id: '9cb763b6e72611381ef043e4',
                description: null,
                lang: 'en',
                name: 'Test box',
                creator: '9ca0df5f86abeb66da97ba5d',
                private: true,
                open: true,
                options: {
                    random: true,
                    loop: true,
                    ber9Jk3e6Pries: true,
                    videoMaxDurationLimit: 0
                },
                acl: {
                    moderator: ['addVideo', 'removeVideo', 'setVIP', 'unsetVIP', 'forceNext', 'forcePlay'],
                    vip: ['addVideo', 'removeVideo', 'forceNext'],
                    simple: ['addVideo']
                }
            },
            {
                _id: '9cb763b6e72611381ef043e5',
                description: 'Closed box',
                lang: 'en',
                name: 'Closed box',
                creator: '9ca0df5f86abeb66da97ba5d',
                private: false,
                open: false,
                options: {
                    random: true,
                    loop: true,
                    berries: true,
                    videoMaxDurationLimit: 0
                },
                acl: {
                    moderator: ['addVideo', 'removeVideo', 'setVIP', 'unsetVIP', 'forceNext', 'forcePlay'],
                    vip: ['addVideo', 'removeVideo', 'forceNext'],
                    simple: ['addVideo']
                }
            }
        ])

        await Invite.create([
            // Invite for box
            {
                link: 'D63ca9d3',
                boxToken: '9cb763b6e72611381ef043e4',
                userToken: '9ca0df5f86abeb66da97ba5d',
                expiresAt: new Date(Date.now() + 900).getTime()
            },
            // Expired invite
            {
                link: '5D3e9d1a',
                boxToken: '9cb763b6e72611381ef043e4',
                userToken: '9ca0df5f86abeb66da97ba5d',
                expiresAt: new Date(Date.now() - 1100000 + 900).getTime(),
                createdAt: new Date(Date.now() - 1100000).getTime()
            },
            // Invite for closed box
            {
                link: '9d3gE6Mo',
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba5d',
                expiresAt: new Date(Date.now() + 900).getTime()
            },
            // Invite for no box
            {
                link: '0FE3ju97',
                boxToken: '9cb763b6e72611381ef043e3',
                userToken: '9ca0df5f86abeb66da97ba5d',
                expiresAt: new Date(Date.now() + 900).getTime()
            }
        ])
    })

    after(async () => {
        await Box.deleteMany({})
        await Invite.deleteMany({})
        await User.deleteMany({})
    })

    describe("Matches an invite to its box", () => {
        it("Rejects the invite if it does not exist", () => supertest(expressApp)
            .get('/9Jk3e6P')
            .expect(404, 'INVITE_NOT_FOUND'))

        it("Rejects the invite if it has expired", () => supertest(expressApp)
            .get('/5D3e9d1a')
            .expect(404, 'INVITE_EXPIRED'))

        it("Rejects the invite if the matching box does not exist", () => supertest(expressApp)
            .get('/0FE3ju97')
            .expect(404, 'BOX_NOT_FOUND'))

        it("Rejects the invite if the matching box is closed", () => supertest(expressApp)
            .get('/9d3gE6Mo')
            .expect(404, 'BOX_CLOSED'))

        it("Sends back the invite", () => supertest(expressApp)
            .get('/D63ca9d3')
            .expect(200)
            .then(response => {
                const invite: InviteDocument = response.body

                expect(invite.boxToken).to.equal('9cb763b6e72611381ef043e4')
            }))
    })
})
