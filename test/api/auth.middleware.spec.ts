import * as express from "express"
import * as bodyParser from "body-parser"
import * as supertest from "supertest"
import * as chai from "chai"

describe("Auth Middleware", () => {
    const expressApp = express()

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }))
    })

    it("Refuses access if there's no given JWT", () => {
        return supertest(expressApp)
            .get('/9ca0df5f86abeb66da97ba5d/playlists')
            .expect(401)
    })

    it("Refuses access if the JWT is invalid", () => {

    })

    it("Refuses access if the JWT has expired", () => {

    })

    it("Allows access if there's a valid JWT", () => {

    })
})
