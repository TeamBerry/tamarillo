import * as bcrypt from "bcrypt"
import * as bodyParser from "body-parser"
import * as chai from "chai"
import * as express from "express"
import * as supertest from "supertest"
const expect = chai.expect

import AuthApi from './../../../src/api/routes/auth.api'
import { UserPlaylist, UserPlaylistDocument } from "../../../src/models/user-playlist.model"
const User = require('./../../../src/models/user.model')

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

        it("Rejects the login if no credentials are given", () => {
            return supertest(expressApp)
                .post("/login")
                .expect(412, 'MISSING_CREDENTIALS')
        })

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

        it("Sends a 409 if the user already exists", async () => {
            return supertest(expressApp)
                .post('/signup')
                .send({ mail: 'ash@pokemon.com', password: 'Mewtwo' })
                .expect(409)
        })

        it("Returns a 200 with an active session", async () => {
            return supertest(expressApp)
                .post('/signup')
                .send({ mail: 'blue@pokemon.com', password: 'Ratticate' })
                .expect(200)
                .then(async () => {
                    const user = await User.findOne({ mail: 'blue@pokemon.com' })

                    expect(user.password).to.not.equal('Ratticate')
                })
        })

        it("Creates a 'favorites' playlist, undeletable, for the user", async () => {
            return supertest(expressApp)
                .post('/signup')
                .send({ mail: 'green@pokemon.com', password: 'Venusaur' })
                .expect(200)
                .then(async () => {
                    const user = await User.findOne({ mail: 'green@pokemon.com' })

                    const favoritesPlaylist: UserPlaylistDocument = await UserPlaylist.findOne({ user: user._id })

                    expect(favoritesPlaylist.name).to.equal('Favorites')
                    expect(favoritesPlaylist.isPrivate).to.equal(false)
                    expect(favoritesPlaylist.user.toString()).to.equal(user._id.toString())
                    expect(favoritesPlaylist.videos).to.have.lengthOf(0)
                    expect(favoritesPlaylist.isDeletable).to.be.false
                })
        })
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
            it("Sends a 200 even if no user matches the given mail", () => {
                return supertest(expressApp)
                    .post("/reset")
                    .send({ email: 'unknown@mail.com' })
                    .expect(200)
            })

            it("Resets the password if the user exists", () => {
                return supertest(expressApp)
                    .post("/reset")
                    .send({ mail: 'ash@pokemon.com' })
                    .expect(200)
                    .then(async () => {
                        const user = await User.findById('9ca0df5f86abeb66da97ba5d')

                        expect(user.password).to.be.null
                        expect(user.resetToken).to.not.be.null
                    })
            })
        })

        describe("Step 2 - The User attempts to change their password. The reset token is checked against.", () => {
            it("Sends a 404 if no user matches the reset token", () => {
                return supertest(expressApp)
                    .get('/reset/T0k3nNoTFO_unD')
                    .expect(404, 'TOKEN_NOT_FOUND')
            })

            it("Sends a 200 WITHOUT the user if there's a match", () => {
                return supertest(expressApp)
                    .get('/reset/yuaxPLMxE1R1XiA7lvRd')
                    .expect(200)
            })
        })

        describe("Step 3 - The User resets their password.", () => {
            it("Sends a 404 if no user matches the signup token", () => {
                return supertest(expressApp)
                    .post('/reset/T0k3nNoTFO_unD')
                    .expect(404, 'TOKEN_NOT_FOUND')
            })

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
})