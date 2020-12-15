import * as bodyParser from 'body-parser'
import * as chai from 'chai'
import * as express from 'express'
import * as supertest from 'supertest'
const expect = chai.expect

import { Badge, BadgeDocument } from '../../../src/models/badge.model'
import BadgeApi from './../../../src/api/routes/badge.api'

describe("Badge API", () => {
    const expressApp = express()

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }))
        expressApp.use('/', BadgeApi)

        await Badge.create([
            {
                name: 'Beta Tester',
                picture: 'https://berrybox-badges.s3-eu-west-1.amazonaws.com/beta-badge.png',
                description: 'Awarded to those who have participated in the Mobile Beta Phase',
                availableFrom: null,
                availableTo: '2020-12-31T23:59:59Z'
            }
        ])
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
})