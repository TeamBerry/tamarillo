import * as bodyParser from 'body-parser'
import * as chai from "chai"
import * as express from "express"
import * as supertest from "supertest"
const expect = chai.expect

import InviteApi from './../../../src/api/routes/invite.api'

describe("Invite API", () => {
    const expressApp = express()

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }))
        expressApp.use('/', InviteApi)

        // Create invite with no box

        // Create invite with box but expired

        // Create invite with box
     })

    after(async () => { })

    describe("Matches an invite to its box", () => {
        it("Rejects the invite if it does not exist", () => { })
        it("Rejects the invite if it has expired", () => { })
        it("Rejects the invite if the matching box does not exist", () => { })
        it("Sends back the invite", () => { })
    })
})