import { Request, Response, Router } from "express"

const Queue = require("bull")
const mailQueue = new Queue("mail")
import * as bcrypt from 'bcrypt'

const User = require("./../../models/user.model")
import { MailJob } from "../../models/mail.job"
import authService from "../services/auth.service"

const dotenv = require("dotenv")
dotenv.config()

export class AuthApi {
    public router: Router
    public readonly SALT_ROUNDS = 10

    constructor() {
        this.router = Router()
        this.init()
    }

    public init() {
        this.router.post("/login", this.login)
        this.router.post("/signup", this.signup.bind(this))
        this.router.post("/reset", this.triggerPasswordReset.bind(this))
        this.router.get("/reset/:token", this.checkResetToken)
        this.router.post("/reset/:token", this.resetPassword.bind(this))
    }

    /**
     * Logs the user in and creates his session
     *
     * @param {Request} req The request, which body must contain the mail and password parameters
     * @param {Response} res The response
     * @returns {Promise<Response>} A valid session or of one the following errors:
     * - 412 'MISSING_CREDENTIALS' if the request body is incompolete
     * - 401 'INVALID_CREDENTIALS' if the credentials do not match any user
     * - 500 Server Error if anything else happens
     * @memberof AuthApi
     */
    public async login(req: Request, res: Response): Promise<Response> {
        const mail = req.body.mail
        const password = req.body.password

        if (!mail || !password) {
            return res.status(412).send("MISSING_CREDENTIALS")
        }

        try {
            // Find user in database
            const user = await User.findOne({ mail }, 'name mail settings password')

            // If password is not correct, send back 401 HTTP error
            if (!user) {
                return res.status(401).send("INVALID_CREDENTIALS") // Unauthorized
            }

            if (await bcrypt.compare(password, user.password)) {
                const authResult = authService.createSession(user)

                // Sending bearer token
                return res.status(200).json(authResult)
            } else {
                return res.status(401).send("INVALID_CREDENTIALS")
            }
        } catch (error) {
            console.log(error)
            return res.status(500).send(error)
        }
    }

    public async signup(request: Request, response: Response): Promise<Response> {
        const { mail, password, name } = request.body

        try {
            const userExists = await User.exists({ mail })

            if (userExists) {
                return response.status(409).send()
            }

            const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS)

            const createdUser = await User.create({
                mail,
                password: hashedPassword,
                name
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
            const resetToken = authService.generateAuthenticationToken(20)

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
}

const authApi = new AuthApi()
export default authApi.router
