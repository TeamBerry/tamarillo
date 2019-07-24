import { Router, Request, Response, NextFunction } from 'express'
import { UserPlaylist, UsersPlaylist } from '../../models/user-playlist.model';

const User = require("./../../models/user.model")

export class PlaylistApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.init()
    }

    public init() {
        this.router.get('/:playlist', this.show)
        this.router.post('/', this.store)
        this.router.put('/:playlist', this.update)
        this.router.delete('/:playlist', this.destroy)

        // Middleware testing if the user exists. Sends a 404 'USER_NOT_FOUND' if it doesn't, or let the request through
        this.router.param('playlist', async (request: Request, response: Response, next: NextFunction): Promise<Response> => {
            const matchingPlaylist: UserPlaylist = await UsersPlaylist.findById(request.params.user)

            if (!matchingPlaylist) {
                return response.status(404).send('PLAYLIST_NOT_FOUND')
            }

            next()
        })
    }

    public async show() {

    }

    public async store() {

    }

    public async update() {

    }

    public async destroy() {

    }
}

const playlistApi = new PlaylistApi()
export default playlistApi.router