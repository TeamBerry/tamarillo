import * as chai from "chai"
const expect = chai.expect

import berriesService from '../../../src/services/BoxService/berries.service'
import { Subscriber } from '../../../src/models/subscriber.model'
import { User } from "../../../src/models/user.model"
const Box = require('../../../src/models/box.model')

describe("Berries Service", () => {
    before(async () => {
        await Subscriber.deleteMany({})
        await Box.deleteMany({})
        await User.deleteMany({})

        await User.create([
            {
                _id: '9ca0df5f86abeb66da97ba5d',
                name: 'Ash Ketchum',
                mail: 'ash@pokemon.com',
                password: 'Pikachu',
                resetToken: null
            },
            {
                _id: '9ca0df5f86abeb66da97ba5e',
                name: 'Shirona',
                mail: 'shirona@sinnoh-league.com',
                password: null,
                resetToken: 'yuaxPLMxE1R1XiA7lvRd'
            }
        ])

        await Box.create({
            _id: '9cb763b6e72611381ef043e4',
            description: null,
            lang: 'English',
            name: 'Test box',
            playlist: [],
            creator: '9ca0df5f86abeb66da97ba5d',
            open: true,
            options: {
                random: true,
                refresh: false
            }
        })

        await Subscriber.create([
            {
                userToken: '9ca0df5f86abeb66da97ba5d',
                boxToken: '9cb763b6e72611381ef043e4',
                connexions: [],
                berries: 0,
                role: 'admin'
            },
            {
                userToken: '9ca0df5f86abeb66da97ba5e',
                boxToken: '9cb763b6e72611381ef043e4',
                connexions: [],
                berries: 750,
                role: 'simple'
            }
        ])
    })

    after(async () => {
        await Subscriber.deleteMany({})
        await Box.deleteMany({})
        await User.deleteMany({})
    })

    it("Add berries to a subscriber", async () => {
        await berriesService.increaseBerryCount({ userToken: '9ca0df5f86abeb66da97ba5d', boxToken: '9cb763b6e72611381ef043e4' }, 30)

        const user = await Subscriber.findOne({ userToken: '9ca0df5f86abeb66da97ba5d', boxToken: '9cb763b6e72611381ef043e4' })

        expect(user.berries).to.equal(30)
    })

    it("Remove berries to a subscriber", async () => {
        await berriesService.decreaseBerryCount({ userToken: '9ca0df5f86abeb66da97ba5e', boxToken: '9cb763b6e72611381ef043e4' }, 75)

        const user = await Subscriber.findOne({ userToken: '9ca0df5f86abeb66da97ba5e', boxToken: '9cb763b6e72611381ef043e4' })

        expect(user.berries).to.equal(675)
    })
})