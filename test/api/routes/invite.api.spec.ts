import * as chai from "chai"
import * as express from "express"
import * as supertest from "supertest"
const expect = chai.expect

import { Invite, InviteDocument } from '../../../src/models/invite.model'
import { User } from '../../../src/models/user.model'
const Box = require('./../../../src/models/box.model')
import authService from '../../../src/api/services/auth.service'
import { Session } from "../../../src/models/session.model"
import { BoxApi } from "../../../src/api/routes/box.api"

describe("Box Invites API", () => {
    const expressApp = express()
    let ashJWT: Session = null

    before(async () => {
        expressApp.use(express.json())
        expressApp.use('/', BoxApi)

        await Box.deleteMany({})
        await Invite.deleteMany({})
        await User.deleteMany({})

        const ashUser = await User.create({
            _id: '9ca0df5f86abeb66da97ba5d',
            name: 'Ash Ketchum',
            mail: 'ash@pokemon.com',
            password: 'Pikachu'
        })
        ashJWT = authService.createSession(ashUser)

        await Box.create([
            {
                _id: '9cb763b6e72611381ef043e4',
                description: null,
                lang: 'en',
                name: 'Test box',
                creator: '9ca0df5f86abeb66da97ba5d',
                private: false,
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
                _id: '7a9a64ce61afbe3404dac3be',
                link: 'D63ca9d3',
                boxToken: '9cb763b6e72611381ef043e4',
                userToken: '9ca0df5f86abeb66da97ba5d',
                expiresAt: new Date(Date.now() + 900).getTime()
            },
            // Expired invite
            {
                _id: '7a9a64ce61afbe3404dac3bf',
                link: '5D3e9d1a',
                boxToken: '9cb763b6e72611381ef043e4',
                userToken: '9ca0df5f86abeb66da97ba5d',
                expiresAt: new Date(Date.now() - 1100000 + 900).getTime(),
                createdAt: new Date(Date.now() - 1100000).getTime()
            },
            // Invite for closed box
            {
                _id: '7a9a64ce61afbe3404dac3c0',
                link: '9d3gE6Mo',
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba5d',
                expiresAt: new Date(Date.now() + 900).getTime()
            },
        ])
    })

    after(async () => {
        await Box.deleteMany({})
        await Invite.deleteMany({})
        await User.deleteMany({})
    })

    it("Gets all the valid invites of a box", () => supertest(expressApp)
        .get('/9cb763b6e72611381ef043e4/invites')
        .set('Authorization', `Bearer ${ashJWT.bearer}`)
        .expect(200)
        .then(response => {
            const invites = response.body

            expect(invites).to.length(1)
        })
    )

    it("Deletes an invite", () => supertest(expressApp)
        .delete('/9cb763b6e72611381ef043e4/invites/7a9a64ce61afbe3404dac3bf')
        .set('Authorization', `Bearer ${ashJWT.bearer}`)
        .expect(200)
    )
})