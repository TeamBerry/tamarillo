import { Request, Response, Router } from "express"

const Queue = require("bull")
const mailQueue = new Queue("mail")

const User = require("./../../models/user.model")
import * as jwt from "jsonwebtoken"
import { Session } from "../../models/session.model"
import authService from "../services/auth.service"

const dotenv = require("dotenv")
dotenv.config()

export class AuthApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.init()
    }

    public init() {
        this.router.post("/login", this.login)
        this.router.post("/signup", this.signup)
        this.router.post("/reset", this.triggerPasswordReset.bind(this))
        this.router.get("/reset/:token", this.checkResetToken)
        this.router.post("/reset/:token", this.resetPassword)
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
            const user = await User.findOne({ mail, password }, 'name mail')

            // If password is not correct, send back 401 HTTP error
            if (!user) {
                return res.status(401).send("INVALID_CREDENTIALS") // Unauthorized
            }

            const authResult = authApi.createSession(user)

            // Sending bearer token
            return res.status(200).json(authResult)
        } catch (error) {
            console.log(error)
            return res.status(500).send(error)
        }
    }

    public signup(req: Request, res: Response) {
        const mail = req.body.mail
        const password = req.body.password
        const name = req.body.username

        User.findOne({ mail }, (err, user) => {
            if (err) {
                res.status(500).send(err)
            }

            if (user) {
                res.status(400).send("DUPLICATE_MAIL") // 400 Bad Request
            } else {
                User.create({ mail, password, name }, (err, newUser) => {
                    if (err) {
                        res.status(500).send(err)
                    }

                    // Once the user is crated, we send a mail to the address to welcome him
                    const mailJob = {
                        mail,
                        name,
                        type: "signup",
                    }
                    mailQueue.add(mailJob)

                    const authResult = authApi.createSession(newUser)

                    res.status(200).json(authResult)
                })
            }
        })
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
            const password = request.body.password

            const updatedUser = await User.findByIdAndUpdate(
                matchingUser._id,
                {
                    $set: { password, resetToken: null }
                }
            )

            return response.status(200).send()
        } catch (error) {
            return response.status(503).send()
        }
    }

    /**
     *
     * Creates the session for the user, based on the results of the login/signup
     *
     * @private
     * @param {*} user The user for whom the session is created
     * @param {number | string} [tokenExpiration=1296000] The duration of the session token (defaults to 1296000 seconds or 15 days)
     * @returns {Session} The JSON Web Token
     * @memberof AuthApi
     */
    public createSession(user, tokenExpiration: number | string = 1296000): Session {
        // If password is correct, Create & Sign Bearer token and send it back to client
        const jwtBearerToken = jwt.sign(
            {
                user: user._id
            },
            process.env.JWT_PASS,
            {
                algorithm: "HS256",
                expiresIn: tokenExpiration
            }
        )

        return {
            bearer: jwtBearerToken,
            subject: user,
            expiresIn: tokenExpiration,
        }
    }
}

const authApi = new AuthApi()
export default authApi.router
