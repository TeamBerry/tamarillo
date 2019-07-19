import { Request, Response, Router } from 'express';

var Queue = require('bull');
var mailQueue = new Queue('mail');

const User = require("./../../models/user.model");
const fs = require('fs');
import * as jwt from 'jsonwebtoken';
import { Session } from '../../models/session.model';

const RSA_PRIVATE_KEY = fs.readFileSync('certs/private_key.pem');

export class AuthApi {
    public router: Router;

    constructor() {
        this.router = Router();
        this.init();
    }

    public init() {
        this.router.post("/login", this.login);
        this.router.post("/signup", this.signup);
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
        const mail = req.body.mail;
        const password = req.body.password;

        if (!mail || !password) {
            return res.status(412).send('MISSING_CREDENTIALS');
        }

        try {
            // Find user in database
            const user = await User.findOne({ mail: mail, password: password });

            // If password is not correct, send back 401 HTTP error
            if (!user) {
                return res.status(401).send('INVALID_CREDENTIALS'); // Unauthorized
            }

            const authResult = authApi.createSession(user);

            // Sending bearer token
            return res.status(200).json(authResult);
        } catch (error) {
            return res.status(500).send(error);
        }
    }

    public signup(req: Request, res: Response) {
        const mail = req.body.mail;
        const password = req.body.password;
        const name = req.body.username;

        User.findOne({ mail: mail }, (err, user) => {
            if (err) {
                res.status(500).send(err);
            }

            if (user) {
                res.status(400).send('DUPLICATE_MAIL'); // 400 Bad Request
            } else {
                User.create({ mail: mail, password: password, name: name }, (err, newUser) => {
                    if (err) {
                        res.status(500).send(err);
                    }

                    // Once the user is crated, we send a mail to the address to welcome him
                    const mailJob = {
                        mail: mail,
                        name: name,
                        type: 'signup'
                    }
                    mailQueue.add(mailJob);

                    const authResult = authApi.createSession(newUser);

                    res.status(200).json(authResult);
                });
            }
        });

    }


    /**
     *
     * Creates the session for the user, based on the results of the login/signup
     *
     * @private
     * @param {*} user The user for whom the session is created
     * @param {number} [tokenExpiration=1296000] The duration of the session token (defaults to 1296000 seconds or 15 days)
     * @returns {Session} The JSON Web Token
     * @memberof AuthApi
     */
    private createSession(user, tokenExpiration = 1296000): Session {
        // If password is correct, Create & Sign Bearer token and send it back to client
        const jwtBearerToken = jwt.sign({}, { key: RSA_PRIVATE_KEY, passphrase: 'BerryboxChronos' }, {
            algorithm: 'RS256',
            expiresIn: tokenExpiration,
            subject: String(user._id)
        });

        return {
            bearer: jwtBearerToken,
            subject: user,
            expiresIn: tokenExpiration
        };
    }
}

const authApi = new AuthApi();
export default authApi.router;