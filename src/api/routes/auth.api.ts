import { Request, Response, Router } from "express"

const Queue = require("bull")
const mailQueue = new Queue("mail")
import * as bcrypt from 'bcrypt'
const cmp = require('semver-compare')

import { MailJob } from "../../models/mail.job"
import authService from "../services/auth.service"
import { UserPlaylist } from "../../models/user-playlist.model"
import { User } from '../../models/user.model'
import { Subscriber } from "../../models/subscriber.model"
import { nanoid } from "nanoid"
const Box = require("./../../models/box.model")

const auth = require("./../middlewares/auth.middleware")

const dotenv = require("dotenv")
dotenv.config()

export class AuthApi {
    public router: Router
    public readonly SALT_ROUNDS = 10

    constructor() {
        this.router = Router()
        this.init()
    }

    public init(): void {
        this.router.post("/compat", this.getAllowedVersions)
        this.router.post("/login", this.login)
        this.router.post("/signup", this.signup.bind(this))
        this.router.post("/reset", this.triggerPasswordReset.bind(this))
        this.router.put("/", auth.isAuthorized, this.updatePassword.bind(this))
        this.router.get("/reset/:token", this.checkResetToken)
        this.router.post("/reset/:token", this.resetPassword.bind(this))
        this.router.post("/deactivate", auth.isAuthorized, this.deactivateAccount.bind(this))
    }

    public async getAllowedVersions(request: Request, response: Response): Promise<Response> {
        const currentVersion: string = request.body.version

        if (!currentVersion) {
            return response.status(412).send('VERSION_NOT_SPECIFIED')
        }

        if (cmp(currentVersion, '0.16.0') === -1) {
            return response.status(403).send('UPGRADE_MANDATORY')
        }

        return response.status(200).send('OK')
    }

    /**
     * Logs the user in and creates his session
     *
     * @param {Request} request The request, which body must contain the mail and password parameters
     * @param {Response} response The response
     * @returns {Promise<Response>} A valid session or of one the following errors:
     * - 412 'MISSING_CREDENTIALS' if the request body is incompolete
     * - 401 'INVALID_CREDENTIALS' if the credentials do not match any user
     * - 500 Server Error if anything else happens
     * @memberof AuthApi
     */
    public async login(request: Request, response: Response): Promise<Response> {
        if (!request.body.mail || !request.body.password) {
            return response.status(412).send("MISSING_CREDENTIALS")
        }

        const mail = request.body.mail.toLowerCase()
        const password = request.body.password

        try {
            // Find user in database
            const user = await User.findOne({ mail }, 'name mail settings password')

            // If password is not correct, send back 401 HTTP error
            if (!user) {
                return response.status(401).send("INVALID_CREDENTIALS") // Unauthorized
            }

            if (!await bcrypt.compare(password, user.password)) {
                return response.status(401).send("INVALID_CREDENTIALS")
            }

            const authResult = authService.createSession(user)

            // Sending bearer token
            return response.status(200).json(authResult)
        } catch (error) {
            console.log(error)
            return response.status(500).send(error)
        }
    }

    public async signup(request: Request, response: Response): Promise<Response> {
        const mail = request.body.mail.toLowerCase()
        const { password, name } = request.body

        try {
            if (await User.exists({ mail })) {
                return response.status(409).send('MAIL_ALREADY_EXISTS')
            }

            if (await User.exists({ name })) {
                return response.status(409).send('USERNAME_ALREADY_EXISTS')
            }

            const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS)

            const createdUser = await User.create({
                mail,
                password: hashedPassword,
                name
            })

            // Create Favorites playlist
            await UserPlaylist.create({
                name: 'Favorites',
                isPrivate: false,
                user: {
                    _id: createdUser._id,
                    name: createdUser.name
                },
                isDeletable: false
            })

            const mailJob: MailJob = {
                addresses: [mail],
                variables: { name },
                template: "signup"
            }
            mailQueue.add(mailJob)

            const authResult = authService.createSession(createdUser)

            return response.status(200).send(authResult)
        } catch (error) {
            response.status(500).send(error)
        }
    }

    /**
     * Triggers the reset of password for an user
     *
     * @param {Request} request
     * @param {Response} response
     * @returns {Promise<Response>}
     * @memberof AuthApi
     */
    public async triggerPasswordReset(request: Request, response: Response): Promise<Response> {
        const mail = request.body.mail

        try {
            const resetToken = nanoid(20)

            await User.findOneAndUpdate(
                { mail },
                {
                    $set: { password: null, resetToken }
                }
            )

            const mailJob: MailJob = {
                addresses: [mail],
                variables: {
                    resetToken
                },
                template: 'password-reset'
            }

            mailQueue.add(mailJob)

            // Always OK to avoid hackers
            return response.status(200).send()
        } catch (error) {
            return response.status(500).send(error)
        }
    }

    /**
     * Checks if the reset token exists. This is used to allow an user to reset their password.
     *
     * @param {Request} request
     * @param {Response} response
     * @returns {Promise<Response>}
     * @memberof AuthApi
     */
    public async checkResetToken(request: Request, response: Response): Promise<Response> {
        try {
            const user = await User.exists({ resetToken: request.params.token })

            if (!user) {
                return response.status(404).send('TOKEN_NOT_FOUND')
            }

            return response.status(200).send()
        } catch (error) {
            console.log(error)
            return response.status(500).send(error)
        }
    }

    /**
     * Resets the password of an user.
     *
     * @param {Request} request
     * @param {Response} response
     * @returns {Promise<Response>}
     * @memberof AuthApi
     */
    public async resetPassword(request: Request, response: Response): Promise<Response> {
        const matchingUser = await User.findOne({ resetToken: request.params.token })

        if (!matchingUser) {
            return response.status(404).send('TOKEN_NOT_FOUND')
        }

        try {
            const password = await bcrypt.hash(request.body.password, this.SALT_ROUNDS)

            await User.findByIdAndUpdate(
                matchingUser._id,
                {
                    $set: { password, resetToken: null }
                }
            )

            return response.status(200).send()
        } catch (error) {
            console.log(error)
            return response.status(500).send()
        }
    }

    /**
     * Updates the password of an user.
     *
     * @param {Request} request
     * @param {Response} response
     * @returns {Promise<Response>}
     * @memberof AuthApi
     */
    public async updatePassword(request: Request, response: Response): Promise<Response> {
        try {
            const password = await bcrypt.hash(request.body.password, this.SALT_ROUNDS)

            await User.findByIdAndUpdate(
                response.locals.auth.user,
                {
                    $set: { password, resetToken: null }
                }
            )

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send()
        }
    }

    public async deactivateAccount(request: Request, response: Response): Promise<Response> {
        if (await Box.count({ creator: response.locals.auth.user }) > 0) {
            return response.status(412).send('USER_STILL_HAS_BOXES')
        }

        try {
            await UserPlaylist.deleteMany({ user: response.locals.auth.user })
            await Subscriber.deleteMany({ userToken: response.locals.auth.user })
            await User.deleteOne({ _id: response.locals.auth.user })

            return response.status(200).send()
        } catch (error) {
            return response.status(500).send()
        }
    }
}

const authApi = new AuthApi()
export default authApi.router
