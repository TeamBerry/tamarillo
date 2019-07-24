import { Request, Response, NextFunction } from 'express'

import * as jwt from 'jsonwebtoken'
const fs = require('fs')
const RSA_PRIVATE_KEY = fs.readFileSync('certs/private_key.pem')

module.exports.isAuthorized = (request: Request, response: Response, next: NextFunction) => {
    console.log('Auth middleware check...')
    const auth = request.headers.authorization
    if (auth) {
        // console.log('PLAYLISTS. AUTH: ', request.headers.authorization)
        try {
            const token = jwt.verify(auth, RSA_PRIVATE_KEY)
            console.log('Access granted.')
            console.log(token)
            return next()
        } catch (error) {
            console.log('Access refused: ', error)
            return response.status(401).send('UNAUTHORIZED')
        }
    }
    console.log('Access refused.')
    return response.status(401).send('UNAUTHORIZED')
}