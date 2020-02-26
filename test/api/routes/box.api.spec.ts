import * as bodyParser from 'body-parser'
import * as chai from "chai"
import * as express from "express"
import * as supertest from "supertest"
const expect = chai.expect

import BoxApi from './../../../src/api/routes/box.api'
const Box = require('./../../../src/models/box.model')
const User = require('./../../../src/models/user.model')
const SubscriberSchema = require('./../../../src/models/subscriber.schema')
import { Video } from './../../../src/models/video.model'
import { Session } from "./../../../src/models/session.model"
import { UserPlaylistClass, UserPlaylist, UserPlaylistDocument } from '../../../src/models/user-playlist.model';
import authService from '../../../src/api/services/auth.service'

describe("Box API", () => {
    const expressApp = express()

    let ashJWT: Session = null
    let foreignJWT: Session = null

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }))
        expressApp.use('/', BoxApi)

        await User.deleteMany({
            _id: { $in: ['9ca0df5f86abeb66da97ba5d', '9ca0df5f86abeb66da97ba5e', '9ca0df5f86abeb66da97ba5f'] },
        })

        await Box.deleteMany(
            {
                _id: {
                    $in: ['9cb763b6e72611381ef043e4', '9cb763b6e72611381ef043e5',
                        '9cb763b6e72611381ef043e6', '9cb763b6e72611381ef043e7',
                        '9cb763b6e72611381ef043e8'],
                },
            },
        )

        await Video.deleteMany({
            _id: { $in: ['9bc72f3d7edc6312d0ef2e47', '9bc72f3d7edc6312d0ef2e48'] }
        })

        await SubscriberSchema.deleteMany({})

        await User.create({
            _id: '9ca0df5f86abeb66da97ba5d',
            name: 'Ash Ketchum',
            mail: 'ash@pokemon.com',
            password: 'Pikachu',
        })

        await User.create({
            _id: '9ca0df5f86abeb66da97ba5e',
            name: 'Shirona',
            mail: 'shirona@sinnoh-league.com',
            password: 'Piano',
        })

        await Box.create({
            _id: '9cb763b6e72611381ef043e4',
            description: null,
            lang: 'English',
            name: 'Test box',
            playlist: [],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: true,
        })

        await Box.create({
            _id: '9cb763b6e72611381ef043e5',
            description: 'Closed box',
            lang: 'English',
            name: 'Closed box',
            playlist: [],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: false,
        })

        await Box.create({
            _id: '9cb763b6e72611381ef043e6',
            description: 'Open box to delete',
            lang: 'English',
            name: 'Open box to delete',
            playlist: [],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: true,
        })

        await Box.create({
            _id: '9cb763b6e72611381ef043e7',
            description: 'Closed box to delete',
            lang: 'English',
            name: 'Closed box to delete',
            playlist: [],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: false,
        })

        ashJWT = authService.createSession({ _id: '9ca0df5f86abeb66da97ba5d', mail: 'ash@pokemon.com' })
        foreignJWT = authService.createSession({ _id: '9ca0df5f86abeb66da97ba5e', mail: 'shirona@sinnoh-league.com' })
    })

    after(async () => {
        await User.deleteMany({
            _id: { $in: ['9ca0df5f86abeb66da97ba5d', '9ca0df5f86abeb66da97ba5e', '9ca0df5f86abeb66da97ba5f'] },
        })

        await Box.deleteMany(
            {
                _id: {
                    $in: ['9cb763b6e72611381ef043e4', '9cb763b6e72611381ef043e5',
                        '9cb763b6e72611381ef043e6', '9cb763b6e72611381ef043e7'],
                },
            },
        )
    })

    it("Gets all boxes", () => {
        return supertest(expressApp)
            .get('/')
            .expect(200)
            .then((response) => {
                const boxes = response.body

                expect(boxes.length).to.be.greaterThan(0)
            })
    })

    describe("Gets a single box", () => {
        it("Sends a 404 back if no box matches the id given", () => {
            return supertest(expressApp)
                .get('/9cb763b6e72611381ef044e4')
                .expect(404, 'BOX_NOT_FOUND')
        })

        it("Sends a 200 with the proper box if the id matches", () => {
            return supertest(expressApp)
                .get('/9cb763b6e72611381ef043e4')
                .expect(200)
                .then((response) => {
                    const box = response.body

                    expect(box._id).to.equal('9cb763b6e72611381ef043e4')
                    expect(box.creator).to.eql({
                        _id: '9ca0df5f86abeb66da97ba5d',
                        name: 'Ash Ketchum',
                    })
                })
        })
    })

    describe("Updates a box", () => {
        it("Sends a 412 back if no request body is given", () => {
            return supertest(expressApp)
                .put('/9cb763b6e72611381ef043e4')
                .expect(412, 'MISSING_PARAMETERS')
        })

        it("Sends a 412 back if the request parameter and the _id given in the request body mismatch", () => {
            const updateBody = {
                _id: '9cb763b6e72611381ef044e4',
                description: 'Test box edited',
                lang: 'English',
                name: 'Test box',
                playlist: [],
                creator: {
                    _id: '9ca0df5f86abeb66da97ba5d',
                    name: 'Ash Ketchum',
                },
            }

            return supertest(expressApp)
                .put('/9cb763b6e72611381ef043e4')
                .send(updateBody)
                .expect(412, 'IDENTIFIER_MISMATCH')
        })

        it("Sends a 404 back if no box matches the id given", () => {
            const updateBody = {
                _id: '9cb763b6e72611381ef044e4',
                description: 'Test box edited',
                lang: 'English',
                name: 'Test box',
                playlist: [],
                creator: {
                    _id: '9ca0df5f86abeb66da97ba5d',
                    name: 'Ash Ketchum',
                },
            }

            return supertest(expressApp)
                .put('/9cb763b6e72611381ef044e4')
                .send(updateBody)
                .expect(404, 'BOX_NOT_FOUND')
        })

        it("Sends a 200 back with the updated box", () => {
            const updateBody = {
                _id: '9cb763b6e72611381ef043e4',
                description: 'Test box edited',
                lang: 'English',
                name: 'Test box',
                playlist: [],
                creator: {
                    _id: '9ca0df5f86abeb66da97ba5d',
                    name: 'Ash Ketchum',
                },
            }

            return supertest(expressApp)
                .put('/9cb763b6e72611381ef043e4')
                .send(updateBody)
                .expect(200)
                .then((response) => {
                    const updatedBox = response.body

                    expect(updatedBox.description).to.equal('Test box edited')
                })
        })
    })

    describe("Deletes a box", () => {
        it("Sends a 404 back if no box matches the id given", () => {
            return supertest(expressApp)
                .delete('/9cb763b6e72611381ef044e4')
                .expect(404, 'BOX_NOT_FOUND')
        })

        // it("Sends a 403 Forbidden error if the user attempting to close the box is not the author", () => {
        //     return supertest(expressApp)
        //         .delete('/9cb763b6e72611381ef044e4')
        //         .expect(403, 'FORBIDDEN');
        // });

        it("Sends a 412 BOX_IS_OPEN Error if the box is still open when attempting to close it", () => {
            return supertest(expressApp)
                .delete('/9cb763b6e72611381ef043e6')
                .expect(412, 'BOX_IS_OPEN')
        })

        it("Sends a 200 with the deleted box", () => {
            return supertest(expressApp)
                .delete('/9cb763b6e72611381ef043e7')
                .expect(200)
                .then((response) => {
                    const deletedBox = response.body

                    expect(deletedBox._id).to.equal('9cb763b6e72611381ef043e7')
                    expect(deletedBox.open).to.be.false
                })
        })
    })

    describe("Closes a box", () => {
        it("Sends a 404 back if no box matches the id given", () => {
            return supertest(expressApp)
                .post('/9cb763b6e72611381ef044e4/close')
                .expect(404, 'BOX_NOT_FOUND')
        })

        it("Sends a 200 with the closed box", () => {
            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043e4/close')
                .expect(200)
                .then((response) => {
                    const closedBox = response.body

                    expect(closedBox._id).to.equal('9cb763b6e72611381ef043e4')
                    expect(closedBox.open).to.be.false
                })
        })
    })

    describe("Opens a box", () => {
        it("Sends a 404 back if no box matches the id given", () => {
            return supertest(expressApp)
                .post('/9cb763b6e72611381ef044e4/open')
                .expect(404, 'BOX_NOT_FOUND')
        })

        it('Sends a 200 with the opened box', () => {
            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043e4/open')
                .expect(200)
                .then((response) => {
                    const openedBox = response.body

                    expect(openedBox._id).to.equal('9cb763b6e72611381ef043e4')
                    expect(openedBox.open).to.be.true
                })
        })
    })

    describe("Converts the box of a playlist to an user playlist", () => {
        before(async () => {
            await Box.deleteMany({
                _id: { $in: ['9cb763b6e72611381ef043e8', '9cb763b6e72611381ef043e9', '9cb763b6e72611381ef043ea'] }
            })

            await Video.deleteMany({
                _id: { $in: ['9bc72f3d7edc6312d0ef2e47', '9bc72f3d7edc6312d0ef2e48'] }
            })

            await UserPlaylist.findByIdAndDelete('7dec3a584ec1317ade113a58')

            await Video.create({
                _id: '9bc72f3d7edc6312d0ef2e47',
                name: 'First Video',
                link: '4c6e3f_aZ0d'
            })

            await Video.create({
                _id: '9bc72f3d7edc6312d0ef2e48',
                name: 'Second Video',
                link: 'aC9d3edD3e2'
            })

            await Box.create({
                _id: '9cb763b6e72611381ef043e8',
                description: 'Box with empty playlist',
                lang: 'English',
                name: 'Empty playlist',
                playlist: [
                ],
                creator: '9ca0df5f86abeb66da97ba5d',
                open: false,
            })

            await Box.create({
                _id: '9cb763b6e72611381ef043e9',
                description: 'Box with playlist of unique videos only',
                lang: 'English',
                name: 'Box with playlist of unique videos only',
                playlist: [
                    {
                        video: '9bc72f3d7edc6312d0ef2e47',
                        startTime: "2018-05-20T16:51:29.934+0000",
                        endTime: "2019-07-11T08:53:53.415+0000",
                        submittedAt: "2019-07-11T08:51:29.885+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    },
                    {
                        video: '9bc72f3d7edc6312d0ef2e48',
                        startTime: "2019-07-11T08:53:53.415+0000",
                        endTime: null,
                        submittedAt: "2019-07-11T08:51:29.886+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    }
                ],
                creator: '9ca0df5f86abeb66da97ba5d',
                open: false,
            })

            await Box.create({
                _id: '9cb763b6e72611381ef043ea',
                description: 'Box with playlist with duplicate entry',
                lang: 'English',
                name: 'Box with playlist with duplicate entry',
                playlist: [
                    {
                        video: '9bc72f3d7edc6312d0ef2e47',
                        startTime: "2018-05-20T16:51:29.934+0000",
                        endTime: "2019-07-11T08:53:53.415+0000",
                        submittedAt: "2019-07-11T08:51:29.885+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    },
                    {
                        video: '9bc72f3d7edc6312d0ef2e48',
                        startTime: "2019-07-11T08:53:53.415+0000",
                        endTime: null,
                        submittedAt: "2019-07-11T08:51:29.886+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    },
                    {
                        video: '9bc72f3d7edc6312d0ef2e47',
                        startTime: null,
                        endTime: null,
                        submittedAt: "2019-07-11T08:51:29.887+0000",
                        submitted_by: '9ca0df5f86abeb66da97ba5d'
                    }
                ],
                creator: '9ca0df5f86abeb66da97ba5d',
                open: false,
            })

            await UserPlaylist.create({
                _id: '7dec3a584ec1317ade113a58',
                name: 'Existing playlist with videos',
                user: '9ca0df5f86abeb66da97ba5d',
                isPrivate: true,
                videos: ['9bc72f3d7edc6312d0ef2e48']
            })
        })

        after(async () => {
            await Box.deleteMany({
                _id: { $in: ['9cb763b6e72611381ef043e8', '9cb763b6e72611381ef043e9', '9cb763b6e72611381ef043ea'] }
            })

            await Video.deleteMany({
                _id: { $in: ['9bc72f3d7edc6312d0ef2e47', '9bc72f3d7edc6312d0ef2e48'] }
            })

            await UserPlaylist.findByIdAndDelete('7dec3a584ec1317ade113a58')
        })

        it("Sends a 401 if there's no authentication", () => {
            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043e8/convert')
                .expect(401, 'UNAUTHORIZED')
        })

        it("Sends a 412 if the playlist body for creation is missing some parameters", () => {
            const playlistSettings: Partial<UserPlaylistDocument> = {
                name: 'Test New Playlist 2',
                isPrivate: false
            };

            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043ea/convert')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send(playlistSettings)
                .expect(412, 'MISSING_PARAMETERS')
        })

        it("Sends a 401 if there's a playlist specified as target but is not the user's", () => {
            const playlistSettings: Partial<UserPlaylistDocument> = {
                name: 'Test New Playlist 2',
                isPrivate: false,
                user: {
                    _id: '9ca0df5f86abeb66da97ba5d',
                    name: 'Ask Ketchum'
                }
            };

            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043e8/convert')
                .set('Authorization', 'Bearer ' + foreignJWT.bearer)
                .send(playlistSettings)
                .expect(401, 'UNAUTHORIZED')
        })

        it("Sends a 412 if the source box has no videos in its playlist", () => {
            const playlistSettings: Partial<UserPlaylistDocument> = {
                name: 'Test New Playlist 2',
                isPrivate: false,
                user: {
                    _id: '9ca0df5f86abeb66da97ba5d',
                    name: 'Ask Ketchum'
                }
            };

            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043e8/convert')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send(playlistSettings)
                .expect(412, 'EMPTY_PLAYLIST')
        })

        it("Creates a new playlist if no playlist target is specified", () => {
            const playlistSettings: Partial<UserPlaylistDocument> = {
                name: 'Test New Playlist',
                isPrivate: false,
                user: {
                    _id: '9ca0df5f86abeb66da97ba5d',
                    name: 'Ask Ketchum'
                }
            };

            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043e9/convert')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send(playlistSettings)
                .expect(200)
                .then(async (response) => {
                    const playlist: Partial<UserPlaylistDocument> = {
                        name: 'Test New Playlist',
                        isPrivate: false,
                        user: {
                            _id: '9ca0df5f86abeb66da97ba5d',
                            name: 'Ash Ketchum'
                        },
                        videos: [
                            {
                                _id: '9bc72f3d7edc6312d0ef2e47',
                                name: 'First Video',
                                link: '4c6e3f_aZ0d'
                            },
                            {
                                _id: '9bc72f3d7edc6312d0ef2e48',
                                name: 'Second Video',
                                link: 'aC9d3edD3e2'
                            }
                        ]
                    }

                    const createdPlaylist: UserPlaylistDocument = response.body

                    expect(createdPlaylist.name).to.equal(playlist.name)
                    expect(createdPlaylist.videos).to.deep.equal(playlist.videos)

                    await UserPlaylist.findByIdAndDelete(createdPlaylist._id)
                })
        })

        it("Creates a new playlist with only unique videos from the source box", () => {
            const playlistSettings: Partial<UserPlaylistDocument> = {
                name: 'Test New Playlist 2',
                isPrivate: false,
                user: {
                    _id: '9ca0df5f86abeb66da97ba5d',
                    name: 'Ask Ketchum'
                }
            };

            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043ea/convert')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send(playlistSettings)
                .expect(200)
                .then(async (response) => {
                    const playlist: Partial<UserPlaylistDocument> = {
                        name: 'Test New Playlist 2',
                        isPrivate: false,
                        user: {
                            _id: '9ca0df5f86abeb66da97ba5d',
                            name: 'Ash Ketchum'
                        },
                        videos: [
                            {
                                _id: '9bc72f3d7edc6312d0ef2e47',
                                name: 'First Video',
                                link: '4c6e3f_aZ0d'
                            },
                            {
                                _id: '9bc72f3d7edc6312d0ef2e48',
                                name: 'Second Video',
                                link: 'aC9d3edD3e2'
                            }
                        ]
                    }

                    const createdPlaylist: UserPlaylistDocument = response.body

                    expect(createdPlaylist.name).to.equal(playlist.name)
                    expect(createdPlaylist.videos).to.deep.equal(playlist.videos)

                    await UserPlaylist.findByIdAndDelete(createdPlaylist._id)
                })
        })

        it("Updates a playlist with unique videos if an existing playlist is specified as target", () => {
            const playlistSettings: Partial<UserPlaylistDocument> = {
                _id: '7dec3a584ec1317ade113a58'
            };

            return supertest(expressApp)
                .post('/9cb763b6e72611381ef043ea/convert')
                .set('Authorization', 'Bearer ' + ashJWT.bearer)
                .send(playlistSettings)
                .expect(200)
                .then(async (response) => {
                    const playlist: Partial<UserPlaylistDocument> = {
                        _id: '7dec3a584ec1317ade113a58',
                        name: 'Existing playlist with videos',
                        isPrivate: false,
                        user: {
                            _id: '9ca0df5f86abeb66da97ba5d',
                            name: 'Ash Ketchum'
                        },
                        videos: [
                            {
                                _id: '9bc72f3d7edc6312d0ef2e48',
                                name: 'Second Video',
                                link: 'aC9d3edD3e2'
                            },
                            {
                                _id: '9bc72f3d7edc6312d0ef2e47',
                                name: 'First Video',
                                link: '4c6e3f_aZ0d'
                            }
                        ]
                    }

                    const createdPlaylist: UserPlaylistDocument = response.body

                    expect(createdPlaylist._id).to.equal(playlist._id)
                    expect(createdPlaylist.name).to.equal(playlist.name)
                    expect(createdPlaylist.videos).to.deep.equal(playlist.videos)

                    await UserPlaylist.findByIdAndDelete(createdPlaylist._id)
                })
        })
    })

    describe("Gets all users currently in a box", () => {
        before(async () => {
            await SubscriberSchema.create([
                {
                    origin: "BERRYBOX PNEUMA",
                    boxToken: '9cb763b6e72611381ef043e4',
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    socket: ''
                },
                {
                    origin: "BERRYBOX PNEUMA",
                    boxToken: '9cb763b6e72611381ef043e7',
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    socket: ''
                }
            ])
        })

        after(async () => {
            await SubscriberSchema.deleteMany({})
        })

        it("Sends a 404 back if no box matches the id given", () => {
            return supertest(expressApp)
                .get('/9cb763b6e72611381ef044e4/users')
                .expect(404, 'BOX_NOT_FOUND')
        })

        it("Sends a 200 with the users", () => {
            return supertest(expressApp)
                .get('/9cb763b6e72611381ef043e4/users')
                .expect(200)
                .then((response) => {
                    const users = response.body

                    expect(users).to.have.lengthOf(1)

                    expect(users[0].name).to.equal('Shirona')
                    expect(users[0].password).to.be.undefined
                })
        })
    })
})
