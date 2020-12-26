import * as bodyParser from 'body-parser'
import * as chai from 'chai'
import * as express from 'express'
import * as supertest from 'supertest'
import authService from '../../../src/api/services/auth.service'
const expect = chai.expect

import { Badge, BadgeDocument } from '../../../src/models/badge.model'
import { User } from '../../../src/models/user.model'
import BadgeApi from './../../../src/api/routes/badge.api'
import { Session } from "./../../../src/models/session.model"

describe("Badge API", () => {
    const expressApp = express()

    let ashJWT: Session = null
    let adminJWT: Session = null

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }))
        expressApp.use('/', BadgeApi)

        const ashUser = await User.create({
            _id: '9ca0df5f86abeb66da97ba5d',
            name: 'Ash Ketchum',
            mail: 'ash@pokemon.com',
            password: 'Pikachu'
        })

        const adminUser = await User.create({
            _id: '9ca0df5f86abeb66da97ba60',
            name: 'Admin',
            mail: 'admin@berrybox.com',
            password: 'Berrybox'
        })

        ashJWT = authService.createSession(ashUser)
        adminJWT = authService.createSession(adminUser)

        await Badge.create([
            {
                _id: '5fd8d15e9b531221851e7ca9',
                name: 'V2 Beta',
                picture: '',
                description: 'V2 Beta',
                isSecret: false,
                availableFrom: null,
                availableTo: '2021-05-30T23:59:59Z',
                unlockConditions: {
                    key: 'box.join',
                    value: 'blueberry',
                    valueType: 'string'
                }
            },
            {
                _id: '5fd8d15e9b531221851e7cb0',
                name: 'Expired Beta Badger',
                picture: '',
                description: 'V1 Beta',
                isSecret: false,
                availableFrom: null,
                availableTo: '2017-10-31T23:59:59Z',
                unlockConditions: {
                    key: 'box.join',
                    value: 'oldberry',
                    valueType: 'string'
                }
            },
            {
                _id: '5fd8d15e9b531221851e7cb1',
                name: '2022 Badge',
                picture: '',
                description: '2022',
                isSecret: false,
                availableFrom: '2022-01-01T00:00:00Z',
                availableTo: '2022-12-31T23:59:59Z',
                unlockConditions: {
                    key: 'box.join',
                    value: '2022berry',
                    valueType: 'string'
                }
            },
            {
                _id: '5fd8d15e9b531221851e7cb2',
                name: 'Resident I',
                picture: '',
                description: '50 Berries',
                isSecret: false,
                availableFrom: null,
                availableTo: null,
                unlockConditions: {
                    key: 'subscription.berries',
                    value: 50,
                    valueType: 'number'
                }
            },
            {
                _id: '5fd8d15e9b531221851e7cb3',
                name: 'Resident II',
                picture: '',
                description: '200 Berries',
                isSecret: false,
                availableFrom: null,
                availableTo: null,
                unlockConditions: {
                    key: 'subscription.berries',
                    value: 200,
                    valueType: 'number'
                }
            }
        ])
    })

    after(async () => {
        await Badge.deleteMany({})
        await User.deleteMany({})
    })

    it("Gets all badges", async () => supertest(expressApp)
        .get('/')
        .expect(200)
        .then(response => {
            const badges: Array<BadgeDocument> = response.body

            expect(badges).to.have.lengthOf(5)
        }))

    describe("Create a badge", () => {
        it("Fails if the user does not have the credentials", () => supertest(expressApp)
            .post('/')
            .set('Authorization', `Bearer ${ashJWT.bearer}`)
            .send({
                name: '1 Year Anniversary',
                picture: 'https://berrybox-badges.s3-eu-west-1.amazonaws.com/1-yr.png',
                description: 'For your 1 year of Berrybox',
                availableFrom: null,
                availableTo: null,
                unlockConditions: {
                    key: 'user.life',
                    value: 525600,
                    valueType: 'number'
                }
            })
            .expect(401, 'UNAUTHORIZED'))

        it("Fails if the body is empty", () => supertest(expressApp)
            .post('/')
            .set('Authorization', `Bearer ${adminJWT.bearer}`)
            .send()
            .expect(412))

        it("Creates the badge", () => supertest(expressApp)
            .post('/')
            .set('Authorization', `Bearer ${adminJWT.bearer}`)
            .send({
                name: '1 Year Anniversary',
                picture: 'https://berrybox-badges.s3-eu-west-1.amazonaws.com/1-yr.png',
                description: 'For your 1 year of Berrybox',
                availableFrom: null,
                availableTo: null,
                unlockConditions: {
                    key: 'user.life',
                    value: 525600,
                    valueType: 'number'
                }
            })
            .expect(201))
    })
})
