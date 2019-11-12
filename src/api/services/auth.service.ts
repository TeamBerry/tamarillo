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
}

const authService = new AuthService()
export default authService