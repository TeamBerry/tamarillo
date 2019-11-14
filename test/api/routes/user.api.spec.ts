import * as bodyParser from "body-parser"
import * as chai from "chai"
import * as express from "express"
import * as supertest from "supertest"
const expect = chai.expect

import { AuthApi } from './../../../src/api/routes/auth.api'
import UserApi from './../../../src/api/routes/user.api'
const User = require('./../../../src/models/user.model')
import { Session } from "./../../../src/models/session.model"
import { UserPlaylistClass, UserPlaylist } from './../../../src/models/user-playlist.model'
import authService from "../../../src/api/services/auth.service"

describe("User API", () => {
    const expressApp = express()

    let ashJWT: Session = null
    let foreignJWT: Session = null

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }))
        expressApp.use('/', UserApi)

        await User.deleteMany({
            _id: { $in: ['9ca0df5f86abeb66da97ba5d', '9ca0df5f86abeb66da97ba5e'] },
        })

        await UserPlaylist.deleteMany({
            _id: { $in: ['8da1e01fda34eb8c1b9db46e', '8da1e01fda34eb8c1b9db46f'] },
        })

        await User.create({
            _id: '9ca0df5f86abeb66da97ba5d',
            name: 'Ash Ketchum',
            mail: 'ash@pokemon.com',
            password: 'Pikachu',
        })

        await User.create({
            _id: '9ca0df5f86abeb66da97ba5e',
            name: 'Shirona',
            mail: 'shirona@sinnoh-league.com',
            password: 'Piano',
        })

        ashJWT = authService.createSession({ _id: '9ca0df5f86abeb66da97ba5d', mail: 'ash@pokemon.com' })
        foreignJWT = authService.createSession({ _id: '9ca0df5f86abeb66da97ba5e', mail: 'shirona@sinnoh-league.com' })

        await UserPlaylist.create({
            _id: "8da1e01fda34eb8c1b9db46e",
            name: "My First Playlist",
            isPrivate: true,
            user: "9ca0df5f86abeb66da97ba5d",
            videos: [],
        })

        await UserPlaylist.create({
            _id: "8da1e01fda34eb8c1b9db46f",
            name: "WiP Playlist 2",
            isPrivate: false,
            user: "9ca0df5f86abeb66da97ba5d",
            videos: [],
        })
    })

    after(async () => {
        await User.deleteMany({
            _id: { $in: ['9ca0df5f86abeb66da97ba5d', '9ca0df5f86abeb66da97ba5e'] },
        })

        await UserPlaylist.deleteMany({
            _id: { $in: ['8da1e01fda34eb8c1b9db46e', '8da1e01fda34eb8c1b9db46f'] },
        })
    })

    describe("Gets an user", () => {
        it("Sends a 401 back if the API is accessed from an unauthentified source", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5d')
                .expect(401)
        })

        it("Sends a 404 back if no user matches the given id", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba4e')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(404, 'USER_NOT_FOUND')
        })

        it("Sends a 200 with the user if the id matches", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5d')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(200)
        })
    })

    describe("Gets the boxes of an user", () => {
        it("Sends a 401 back if the API is accessed from an unauthentified source", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5d/boxes')
                .expect(401)
        })

        it("Sends a 404 back if no user matches the given id", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba4e/boxes')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(404, 'USER_NOT_FOUND')
        })

        it("Sends a 200 with the boxes if the id matches", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5d/boxes')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(200)
        })
    })

    describe("Gets the playlists of an user", () => {
        it("Sends a 401 back if the API is accessed from an unauthentified source", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba4e/playlists')
                .expect(401, 'UNAUTHORIZED')
        })

        it("Sends a 404 back if no user matches the given id", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba4e/playlists')
                .set('Authorization', 'Bearer ' + foreignJWT.bearer)
                .expect(404, 'USER_NOT_FOUND')
        })

        it("Sends a 200 with only public playlists if the user requesting is not the author of the playlists", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5d/playlists')
                .set('Authorization', 'Bearer ' + foreignJWT.bearer)
                .expect(200)
                .then((response) => {
                    const playlists: UserPlaylistClass[] = response.body

                    expect(playlists).to.have.lengthOf(1)
                })
        })

        it("Sends a 200 with all playlists if the user requesting is the author of the playlists", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5d/playlists')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(200)
                .then((response) => {
                    const playlists: UserPlaylistClass[] = response.body

                    expect(playlists).to.have.lengthOf(2)
                })
        })
    })
})
