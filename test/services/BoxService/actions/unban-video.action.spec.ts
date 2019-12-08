import * as bodyParser from 'body-parser'
import * as chai from "chai"
import * as express from "express"
import * as supertest from "supertest"
const expect = chai.expect

// const Box = require('./../../../src/models/box.model')

describe("Ban Video Action", () => {
    // before(async () => {
    //     await Video.create({
    //         _id: '9bc72f3d7edc6312d0ef2e47',
    //         name: 'First Video',
    //         link: '4c6e3f_aZ0d',
    //         duration: 'PT4M12S'
    //     })

    //     await Video.create({
    //         _id: '9bc72f3d7edc6312d0ef2e48',
    //         name: 'Second Video',
    //         link: 'aC9d3edD3e2',
    //         duration: 'PT1M19S'
    //     })

    //     await Box.create({
    //         _id: '9cb763b6e72611381ef043e8',
    //         description: 'Currently playing box',
    //         lang: 'English',
    //         name: 'Closed box to delete',
    //         playlist: [
    //             // Upcoming videos
    //             {
    //                 _id: '9cb763b6e72611381ef043f2',
    //                 submittedAt: '2019-12-08T15:37:14',
    //                 video: '9bc72f3d7edc6312d0ef2e48',
    //                 startTime: null,
    //                 endTime: null,
    //                 ignored: true
    //             },
    //             {
    //                 _id: '9cb763b6e72611381ef043f1',
    //                 submittedAt: '2019-12-08T15:37:14',
    //                 video: '9bc72f3d7edc6312d0ef2e48',
    //                 startTime: null,
    //                 endTime: null,
    //                 ignored: false
    //             },
    //             // Currently playing video
    //             {
    //                 _id: '9cb763b6e72611381ef043f0',
    //                 submittedAt: '2019-12-08T15:37:14',
    //                 video: '9bc72f3d7edc6312d0ef2e48',
    //                 startTime: '2019-12-08T15:41:26',
    //                 endTime: null,
    //                 ignored: false
    //             },
    //             // Played videos
    //             {
    //                 _id: '9cb763b6e72611381ef043e9',
    //                 submittedAt: '2019-12-08T15:37:14',
    //                 video: '9bc72f3d7edc6312d0ef2e48',
    //                 startTime: '2019-12-08T15:37:14',
    //                 endTime: '2019-12-08T15:41:26',
    //                 ignored: false
    //             }
    //         ],
    //         creator: '9ca0df5f86abeb66da97ba5d',
    //         open: false,
    //     })
    // })

    // after(async () => {
    //     await Box.remove({})
    //     await Video.deleteMany({})
    // })

    // it("Unmarks a video for skip", async () => {
    //     const actionRequest = {
    //         action: 'unban',
    //         target: '9cb763b6e72611381ef043f2'
    //     }

    //     return supertest(expressApp)
    //         .post('/9cb763b6e72611381ef043e8/videos')
    //         .set('Authorization', 'Bearer ' + ashJWT.bearer)
    //         .send(actionRequest)
    //         .then(async (response) => {
    //             const box = await Box.findById('9cb763b6e72611381ef043e8')

    //             const targetVideo: PlaylistItem = box.playlist[0]
    //             expect(targetVideo.ignored).to.be.false
    //         })
    // })
})
