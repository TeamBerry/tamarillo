import * as express from "express"
import * as supertest from "supertest"

describe("Auth Middleware", () => {
    const expressApp = express()

    before(async () => {
        expressApp.use(express.json())
    })

    it("Refuses access if there's no given JWT", () => supertest(expressApp)
        .get('/9ca0df5f86abeb66da97ba5d/playlists')
        .expect(401))

    it("Refuses access if the JWT is invalid", () => {

    })

    it("Refuses access if the JWT has expired", () => {

    })

    it("Allows access if there's a valid JWT", () => {

    })
})
