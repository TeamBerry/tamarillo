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
            password: 'Pikachu',
        })

        const adminUser = await User.create({
            _id: '9ca0df5f86abeb66da97ba60',
            name: 'Admin',
            mail: 'admin@berrybox.com',
            password: 'Berrybox'
        })

        ashJWT = authService.createSession(ashUser)
        adminJWT = authService.createSession(adminUser)
    })

    after(async () => {
        await Badge.deleteMany({})
    })

    it("Gets all badges", async () => {
        return supertest(expressApp)
            .get('/')
            .expect(200)
            .then((response) => {
                const badges: Array<BadgeDocument> = response.body

                expect(badges).to.have.lengthOf(1)
        })
    })

    describe("Create a badge", () => {
        it("Fails if the user does not have the credentials", () => {
            return supertest(expressApp)
                .post('/')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .send({
                    name: '1 Year Anniversary',
                    picture: 'https://berrybox-badges.s3-eu-west-1.amazonaws.com/1-yr.png',
                    description: 'For your 1 year of Berrybox',
                    availableFrom: null,
                    availableTo: null
                })
                .expect(401, 'UNAUTHORIZED')
        })

        it("Fails if the body is empty", () => {
            return supertest(expressApp)
                .post('/')
                .set('Authorization', `Bearer ${adminJWT.bearer}`)
                .send()
                .expect(412)
        })

        it("Creates the badge", () => {
            return supertest(expressApp)
                .post('/')
                .set('Authorization', `Bearer ${adminJWT.bearer}`)
                .send({
                    name: '1 Year Anniversary',
                    picture: 'https://berrybox-badges.s3-eu-west-1.amazonaws.com/1-yr.png',
                    description: 'For your 1 year of Berrybox',
                    availableFrom: null,
                    availableTo: null
                })
                .expect(201)
        })
    })
})