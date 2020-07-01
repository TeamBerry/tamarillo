import * as bodyParser from "body-parser"
import * as chai from "chai"
import * as express from "express"
import * as supertest from "supertest"
const expect = chai.expect

import PlaylistApi from './../../../src/api/routes/playlist.api'
import { AuthApi } from './../../../src/api/routes/auth.api'
import { Session } from "./../../../src/models/session.model"
import { UserPlaylist, UserPlaylistClass, UserPlaylistDocument } from './../../../src/models/user-playlist.model'
import { Video, VideoDocument } from './../../../src/models/video.model'
import authService from "../../../src/api/services/auth.service"
import { User } from "../../../src/models/user.model"

describe("Playlists API", () => {
    const expressApp = express()

    let ashJWT: Session = null
    let foreignJWT: Session = null

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }))
        expressApp.use('/', PlaylistApi)

        await User.deleteMany({})
        await UserPlaylist.deleteMany({})
        await Video.deleteMany({})

        const ashUser = await User.create({
            _id: '9ca0df5f86abeb66da97ba5d',
            name: 'Ash Ketchum',
            mail: 'ash@pokemon.com',
            password: 'Pikachu',
        })

        const shironaUser = await User.create({
            _id: '9ca0df5f86abeb66da97ba5e',
            name: 'Shirona',
            mail: 'shirona@sinnoh-league.com',
            password: 'Piano',
        })

        const peterUser = await User.create({
            _id: '9ca0df5f86abeb66da97ba5f',
            name: 'Peter',
            mail: 'peter@hoenn-league.com',
            password: 'Metagr0ss',
        })

        await Video.create([
            {
                _id: '9bc72f3d7edc6312d0ef2e47',
                name: 'First Video',
                link: '4c6e3f_aZ0d',
                duration: ''
            },
            {
                _id: '9bc72f3d7edc6312d0ef2e48',
                name: 'Second Video',
                link: 'aC9d3edD3e2',
                duration: ''
            }
        ])

        ashJWT = authService.createSession(ashUser)
        foreignJWT = authService.createSession(shironaUser)

        await UserPlaylist.create({
            _id: "8da1e01fda34eb8c1b9db46e",
            name: "My First Playlist",
            isPrivate: true,
            user: "9ca0df5f86abeb66da97ba5d",
            videos: ['9bc72f3d7edc6312d0ef2e47'],
            isDeletable: true
        })

        await UserPlaylist.create({
            _id: "8da1e01fda34eb8c1b9db46f",
            name: "WiP Playlist 2",
            isPrivate: false,
            user: "9ca0df5f86abeb66da97ba5d",
            videos: [],
            isDeletable: true
        })

        await UserPlaylist.create({
            _id: "8da1e01fda34eb8c1b9db471",
            name: "WiP Playlist 3",
            isPrivate: true,
            user: "9ca0df5f86abeb66da97ba5d",
            videos: [],
            isDeletable: true
        })

        await UserPlaylist.create({
            _id: "8da1e01fda34eb8c1b9db472",
            name: "WiP Playlist 4",
            isPrivate: true,
            user: "9ca0df5f86abeb66da97ba5d",
            videos: [],
            isDeletable: true
        })

        await UserPlaylist.create({
            _id: "8da1e01fda34eb8c1b9db473",
            name: "Favorites",
            isPrivate: true,
            user: "9ca0df5f86abeb66da97ba5d",
            videos: ['9bc72f3d7edc6312d0ef2e48'],
            isDeletable: false
        })

        await UserPlaylist.create({
            _id: "8da1e01fda34eb8c1b9db470",
            name: "Playlist by someone else",
            isPrivate: false,
            user: "9ca0df5f86abeb66da97ba5f",
            videos: [],
            isDeletable: true
        })
    })

    after(async () => {
        await User.deleteMany({})
        await UserPlaylist.deleteMany({})
        await Video.deleteMany({})
    })

    describe("Lists playlists", () => {
        it("Returns the list of all public playlists if there's no JWT", () => {
            return supertest(expressApp)
                .get('/')
                .expect(200)
                .then((response) => {
                    const playlists: Array<UserPlaylistClass> = response.body

                    expect(playlists).to.have.lengthOf(2)
                })
        })

        it("Returns the list of all public playlists if there's a JWT with the user playlists excluded", () => {
            return supertest(expressApp)
                .get('/')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(200)
                .then((response) => {
                    const playlists: Array<UserPlaylistClass> = response.body

                    expect(playlists).to.have.lengthOf(1)
                })
        })
    })

    describe("Gets a playlist", () => {
        it("Sends a 401 if trying to get a private playlist without authorization", () => {
            return supertest(expressApp)
                .get('/8da1e01fda34eb8c1b9db46e')
                .expect(401, 'UNAUTHORIZED')
        })

        it("Sends a 401 if trying to get a private playlist with unauthorized access", () => {
            return supertest(expressApp)
                .get('/8da1e01fda34eb8c1b9db46e')
                .set('Authorization', 'Bearer ' + foreignJWT.bearer)
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
                .then((response) => {
                    const playlist = response.body

                    expect(playlist.videos).to.eql([{
                        _id: '9bc72f3d7edc6312d0ef2e47',
                        name: 'First Video',
                        link: '4c6e3f_aZ0d'
                    }])
                })
        })

        it("Sends a 200 with the public playlist", () => {
            return supertest(expressApp)
                .get('/8da1e01fda34eb8c1b9db46f')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(200)
        })
    })

    describe("Stores a playlist", () => {
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

        it("Sends a 201 with the created playlist", () => {
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

        it("Sends a 200 with the updated playlist with partial object", () => {
            return supertest(expressApp)
                .put('/8da1e01fda34eb8c1b9db46f')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send({
                    _id: "8da1e01fda34eb8c1b9db46f",
                    videos: ['9bc72f3d7edc6312d0ef2e48'],
                })
                .expect(200)
                .then((response) => {
                    const updatedPlaylist: UserPlaylistDocument = response.body

                    expect(updatedPlaylist.name).to.equal("WiP Playlist 2")
                    expect(updatedPlaylist.videos).to.deep.equal([{
                        _id: '9bc72f3d7edc6312d0ef2e48',
                        name: 'Second Video',
                        link: 'aC9d3edD3e2'
                    }])
                })
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
                    videos: ['9bc72f3d7edc6312d0ef2e48'],
                })
                .expect(200)
                .then((response) => {
                    const updatedPlaylist: UserPlaylistDocument = response.body

                    expect(updatedPlaylist.name).to.equal("WiP Playlist 2 Modified")
                    expect(updatedPlaylist.videos).to.deep.equal([{
                        _id: '9bc72f3d7edc6312d0ef2e48',
                        name: 'Second Video',
                        link: 'aC9d3edD3e2'
                    }])
                })
        })
    })

    describe("Adds a video from a playlist", () => {
        it("Sends a 401 if the JWT is not provided", () => {
            return supertest(expressApp)
                .post("/8da1e01fda34eb8c1b9db46f/videos")
                .send({
                    video: '9bc72f3d7edc6312d0ef2e47'
                })
                .expect(401)
        })

        it("Sends a 401 if the JWT is invalid (not the owner)", () => {
            return supertest(expressApp)
                .post("/8da1e01fda34eb8c1b9db46f/videos")
                .set('Authorization', 'Bearer ' + foreignJWT.bearer)
                .send({
                    videoId: '9bc72f3d7edc6312d0ef2e48'
                })
                .expect(401)
        })

        it("Sends a 404 if the playlist does not exist", () => {
            return supertest(expressApp)
                .post("/9da1e01fda34eb8c1b9db46f/videos")
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send({
                    video: '9bc72f3d7edc6312d0ef2e48'
                })
                .expect(404, 'PLAYLIST_NOT_FOUND')
        })

        it("Sends a 200 and adds the video to the playlist", () => {
            return supertest(expressApp)
                .post("/8da1e01fda34eb8c1b9db471/videos")
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send({
                    videoId: '9bc72f3d7edc6312d0ef2e48'
                })
                .expect(200)
                .then((response) => {
                    const updatedPlaylist: UserPlaylistDocument = response.body

                    expect(updatedPlaylist.videos).to.have.lengthOf(1)
                    expect(updatedPlaylist.videos).to.deep.equal([{
                        _id: '9bc72f3d7edc6312d0ef2e48',
                        name: 'Second Video',
                        link: 'aC9d3edD3e2'
                    }])
                })
        })

        it("Sends a 200, creates the video and adds it to the playlist", () => {
            return supertest(expressApp)
                .post("/8da1e01fda34eb8c1b9db472/videos")
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send({
                    videoLink: 'UC_qla6FQwM'
                })
                .expect(200)
                .then(async (response) => {
                    const updatedPlaylist: UserPlaylistDocument = response.body

                    expect(updatedPlaylist.videos).to.have.lengthOf(1)
                    expect(updatedPlaylist.videos[0].name).to.equal('[MV] REOL - ヒビカセ / Hibikase')
                    expect(updatedPlaylist.videos[0].link).to.equal('UC_qla6FQwM')

                    const newVideo: VideoDocument = await Video.findOne({ link: 'UC_qla6FQwM' })
                    expect(newVideo.name).to.equal('[MV] REOL - ヒビカセ / Hibikase')
                    expect(newVideo.duration).to.equal('PT4M16S')
                    expect(newVideo.link).to.equal('UC_qla6FQwM')
                })
        })
    })

    describe("Removes a video from a playlist", () => {
        it("Sends a 401 if the JWT is not provided", () => {
            return supertest(expressApp)
                .delete("/8da1e01fda34eb8c1b9db46e/videos/9bc72f3d7edc6312d0ef2e48")
                .expect(401)
        })

        it("Sends a 401 if the JWT is invalid (not the owner)", () => {
            return supertest(expressApp)
                .delete("/8da1e01fda34eb8c1b9db46e/videos/9bc72f3d7edc6312d0ef2e48")
                .set('Authorization', 'Bearer ' + foreignJWT.bearer)
                .expect(401)
        })

        it("Sends a 404 if the playlist does not exist", () => {
            return supertest(expressApp)
                .delete("/9da1e01fda34eb8c1b9db46e/videos/9bc72f3d7edc6312d0ef2e48")
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(404)
        })

        it("Sends a 200 and removes the video from the playlist", () => {
            return supertest(expressApp)
                .delete("/8da1e01fda34eb8c1b9db473/videos/9bc72f3d7edc6312d0ef2e48")
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(200)
                .then((response) => {
                    const updatedPlaylist: UserPlaylistDocument = response.body

                    expect(updatedPlaylist.videos).to.have.lengthOf(0)
                })
        })
    })

    describe("Deletes a playlist", () => {
        it("Sends a 401 if trying to delete a private playlist without authorization", () => {
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

        it("Sends a 403 if trying to a delete an undeletable playlist", () => {
            return supertest(expressApp)
                .delete('/8da1e01fda34eb8c1b9db473')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(403, 'NOT_PERMITTED')
        })

        it("Sends a 200 with the deleted playlist", () => {
            return supertest(expressApp)
                .delete('/8da1e01fda34eb8c1b9db46f')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .expect(200)
                .then(async (response) => {
                    const deletedPlaylist = await UserPlaylist.findById('8da1e01fda34eb8c1b9db46f')

                    expect(deletedPlaylist).to.not.exist
                })
        })
    })
})
