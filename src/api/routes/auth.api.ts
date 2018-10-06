import { Request, Response, Router } from 'express';

var Redis = require('ioredis');
var publisher = new Redis();

const User = require("./../../models/user.model");
const fs = require('fs');
import * as jwt from 'jsonwebtoken';

const RSA_PRIVATE_KEY = fs.readFileSync('src/private_key.pem');

export class AuthApi {
    public router: Router;

    constructor() {
        this.router = Router();
        this.init();
    }

    public init() {
        this.router.post("/login", this.login);
    }

    public login(req: Request, res: Response) {
        const mail = req.body.mail;
        const password = req.body.password;

        // Find user in database
        User
            .findOne({ mail: mail, password: password })
            .populate('favorites')
            .exec((err, user) => {
                if (err) {
                    res.status(500).send(err);
                }

                // If password is not correct, send back 401 HTTP error
                if (!user) {
                    res.status(401); // Unauthorized
                }

                const authResult = authApi.createSession(user);

                // Sending bearer token
                res.status(200).json(authResult);
            });
    }

    public signup(req: Request, res: Response) {
        const mail = req.body.mail;
        const password = req.body.password;

        User.findOne({ mail: mail }, (err, user) => {
            if (err) {
                res.status(500).send(err);
            }

            if (user) {
                res.status(400); // 400 Bad Request
            } else {
                User.create({ mail: mail, password: password }, (err, newUser) => {
                    if (err) {
                        res.status(500).send(err);
                    }

                    // Once the user is created, we send a mail to the address to welcome him
                    publisher.publish('mail', 'Hello world');

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
     * @returns The JSON Web Token
     * @memberof AuthApi
     */
    private createSession(user, tokenExpiration = 1296000) {
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