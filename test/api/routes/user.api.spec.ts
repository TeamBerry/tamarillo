import * as bodyParser from "body-parser"
import * as chai from "chai"
import * as express from "express"
import * as supertest from "supertest"
const expect = chai.expect

import UserApi from './../../../src/api/routes/user.api'
const User = require('./../../../src/models/user.model')
import { Session } from "./../../../src/models/session.model"
import { UserPlaylistClass, UserPlaylist } from './../../../src/models/user-playlist.model'
import authService from "../../../src/api/services/auth.service"
import { Video } from "../../../src/models/video.model"

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

        await Video.deleteMany({
            _id: { $in: ['9bc72f3d7edc6312d0ef2e47', '9bc72f3d7edc6312d0ef2e48'] }
        })

        await Video.create([{
            _id: '9bc72f3d7edc6312d0ef2e47',
            name: 'First Video',
            link: '4c6e3f_aZ0d'
        }, {
            _id: '9bc72f3d7edc6312d0ef2e48',
            name: 'Second Video',
            link: 'aC9d3edD3e2'
        }])

        await User.create({
            _id: '9ca0df5f86abeb66da97ba5d',
            name: 'Ash Ketchum',
            mail: 'ash@pokemon.com',
            password: 'Pikachu',
            settings: {
                theme: 'light',
                picture: '9ca0df5f86abeb66da97ba5d-picture'
            },
            favorites: []
        })

        await User.create({
            _id: '9ca0df5f86abeb66da97ba5e',
            name: 'Shirona',
            mail: 'shirona@sinnoh-league.com',
            password: 'Piano',
            settings: {
                theme: 'dark',
                picture: 'default-picture'
            },
            favorites: ['9bc72f3d7edc6312d0ef2e48']
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

    describe("Update their settings", () => {
        it("Sends a 401 back if the API is the token is invalid or not provided", () => {
            return supertest(expressApp)
                .patch('/settings')
                .expect(401)
        })

        it("Sends a 412 if no settings are given", () => {
            return supertest(expressApp)
                .patch('/settings')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(412)
        })

        it("Sends a 200 if all goes well", () => {
            return supertest(expressApp)
                .patch('/settings')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send({ theme: 'dark' })
                .expect(200)
                .then(async () => {
                    const user = await User.findById('9ca0df5f86abeb66da97ba5d')

                    expect(user.settings.theme).to.equal("dark")
                    expect(user.settings.picture).to.equal("9ca0df5f86abeb66da97ba5d-picture")
                })
        })
    })

    describe("Getting the favorites of an user", () => {
        it("Sends a 401 back if the API is the token is invalid or not provided", () => {
            return supertest(expressApp)
                .get('/favorites')
                .expect(401)
        })

        it("Sends a 200 with the favorites", () => {
            return supertest(expressApp)
                .get('/favorites')
                .set('Authorization', 'Bearer ' + foreignJWT.bearer)
                .expect(200)
                .then((response) => {
                    const favorites = response.body

                    expect(favorites).to.have.lengthOf(1)
                    expect(favorites[0].name).to.equal('Second Video')
                })
        })

        it("Returns an enmpty array when search gives off nothing", () => {
            return supertest(expressApp)
                .get('/favorites?title=piano')
                .set('Authorization', 'Bearer ' + foreignJWT.bearer)
                .expect(200)
                .then((response) => {
                    const favorites = response.body

                    expect(favorites).to.have.lengthOf(0)
                })
        })

        it("Searches through favorites by title", () => {
            return supertest(expressApp)
                .get('/favorites?title=video')
                .set('Authorization', 'Bearer ' + foreignJWT.bearer)
                .expect(200)
                .then((response) => {
                    const favorites = response.body

                    expect(favorites).to.have.lengthOf(1)
                    expect(favorites[0].name).to.equal('Second Video')
                })
        })
    })

    describe("Updating their favorites", () => {
        describe("Like a video", () => {
            it("Sends a 401 back if the API is the token is invalid or not provided", () => {
                return supertest(expressApp)
                    .post('/favorites')
                    .expect(401)
            })

            it("Sends a 404 if the video does not exist", () => {
                return supertest(expressApp)
                    .post('/favorites')
                    .set('Authorization', 'Bearer ' + ashJWT.bearer)
                    .send({ action: 'like', target: '8bc72f3d7edc6312d0ef2e47' })
                    .expect(404)
            })

            it("Sends a 200 and adds the video to favorites", () => {
                return supertest(expressApp)
                    .post('/favorites')
                    .set('Authorization', 'Bearer ' + ashJWT.bearer)
                    .send({ action: 'like', target: '9bc72f3d7edc6312d0ef2e47' })
                    .expect(200)
                    .then(async () => {
                        const user = await User.findById('9ca0df5f86abeb66da97ba5d')

                        expect(user.favorites).to.have.lengthOf(1)
                        expect(user.favorites[0].toString()).to.equal('9bc72f3d7edc6312d0ef2e47')
                    })
            })
        })

        describe("Unlike a video", () => {
            it("Sends a 401 back if the API is the token is invalid or not provided", () => {
                return supertest(expressApp)
                    .post('/favorites')
                    .expect(401)
            })

            it("Sends a 404 if the video does not exist", () => {
                return supertest(expressApp)
                    .post('/favorites')
                    .set('Authorization', 'Bearer ' + foreignJWT.bearer)
                    .send({ action: 'unlike', target: '8bc72f3d7edc6312d0ef2e48' })
                    .expect(404)
            })

            it("Sends a 200 and removes the video from favorites", () => {
                return supertest(expressApp)
                    .post('/favorites')
                    .set('Authorization', 'Bearer ' + foreignJWT.bearer)
                    .send({ action: 'unlike', target: '9bc72f3d7edc6312d0ef2e48' })
                    .expect(200)
                    .then(async () => {
                        const user = await User.findById('9ca0df5f86abeb66da97ba5e')

                        expect(user.favorites).to.have.lengthOf(0)
                    })
            })
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
