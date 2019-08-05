import * as bodyParser from "body-parser"
import * as chai from "chai"
import * as express from "express"
import * as supertest from "supertest"
const expect = chai.expect

import PlaylistApi from './../../../src/api/routes/playlist.api'
import { AuthApi } from './../../../src/api/routes/auth.api'
import UserApi from './../../../src/api/routes/user.api'
const User = require('./../../../src/models/user.model')
import { Session } from "./../../../src/models/session.model"
import { UserPlaylist, UsersPlaylist } from './../../../src/models/user-playlist.model'

describe.only("Playlists API", () => {
    const expressApp = express()

    let ashJWT: Session = null
    let foreignJWT: Session = null

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }))
        expressApp.use('/', PlaylistApi)

        await User.deleteMany({
            _id: { $in: ['9ca0df5f86abeb66da97ba5d', '9ca0df5f86abeb66da97ba5e'] },
        })

        await UsersPlaylist.deleteMany({
            _id: { $in: ['8da1e01fda34eb8c1b9db46e', '8da1e01fda34eb8c1b9db46f', '8da1e01fda34eb8c1b9db46a'] },
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

        ashJWT = AuthApi.prototype.createSession({ _id: '9ca0df5f86abeb66da97ba5d', mail: 'ash@pokemon.com' })
        foreignJWT = AuthApi.prototype.createSession({ _id: '9ca0df5f86abeb66da97ba5e', mail: 'shirona@sinnoh-league.com' })

        await UsersPlaylist.create({
            _id: "8da1e01fda34eb8c1b9db46e",
            name: "My First Playlist",
            isPrivate: true,
            user: "9ca0df5f86abeb66da97ba5d",
            videos: [],
        })

        await UsersPlaylist.create({
            _id: "8da1e01fda34eb8c1b9db46f",
            name: "WiP Playlist 2",
            isPrivate: false,
            user: "9ca0df5f86abeb66da97ba5d",
            videos: [],
        })
    })

    after(async () => {
        await UsersPlaylist.deleteMany({
            _id: { $in: ['8da1e01fda34eb8c1b9db46e', '8da1e01fda34eb8c1b9db46f', '8da1e01fda34eb8c1b9db46a'] },
        })

        await User.deleteMany({
            _id: { $in: ['9ca0df5f86abeb66da97ba5d', '9ca0df5f86abeb66da97ba5e'] },
        })
    })

    describe("Gets a playlist", () => {
        it("Sends a 401 if trying to get a private playlist without authorization", () => {
            return supertest(expressApp)
                .get('/8da1e01fda34eb8c1b9db46e')
                .expect(401, 'UNAUTHORIZED')
        })

        it("Sends a 404 back if no playlist matches the given id", () => {
            return supertest(expressApp)
                .get('/8da1e01fda34eb8c1b9db47e')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(404, 'PLAYLIST_NOT_FOUND')
        })

        it("Sends a 200 with the private playlist if JWT is valid and matching", () => {
            return supertest(expressApp)
                .get('/8da1e01fda34eb8c1b9db46e')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(200)
        })

        it("Sends a 200 with the public playlist", () => {
            return supertest(expressApp)
                .get('/8da1e01fda34eb8c1b9db46f')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(200)
        })
    })

    describe("Posts a playlist", () => {
        it("Sends a 401 if an attempt is made without authorization", () => {
            return supertest(expressApp)
                .post('/')
                .expect(401, 'UNAUTHORIZED')
        })

        it("Sends a 412 if no request body is given", () => {
            return supertest(expressApp)
                .post('/')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(412, 'MISSING_PARAMETERS')
        })

        it("Sends a 201 with the created box", () => {
            return supertest(expressApp)
                .post('/')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send({
                    _id: "8da1e01fda34eb8c1b9db46a",
                    name: "My New Playlist",
                    isPrivate: true,
                    user: "9ca0df5f86abeb66da97ba5d",
                    videos: [],
                })
                .expect(201)
        })
    })

    describe("Updates a playlist", () => {
        it("Sends a 412 if no request body is given", () => {
            return supertest(expressApp)
                .put('/8da1e01fda34eb8c1b9db46f')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(412, 'MISSING_PARAMETERS')
        })

        it("Sends a 412 if the request parameter and the _id given in the request body don't match", () => {
            return supertest(expressApp)
                .put('/8da1e01fda34eb8c1b9db46f')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send({
                    _id: "8da1e01fda34eb8c1b9db48f",
                    name: "WiP Playlist 4",
                    isPrivate: false,
                    user: "9ca0df5f86abeb66da97ba5d",
                    videos: [],
                })
                .expect(412, 'IDENTIFIER_MISMATCH')
        })

        it("Sends a 404 back if no playlist matches the id given", () => {
            return supertest(expressApp)
                .put('/8da1e01fda34eb8c1b9db47f')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send({
                    _id: "8da1e01fda34eb8c1b9db47f",
                    name: "This playlist does not exist",
                    isPrivate: false,
                    user: "9ca0df5f86abeb66da97ba5d",
                    videos: [],
                })
                .expect(404, 'PLAYLIST_NOT_FOUND')
        })

        it("Sends a 401 if trying to update a playlist without being the owner", () => {
            return supertest(expressApp)
                .put('/8da1e01fda34eb8c1b9db46f')
                .set('Authorization', 'Bearer ' + foreignJWT.bearer)
                .send({
                    _id: "8da1e01fda34eb8c1b9db46f",
                    name: "WiP Playlist 2 Modified",
                    isPrivate: false,
                    user: "9ca0df5f86abeb66da97ba5d",
                    videos: [],
                })
                .expect(401, 'UNAUTHORIZED')
        })

        it("Sends a 200 with the updated playlist", () => {
            return supertest(expressApp)
                .put('/8da1e01fda34eb8c1b9db46f')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send({
                    _id: "8da1e01fda34eb8c1b9db46f",
                    name: "WiP Playlist 2 Modified",
                    isPrivate: false,
                    user: "9ca0df5f86abeb66da97ba5d",
                    videos: [],
                })
                .expect(200)
        })
    })

    describe("Deletes a playlist", () => {
        it("Sends a 401 if trying to get a private playlist without authorization", () => {
            return supertest(expressApp)
                .delete('/8da1e01fda34eb8c1b9db46f')
                .expect(401, 'UNAUTHORIZED')
        })

        it("Sends a 404 back if no playlist matches the id given", () => {
            return supertest(expressApp)
                .delete('/8da1e01fda34eb8c1b9db47f')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(404, 'PLAYLIST_NOT_FOUND')
        })

        it("Sends a 200 with the deleted playlist", () => {
            return supertest(expressApp)
                .delete('/8da1e01fda34eb8c1b9db46f')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(200)
        })
    })
})
