import { Request, Response, Router } from "express"
import axios from 'axios'
import { YoutubeSearchListResponse, SearchListResponseItem, YoutubeVideoListResponse, VideoListResponseItem } from "../../models/youtube.model"
import { VideoClass } from "../../models/video.model"
const auth = require("./../middlewares/auth.middleware")

const router = Router()

router.get("/", auth.isAuthorized, async (request: Request, response: Response) => {
    try {
        const youtubeRequest = await axios({
            url: 'https://www.googleapis.com/youtube/v3/search',
            params: {
                part: 'snippet',
                maxResults: 50,
                q: request.query.value,
                type: 'video',
                key: process.env.YOUTUBE_API_KEY
            }
        })

        const videoIds: Array<string> = []
        const videos: Array<VideoClass> = []

        ;(youtubeRequest.data as YoutubeSearchListResponse).items.map((item: SearchListResponseItem) => {
            videoIds.push(item.id.videoId)

            videos.push({
                link: item.id.videoId,
                name: item.snippet.title,
                duration: null
            })
        })

        // Search does not get the duration of videos.
        const youtubeDurationRequest = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.toString()}&key=${process.env.YOUTUBE_API_KEY}`)

        ;(youtubeDurationRequest.data as YoutubeVideoListResponse).items.map((item: VideoListResponseItem, index) => {
            videos[index].duration = item.contentDetails.duration
        })

        return response.status(200).send(videos)
    } catch (error) {
        return response.status(500).send('The server could not handle your request. Please try again later.')
    }
})

export const SearchApi = router
