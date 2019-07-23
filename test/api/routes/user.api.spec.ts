import * as express from "express"
import * as bodyParser from "body-parser"
import * as supertest from "supertest"
import * as chai from "chai"
const axios = require("axios")
const expect = chai.expect

import * as jwt from 'jsonwebtoken'
const fs = require('fs')
const RSA_PRIVATE_KEY = fs.readFileSync('certs/private_key.pem')

import UserApi from './../../../src/api/routes/user.api'
import { AuthApi } from './../../../src/api/routes/auth.api'
const User = require('./../../../src/models/user.model')
import { UserPlaylist, UsersPlaylist, UserPlaylistDocument } from './../../../src/models/user-playlist.model'
import { Session } from "./../../../src/models/session.model"

describe.only("User API", () => {
    const expressApp = express()

    let ashJWT: Session = null
    let foreignJWT: Session = null

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }))
        expressApp.use('/', UserApi)

        await User.deleteMany({
            _id: { $in: ['9ca0df5f86abeb66da97ba5d', '9ca0df5f86abeb66da97ba5e'] }
        })

        await UsersPlaylist.deleteMany({
            _id: { $in: ['8da1e01fda34eb8c1b9db46e', '8da1e01fda34eb8c1b9db46f'] }
        })

        await User.create({
            _id: '9ca0df5f86abeb66da97ba5d',
            name: 'Ash Ketchum',
            mail: 'ash@pokemon.com',
            password: 'Pikachu'
        })

        await User.create({
            _id: '9ca0df5f86abeb66da97ba5e',
            name: 'Shirona',
            mail: 'shirona@sinnoh-league.com',
            password: 'Piano'
        })

        const ashJWT = AuthApi.prototype.createSession({_id: '9ca0df5f86abeb66da97ba5d'})
        const foreignJWT = AuthApi.prototype.createSession({_id: '9ca0df5f86abeb66da97ba5e'})

        console.log(ashJWT)
        console.log(foreignJWT)

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
        await User.deleteMany({
            _id: { $in: ['9ca0df5f86abeb66da97ba5d', '9ca0df5f86abeb66da97ba5e'] }
        })

        await UsersPlaylist.deleteMany({
            _id: { $in: ['8da1e01fda34eb8c1b9db46e', '8da1e01fda34eb8c1b9db46f'] }
        })
    })

    describe("Gets an user", () => {
        it("Sends a 404 back if no user matches the given id", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba4e')
                .expect(404, 'USER_NOT_FOUND')
        })

        it("Sends a 200 with the user if the id matches", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5d')
                .expect(200)
        })
    })

    describe("Gets the boxes of an user", () => {
        it("Sends a 404 back if no user matches the given id", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba4e/boxes')
                .expect(404, 'USER_NOT_FOUND')
        })

        it("Sends a 200 with the boxes if the id matches", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5d/boxes')
                .expect(200)
        })
    })

    describe("Gets the playlists of an user", () => {
        it("Sends a 404 back if no user matches the given id", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba4e/playlists')
                .expect(404, 'USER_NOT_FOUND')
        })

        it("Sends a 200 with only public playlists if the user requesting is not the author of the playlists", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5d/playlists')
                .set('Authorization', 'Bearer ' + foreignJWT.bearer)
                .expect(200)
                .then((response) => {
                    const playlists: Array<UserPlaylist> = response.body

                    expect(playlists).to.have.lengthOf(1)
                })
        })

        it("Sends a 200 with all playlists if the user requesting is the author of the playlists", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5d/playlists')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(200)
                .then((response) => {
                    const playlists: Array<UserPlaylist> = response.body

                    expect(playlists).to.have.lengthOf(2)
                })
        })
    })
})