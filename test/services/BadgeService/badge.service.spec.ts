import * as chai from "chai"
import { Badge } from "../../../src/models/badge.model"
import { User } from "../../../src/models/user.model"
import badgeService from "../../../src/services/BadgeService/badge.service"
const expect = chai.expect

describe("Badge Service", () => {
    before(async () => {
        await Badge.deleteMany({})
        await User.deleteMany({})

        await User.create([
            {
                _id: '9ca0df5f86abeb66da97ba5d',
                name: 'Ash Ketchum',
                mail: 'ash@pokemon.com',
                password: 'Pikachu',
                resetToken: null,
                badges: [
                    {
                        badge: '5fd8d15e9b531221851e7cb2',
                        unlockedAt: new Date()
                    }
                ]
            },
            {
                _id: '9ca0df5f86abeb66da97ba5e',
                name: 'Shirona',
                mail: 'shirona@sinnoh-league.com',
                password: 'Piano',
                badges: []
            }
        ])

        await Badge.create([
            {
                _id: '5fd8d15e9b531221851e7ca9',
                name: 'V2 Beta',
                picture: '',
                description: 'V2 Beta',
                isSecret: false,
                availableFrom: null,
                availableTo: '2021-05-30T23:59:59Z',
                unlockConditions: {
                    key: 'box.join',
                    value: 'blueberry',
                    valueType: 'string'
                }
            },
            {
                _id: '5fd8d15e9b531221851e7cb0',
                name: 'Expired Beta Badger',
                picture: '',
                description: 'V1 Beta',
                isSecret: false,
                availableFrom: null,
                availableTo: '2017-10-31T23:59:59Z',
                unlockConditions: {
                    key: 'box.join',
                    value: 'oldberry',
                    valueType: 'string'
                }
            },
            {
                _id: '5fd8d15e9b531221851e7cb1',
                name: '2022 Badge',
                picture: '',
                description: '2022',
                isSecret: false,
                availableFrom: '2022-01-01T00:00:00Z',
                availableTo: '2022-12-31T23:59:59Z',
                unlockConditions: {
                    key: 'box.join',
                    value: '2022berry',
                    valueType: 'string'
                }
            },
            {
                _id: '5fd8d15e9b531221851e7cb2',
                name: 'Resident I',
                picture: '',
                description: '50 Berries',
                isSecret: false,
                availableFrom: null,
                availableTo: null,
                unlockConditions: {
                    key: 'subscription.berries',
                    value: '50',
                    valueType: 'number'
                }
            },
            {
                _id: '5fd8d15e9b531221851e7cb3',
                name: 'Resident II',
                picture: '',
                description: '200 Berries',
                isSecret: false,
                availableFrom: null,
                availableTo: null,
                unlockConditions: {
                    key: 'subscription.berries',
                    value: '200',
                    valueType: 'number'
                }
            }
        ])
    })

    after(async () => {
        await Badge.deleteMany({})
        await User.deleteMany({})
    })

    it("Does not award the badge if it's not yet available", async () => {
        // Award the 2022 badge
        await badgeService.handleEvent(
            {
                subject: { key: 'box.join', value: '2022berry' },
                userToken: '9ca0df5f86abeb66da97ba5d'
            }
        )

        const userBadges = (
            await User.findById('9ca0df5f86abeb66da97ba5d').select('badges').lean()
        ).badges.map(badge => badge.badge.toString())

        expect(userBadges).to.not.includes('5fd8d15e9b531221851e7cb1')
    })

    it("Does not award the badge it it's not available anymore", async () => {
        // Award the V1 Badge
        await badgeService.handleEvent(
            {
                subject: { key: 'box.join', value: 'oldberry' },
                userToken: '9ca0df5f86abeb66da97ba5d'
            }
        )

        const userBadges = (
            await User.findById('9ca0df5f86abeb66da97ba5d').select('badges').lean()
        ).badges.map(badge => badge.badge.toString())

        expect(userBadges).to.not.includes('5fd8d15e9b531221851e7cb1')
    })

    it("Does not award the badge if they already have it", async () => {
        // Award the 50 berries badge
        await badgeService.handleEvent(
            {
                subject: { key: 'subscription.berries', value: 50 },
                userToken: '9ca0df5f86abeb66da97ba5d'
            }
        )

        const userBadges = (
            await User.findById('9ca0df5f86abeb66da97ba5d').select('badges').lean()
        ).badges.map(badge => badge.badge.toString())

        expect(userBadges).to.includes('5fd8d15e9b531221851e7cb2')
        expect(userBadges).to.length(1)
    })

    it("Awards the badge to the user if they don't have it", async () => {
        // Award the 200 berries badge
        await badgeService.handleEvent(
            {
                subject: { key: 'subscription.berries', value: 200 },
                userToken: '9ca0df5f86abeb66da97ba5d'
            }
        )

        const userBadges = (
            await User.findById('9ca0df5f86abeb66da97ba5d').select('badges').lean()
        ).badges.map(badge => badge.badge.toString())

        expect(userBadges).to.includes('5fd8d15e9b531221851e7cb3')
        expect(userBadges).to.length(2)
    })

    it("Awards multiple badges to an user (catch-up mechanic)", async () => {
        // Award the 200 berries badge
        await badgeService.handleEvent(
            {
                subject: { key: 'subscription.berries', value: 200 },
                userToken: '9ca0df5f86abeb66da97ba5e'
            }
        )

        const userBadges = (
            await User.findById('9ca0df5f86abeb66da97ba5e').select('badges').lean()
        ).badges.map(badge => badge.badge.toString())

        expect(userBadges).to.includes('5fd8d15e9b531221851e7cb2')
        expect(userBadges).to.includes('5fd8d15e9b531221851e7cb3')
        expect(userBadges).to.length(2)
    })
})
