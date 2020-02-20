import { Request, Response, Router } from "express"
import axios from 'axios'
const auth = require("./../auth.middleware")

export class SearchApi {
    public router: Router

    constructor() {
        this.router = Router()
        this.router.use(auth.isAuthorized)
        this.init()
    }

    public init = () => {
        this.router.get("/", this.search)
    }

    /**
     * Searches on youtube for results matching the value given. Requires auth.
     *
     * @param {Request} request
     * @param {Response} response
     * @returns {Promise<Response>}
     * @memberof SearchApi
     */
    public async search(request: Request, response: Response): Promise<Response> {
        try {
            const youtubeRequest = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${request.query.value}&type=video&key=${process.env.YOUTUBE_API_KEY}`)

            return response.status(200).send(youtubeRequest.data)
        } catch (error) {
            return response.status(500).send('The server could not handle your request. Please try again later.')
        }
    }
}

const searchApi = new SearchApi()
export default searchApi.router
