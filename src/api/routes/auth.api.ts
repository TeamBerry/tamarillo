import { Request, Response, Router } from 'express';

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

        console.log('mail: ', mail, ' password: ', password);

        // Find user in database
        User.findOne({ mail: mail, password: password }, (err, document) => {
            if (err) {
                res.status(500).send(err);
            }

            // If password is not correct, send back 401 HTTP error
            if (!document) {
                res.status(401); // Unauthorized
            }

            console.log(document);

            // If password is correct, Create & Sign Bearer token and send it back to client
            const jwtBearerToken = jwt.sign({}, { key: RSA_PRIVATE_KEY, passphrase: 'BerryboxChronos' }, {
                algorithm: 'RS256',
                expiresIn: 120,
                subject: String(document._id)
            });

            res.status(200).send(jwtBearerToken);

        });
    }
}

const authApi = new AuthApi();
authApi.init();
export default authApi.router;