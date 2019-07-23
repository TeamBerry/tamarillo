import { Request, Response, NextFunction } from 'express'

module.exports.isAuthorized = (request: Request, response: Response, next: NextFunction) => {
    if (!request.headers.authorization) {
        // console.log('PLAYLISTS. AUTH: ', request.headers.authorization)
        try {
            // const token = jwt.verify(request.headers.authorization, RSA_PUBLIC_KEY)
            // console.log(token)
            // filters.private = true
            console.log('ACCESS GRANTED')
            return next()
        } catch (error) {
            console.log(error)
            return response.status(401).send('UNAUTHORIZED')
        }
    }
    return response.status(401).send('UNAUTHORIZED')
}