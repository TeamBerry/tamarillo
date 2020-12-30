/* eslint-disable no-unused-expressions */
import * as bcrypt from "bcrypt"
import * as bodyParser from "body-parser"
import * as chai from "chai"
import * as express from "express"
import * as supertest from "supertest"
const expect = chai.expect

import AuthApi from './../../../src/api/routes/auth.api'
import { UserPlaylist, UserPlaylistDocument } from "../../../src/models/user-playlist.model"
import { User } from "../../../src/models/user.model"
import { Session } from "../../../src/models/session.model"
import authService from "../../../src/api/services/auth.service"
import { Subscriber } from "../../../src/models/subscriber.model"
const Box = require('./../../../src/models/box.model')

describe("Auth API", () => {

    const expressApp = express()

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }))
        expressApp.use('/', AuthApi)
    })

    describe("Login", () => {
        before(async () => {
            await User.findByIdAndDelete('9ca0df5f86abeb66da97ba5d')

            const password = await bcrypt.hash('Pikachu', 10)

            await User.create({
                _id: '9ca0df5f86abeb66da97ba5d',
                name: 'Ash Ketchum',
                mail: 'ash@pokemon.com',
                password
            })
        })

        after(async () => {
            await User.findByIdAndDelete('9ca0df5f86abeb66da97ba5d')
        })

        it("Rejects the login if no credentials are given", () => supertest(expressApp)
            .post("/login")
            .expect(412, 'MISSING_CREDENTIALS'))

        it("Rejects the login if part of the credentials are missing", () => {
            const credentials = {
                mail: 'test-mail@gmail.com'
            }

            return supertest(expressApp)
                .post("/login")
                .send(credentials)
                .expect(412, 'MISSING_CREDENTIALS')
        })

        it("Rejects the login if the credentials don't belong to any user", () => {
            const credentials = {
                mail: 'test-mail@gmail.com',
                password: 'TestPassword'
            }

            return supertest(expressApp)
                .post("/login")
                .send(credentials)
                .expect(401, 'INVALID_CREDENTIALS')
        })

        it("Accepts the login if credentials are valid and match an user", () => {
            const credentials = {
                mail: 'ash@pokemon.com',
                password: 'Pikachu'
            }

            return supertest(expressApp)
                .post("/login")
                .send(credentials)
                .expect(200)
        })

        it("Accepts the login - case insensitivity on mail", () => {
            const credentials = {
                mail: 'AsH@pOKEmon.COM',
                password: 'Pikachu'
            }

            return supertest(expressApp)
                .post("/login")
                .send(credentials)
                .expect(200)
        })
    })

    describe("Signup", () => {
        before(async () => {
            await User.create({
                _id: '9ca0df5f86abeb66da97ba5d',
                name: 'Ash Ketchum',
                mail: 'ash@pokemon.com',
                password: 'Pikachu',
                resetToken: null
            })
        })

        after(async () => {
            await User.deleteMany({})
        })

        it("Sends a 409 if the mail already exists", async () => supertest(expressApp)
            .post('/signup')
            .send({ mail: 'ash@pokemon.com', name: 'Misty', password: 'Mewtwo' })
            .expect(409, 'MAIL_ALREADY_EXISTS'))

        it("Sends a 409 if the username already exists", async () => supertest(expressApp)
            .post('/signup')
            .send({ mail: 'misty@pokemon.com', name: 'Ash Ketchum', password: 'Mewtwo' })
            .expect(409, 'USERNAME_ALREADY_EXISTS'))

        it("Returns a 200 with an active session", async () => supertest(expressApp)
            .post('/signup')
            .send({ mail: 'blue@pokemon.com', name: 'Blue', password: 'Ratticate' })
            .expect(200)
            .then(async () => {
                const user = await User.findOne({ mail: 'blue@pokemon.com' })

                expect(user.password).to.not.equal('Ratticate')
            }))

        it("Creates a 'favorites' playlist, undeletable, for the user", async () => supertest(expressApp)
            .post('/signup')
            .send({ mail: 'green@pokemon.com', name: 'Green', password: 'Venusaur' })
            .expect(200)
            .then(async () => {
                const user = await User.findOne({ mail: 'green@pokemon.com' })

                const favoritesPlaylist: UserPlaylistDocument = await UserPlaylist.findOne({ user: user._id })

                expect(favoritesPlaylist.name).to.equal('Favorites')
                expect(favoritesPlaylist.isPrivate).to.equal(false)
                expect(favoritesPlaylist.user.toString()).to.equal(user._id.toString())
                expect(favoritesPlaylist.videos).to.have.lengthOf(0)
                expect(favoritesPlaylist.isDeletable).to.be.false
            }))
    })

    describe("Reset password", () => {
        before(async () => {
            await User.create([
                {
                    _id: '9ca0df5f86abeb66da97ba5d',
                    name: 'Ash Ketchum',
                    mail: 'ash@pokemon.com',
                    password: 'Pikachu',
                    resetToken: null
                },
                {
                    _id: '9ca0df5f86abeb66da97ba5e',
                    name: 'Shirona',
                    mail: 'shirona@sinnoh-league.com',
                    password: null,
                    resetToken: 'yuaxPLMxE1R1XiA7lvRd'
                }
            ])
        })

        after(async () => {
            await User.deleteMany({})
        })

        describe("Step 1 - The User requests a reset. A reset token is issued.", () => {
            it("Sends a 200 even if no user matches the given mail", () => supertest(expressApp)
                .post("/reset")
                .send({ email: 'unknown@mail.com' })
                .expect(200))

            it("Resets the password if the user exists", () => supertest(expressApp)
                .post("/reset")
                .send({ mail: 'ash@pokemon.com' })
                .expect(200)
                .then(async () => {
                    const user = await User.findById('9ca0df5f86abeb66da97ba5d')

                    expect(user.password).to.be.null
                    expect(user.resetToken).to.not.be.null
                }))
        })

        describe("Step 2 - The User attempts to change their password. The reset token is checked against.", () => {
            it("Sends a 404 if no user matches the reset token", () => supertest(expressApp)
                .get('/reset/T0k3nNoTFO_unD')
                .expect(404, 'TOKEN_NOT_FOUND'))

            it("Sends a 200 WITHOUT the user if there's a match", () => supertest(expressApp)
                .get('/reset/yuaxPLMxE1R1XiA7lvRd')
                .expect(200))
        })

        describe("Step 3 - The User resets their password.", () => {
            it("Sends a 404 if no user matches the signup token", () => supertest(expressApp)
                .post('/reset/T0k3nNoTFO_unD')
                .expect(404, 'TOKEN_NOT_FOUND'))

            it("Sends a 200 if the user exists", async () => {
                const reset = {
                    password: 'Piano'
                }

                const matchingUser = await User.findOne({ resetToken: 'yuaxPLMxE1R1XiA7lvRd' })

                return supertest(expressApp)
                    .post('/reset/yuaxPLMxE1R1XiA7lvRd')
                    .send(reset)
                    .expect(200)
                    .then(async () => {
                        const resetUser = await User.findById(matchingUser._id)

                        expect(resetUser.resetToken).to.be.null
                        expect(resetUser.password).to.not.be.null
                    })
            })
        })
    })

    describe("Update password", () => {
        let ashJWT: Session = null
        let shironaJWT: Session = null

        before(async () => {
            const ashUser = await User.create({
                _id: '9ca0df5f86abeb66da97ba5d',
                name: 'Ash Ketchum',
                mail: 'ash@pokemon.com',
                password: 'Pikachu',
                resetToken: null,
                settings: {
                    theme: 'light',
                    picture: '9ca0df5f86abeb66da97ba5d-picture',
                    color: '#CD3E1D',
                    isColorblind: false,
                    badge: null
                },
                acl: {
                    moderator: ['addVideo', 'removeVideo', 'promoteVIP', 'demoteVIP', 'forceNext', 'forcePlay'],
                    vip: ['addVideo', 'removeVideo', 'forceNext'],
                    simple: ['addVideo']
                }
            })

            const shironaUser = await User.create({
                _id: '9ca0df5f86abeb66da97ba5e',
                name: 'Shirona',
                mail: 'shirona@sinnoh-league.com',
                password: 'Piano',
                resetToken: 'yuaxPLMxE1R1XiA7lvRd',
                settings: {
                    theme: 'dark',
                    picture: 'default-picture',
                    color: '#07D302',
                    isColorblind: false,
                    badge: null
                },
                acl: {
                    moderator: ['addVideo', 'removeVideo', 'promoteVIP', 'demoteVIP', 'forceNext', 'forcePlay'],
                    vip: ['addVideo', 'removeVideo', 'forceNext'],
                    simple: ['addVideo']
                }
            })

            ashJWT = authService.createSession(ashUser)
            shironaJWT = authService.createSession(shironaUser)
        })

        after(async () => {
            await User.deleteMany({})
        })

        it("Updates the password", () => {
            const reset = {
                password: "butterfree"
            }

            return supertest(expressApp)
                .put('/')
                .set('Authorization', `Bearer ${ashJWT.bearer}`)
                .send(reset)
                .expect(200)
                .then(async () => {
                    const user = await User.findById('9ca0df5f86abeb66da97ba5d').lean()

                    expect(user.password).to.not.equal('Pikachu')
                    expect(user.resetToken).to.be.null
                })
        })

        it("Updates the password and voids the reset token", () => {
            const reset = {
                password: "butterfree"
            }

            return supertest(expressApp)
                .put('/')
                .set('Authorization', `Bearer ${shironaJWT.bearer}`)
                .send(reset)
                .expect(200)
                .then(async () => {
                    const user = await User.findById('9ca0df5f86abeb66da97ba5d').lean()

                    expect(user.password).to.not.equal('Piano')
                    expect(user.resetToken).to.be.null
                })
        })
    })

    describe("Deactivate Account", () => {
        let ashJWT: Session = null
        let foreignJWT: Session = null

        before(async () => {
            const ashUser = await User.create({
                _id: '9ca0df5f86abeb66da97ba5d',
                name: 'Ash Ketchum',
                mail: 'ash@pokemon.com',
                password: 'Pikachu',
                settings: {
                    theme: 'light',
                    picture: '9ca0df5f86abeb66da97ba5d-picture',
                    color: '#CD3E1D',
                    isColorblind: false,
                    badge: null
                },
                acl: {
                    moderator: ['addVideo', 'removeVideo', 'promoteVIP', 'demoteVIP', 'forceNext', 'forcePlay'],
                    vip: ['addVideo', 'removeVideo', 'forceNext'],
                    simple: ['addVideo']
                }
            })

            await UserPlaylist.create({
                _id: "8da1e01fda34eb8c1b9db46c",
                name: "Favorites",
                isPrivate: false,
                user: "9ca0df5f86abeb66da97ba5d",
                videos: [],
                isDeletable: false
            })

            const shironaUser = await User.create({
                _id: '9ca0df5f86abeb66da97ba5e',
                name: 'Shirona',
                mail: 'shirona@sinnoh-league.com',
                password: 'Piano',
                settings: {
                    theme: 'dark',
                    picture: 'default-picture',
                    color: '#07D302',
                    isColorblind: false,
                    badge: null
                },
                acl: {
                    moderator: ['addVideo', 'removeVideo', 'promoteVIP', 'demoteVIP', 'forceNext', 'forcePlay'],
                    vip: ['addVideo', 'removeVideo', 'forceNext'],
                    simple: ['addVideo']
                }
            })

            await UserPlaylist.create({
                _id: "8da1e01fda34eb8c1b9db46d",
                name: "Favorites",
                isPrivate: false,
                user: "9ca0df5f86abeb66da97ba5e",
                videos: ['9bc72f3d7edc6312d0ef2e48'],
                isDeletable: false
            })

            ashJWT = authService.createSession(ashUser)
            foreignJWT = authService.createSession(shironaUser)

            await Box.create([
                {
                    _id: '9cb763b6e72611381ef043e4',
                    description: null,
                    lang: 'en',
                    name: 'Test box',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    private: true,
                    open: true
                },
                {
                    _id: '9cb763b6e72611381ef043e5',
                    description: 'Closed box',
                    lang: 'en',
                    name: 'Closed box',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    private: false,
                    open: false
                },
                {
                    _id: '9cb763b6e72611381ef043e6',
                    description: 'Open box to delete',
                    lang: 'en',
                    name: 'Open box to delete',
                    creator: '9ca0df5f86abeb66da97ba5d',
                    private: true,
                    open: true
                }
            ])

            await Subscriber.create([
                {
                    boxToken: '9cb763b6e72611381ef043e4',
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    connexions: [
                        {
                            origin: 'Blueberry',
                            socket: ''
                        }
                    ],
                    berries: 0,
                    role: 'simple'
                },
                {
                    boxToken: '9cb763b6e72611381ef043e4',
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    connexions: [
                        {
                            origin: 'Blueberry',
                            socket: ''
                        }
                    ],
                    berries: 13,
                    role: 'simple'
                },
                {
                    boxToken: '9cb763b6e72611381ef043e6',
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    connexions: [
                        {
                            origin: 'Cranberry',
                            socket: ''
                        }
                    ],
                    berries: 0,
                    role: 'simple'
                }
            ])
        })

        after(async () => {
            await User.deleteMany({})
            await Box.deleteMany({})
            await Subscriber.deleteMany({})
            await UserPlaylist.deleteMany({})
        })

        it('Fails if the user still has boxes', () => supertest(expressApp)
            .post('/deactivate')
            .set('Authorization', `Bearer ${ashJWT.bearer}`)
            .expect(412, 'USER_STILL_HAS_BOXES'))

        it('Deletes the account', () => supertest(expressApp)
            .post('/deactivate')
            .set('Authorization', `Bearer ${foreignJWT.bearer}`)
            .expect(200)
            .then(async () => {
                expect(await User.count({ _id: '9ca0df5f86abeb66da97ba5e'})).to.equal(0)
                expect(await Subscriber.count({ userToken: '9ca0df5f86abeb66da97ba5e'})).to.equal(0)
                expect(await UserPlaylist.count({ user: '9ca0df5f86abeb66da97ba5e' })).to.equal(0)
                expect(await Subscriber.count({ userToken: '9ca0df5f86abeb66da97ba5d'})).to.equal(2)
                expect(await UserPlaylist.count({ user: '9ca0df5f86abeb66da97ba5d'})).to.equal(1)
            }))
    })
})
