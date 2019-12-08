import * as chai from "chai"
const expect = chai.expect

import { Video } from "../../../../src/models/video.model"
import { PlaylistItem } from "../../../../src/models/playlist-item.model"
import banVideo from "./../../../../src/services/BoxService/actions/ban-video.action"
const BoxSchema = require("./../../../../src/models/box.model")

describe.only("Ban Video Action", () => {
    before(async () => {
        await Video.create({
            _id: '9bc72f3d7edc6312d0ef2e47',
            name: 'First Video',
            link: '4c6e3f_aZ0d',
            duration: 'PT4M12S'
        })

        await Video.create({
            _id: '9bc72f3d7edc6312d0ef2e48',
            name: 'Second Video',
            link: 'aC9d3edD3e2',
            duration: 'PT1M19S'
        })

        await BoxSchema.create({
            _id: '9cb763b6e72611381ef043e8',
            description: 'Currently playing box',
            lang: 'English',
            name: 'Closed box to delete',
            playlist: [
                // Upcoming videos
                {
                    _id: '9cb763b6e72611381ef043f2',
                    submittedAt: '2019-12-08T15:37:14',
                    video: '9bc72f3d7edc6312d0ef2e48',
                    startTime: null,
                    endTime: null,
                    ignored: true
                },
                {
                    _id: '9cb763b6e72611381ef043f1',
                    submittedAt: '2019-12-08T15:37:14',
                    video: '9bc72f3d7edc6312d0ef2e48',
                    startTime: null,
                    endTime: null,
                    ignored: false
                },
                // Currently playing video
                {
                    _id: '9cb763b6e72611381ef043f0',
                    submittedAt: '2019-12-08T15:37:14',
                    video: '9bc72f3d7edc6312d0ef2e48',
                    startTime: '2019-12-08T15:41:26',
                    endTime: null,
                    ignored: false
                },
                // Played videos
                {
                    _id: '9cb763b6e72611381ef043e9',
                    submittedAt: '2019-12-08T15:37:14',
                    video: '9bc72f3d7edc6312d0ef2e48',
                    startTime: '2019-12-08T15:37:14',
                    endTime: '2019-12-08T15:41:26',
                    ignored: false
                }
            ],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: false,
        })
    })

    after(async () => {
        await BoxSchema.remove({})
        await Video.deleteMany({})
    })

    it("Marks a video for skip", async () => {
        await banVideo.execute('9cb763b6e72611381ef043e8', '9cb763b6e72611381ef043f1')
        const box = await BoxSchema.findById('9cb763b6e72611381ef043e8')

        const targetVideo: PlaylistItem = box.playlist[1]

        console.log('target video: ', targetVideo)

        console.log('unban target: ', box.playlist[0])

        expect(targetVideo.ignored).to.equal(true)
    })
})
