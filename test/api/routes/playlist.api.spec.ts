import * as express from "express"
import * as bodyParser from "body-parser"
import * as supertest from "supertest"
import * as chai from "chai"
const axios = require("axios")
const expect = chai.expect

import PlaylistApi from './../../../src/api/routes/playlist.api'
import { UserPlaylist, UsersPlaylist, UserPlaylistDocument } from './../../../src/models/user-playlist.model'

describe("Playlists API", () => {
    const expressApp = express()

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }))
        expressApp.use('/', PlaylistApi)

        await UsersPlaylist.deleteMany({
            _id: { $in: ['8da1e01fda34eb8c1b9db46e', '8da1e01fda34eb8c1b9db46f'] }
        })

        await UsersPlaylist.create({
            _id: "8da1e01fda34eb8c1b9db46e",
            name: "My First Playlist",
            private: true,
            user: "9ca0df5f86abeb66da97ba5d",
            videos: []
        })

        await UsersPlaylist.create({
            _id: "8da1e01fda34eb8c1b9db46f",
            name: "WiP Playlist 2",
            private: false,
            user: "9ca0df5f86abeb66da97ba5d",
            videos: []
        })
    })

    after(async () => {
        await UsersPlaylist.deleteMany({
            _id: { $in: ['8da1e01fda34eb8c1b9db46e', '8da1e01fda34eb8c1b9db46f'] }
        })
    })

    describe("Gets a playlist", () => {
        it("Sends a 404 back if no playlist matches the given id", () => {
            return supertest(expressApp)
                .get('/8da1e01fda34eb8c1b9db47e')
                .expect(404, 'PLAYLIST_NOT_FOUND')
        })

        it("Sends a 401 if trying to get a private playlist without authorization", () => {
            return supertest(expressApp)
                .get('/8da1e01fda34eb8c1b9db46e')
                .expect(401, 'UNAUTHORIZED')
        })

        it("Sends a 200 with the private playlist if JWT is valid and matching", () => {
            return supertest(expressApp)
                .get('/8da1e01fda34eb8c1b9db46e')
                .expect(200)
        })

        it("Sends a 200 with the public playlist if the id matches", () => {
            return supertest(expressApp)
                .get('/8da1e01fda34eb8c1b9db46f')
                .expect(200)
        })
    })

    describe("Posts a playlist", () => {
        it("Sends a 412 if no request body is given", () => {
            return supertest(expressApp)
                .post('/')
                .expect(412, 'MISSING_PARAMETERS')
        })

        it("Sends a 201 with the created box", () => {
            return supertest(expressApp)
                .post('/')
                .send({
                    _id: "8da1e01fda34eb8c1b9db46a",
                    name: "My New Playlist",
                    private: true,
                    user: "9ca0df5f86abeb66da97ba5d",
                    videos: []
                })
                .expect(201)
        })
    })

    describe("Updates a playlist", () => {
        it("Sends a 412 if no request body is given", () => {
            return supertest(expressApp)
                .put('/8da1e01fda34eb8c1b9db46f')
                .expect(412, 'MISSING_PARAMETERS')
        })

        it("Sends a 412 if the request parameter and the _id given in the request body don't match", () => {
            return supertest(expressApp)
                .put('/8da1e01fda34eb8c1b9db46f')
                .send({
                    _id: "8da1e01fda34eb8c1b9db48f",
                    name: "WiP Playlist 4",
                    private: false,
                    user: "9ca0df5f86abeb66da97ba5d",
                    videos: []
                })
                .expect(412, 'MISSING_PARAMETERS')
        })

        it("Sends a 404 back if no playlist matches the id given", () => {
            return supertest(expressApp)
                .put('/8da1e01fda34eb8c1b9db47f')
                .send({
                    _id: "8da1e01fda34eb8c1b9db47f",
                    name: "This playlist does not exist",
                    private: false,
                    user: "9ca0df5f86abeb66da97ba5d",
                    videos: []
                })
                .expect(404, 'PLAYLIST_NOT_FOUND')
        })

        it("Sends a 401 if trying to update a playlist without being the owner", () => {
            return supertest(expressApp)
                .put('/8da1e01fda34eb8c1b9db46f')
                .send({
                    _id: "8da1e01fda34eb8c1b9db46f",
                    name: "WiP Playlist 2 Modified",
                    private: false,
                    user: "9ca0df5f86abeb66da97ba5d",
                    videos: []
                })
                .expect(200)
        })

        it("Sends a 200 with the updated playlist", () => {
            return supertest(expressApp)
                .put('/8da1e01fda34eb8c1b9db46f')
                .send({
                    _id: "8da1e01fda34eb8c1b9db46f",
                    name: "WiP Playlist 2 Modified",
                    private: false,
                    user: "9ca0df5f86abeb66da97ba5d",
                    videos: []
                })
                .expect(200)
        })
    })

    describe("Deletes a playlist", () => {
        it("Sends a 404 back if no playlist matches the id given", () => {
            return supertest(expressApp)
                .delete('/8da1e01fda34eb8c1b9db47f')
                .expect(404, 'PLAYLIST_NOT_FOUND')
        })

        it("Sends a 401 if trying to get a private playlist without authorization", () => {
            return supertest(expressApp)
                .delete('/8da1e01fda34eb8c1b9db46f')
                .expect(401)
        })

        it("Sends a 200 with the deleted playlist", () => {
            return supertest(expressApp)
                .delete('/8da1e01fda34eb8c1b9db46f')
                .expect(200)
        })
    })
})