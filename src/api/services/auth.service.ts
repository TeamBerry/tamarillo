import * as jwt from "jsonwebtoken"

import { Session } from "../../models/session.model"
import { PRIVATE_KEY } from '../../config/keys'

export class AuthService {
    /**
     * Generates a 40-character long auth token for signup & password reset.
     *
     * @param {number} [length=40]
     * @returns {string}
     * @memberof AuthService
     */
    public generateAuthenticationToken(length = 40): string {
        const values = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_"
        let authToken = ""

        for (let i = length; i > 0; --i) {
            authToken += values[Math.round(Math.random() * (values.length - 1))]
        }

        return authToken
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
            PRIVATE_KEY,
            {
                issuer: 'Berrybox',
                algorithm: "RS256",
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

const authService = new AuthService()
export default authService