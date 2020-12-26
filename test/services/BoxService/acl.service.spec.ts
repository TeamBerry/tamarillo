import * as chai from "chai"
const expect = chai.expect
const mongoose = require('mongoose')

import aclService from '../../../src/services/BoxService/acl.service'

const Box = require("../../../src/models/box.model")
import { User } from "../../../src/models/user.model"
import { Subscriber } from "../../../src/models/subscriber.model"
import { RoleChangeRequest } from "../../../src/models/role-change.model"
import { FeedbackMessage } from "@teamberry/muscadine"

describe("ACL Service", () => {
    before(async () => {
        await Box.deleteMany({})
        await User.deleteMany({})
        await Subscriber.deleteMany({})

        await User.create([
            {
                _id: '9ca0df5f86abeb66da97ba5d',
                name: 'Ash Ketchum',
                mail: 'ash@pokemon.com',
                password: 'Pikachu'
            },
            {
                _id: '9ca0df5f86abeb66da97ba5e',
                name: 'Brock',
                mail: 'brock@pokemon.com',
                password: 'Onix'
            },
            {
                _id: '9ca0df5f86abeb66da97ba5f',
                name: 'Misty',
                mail: 'misty@pokemon.com',
                password: 'Staryu'
            },
            {
                _id: '9ca0df5f86abeb66da97ba60',
                name: 'Lt. Surge',
                mail: 'surge@pokemon.com',
                password: 'Raichu'
            },
            {
                _id: '9ca0df5f86abeb66da97ba61',
                name: 'Koga',
                mail: 'koga@pokemon.com',
                password: 'Koffing'
            },
            {
                _id: '9ca0df5f86abeb66da97ba62',
                name: 'Sabrina',
                mail: 'sabrina@pokemon.com',
                password: 'Alakazam'
            },
            {
                _id: '9ca0df5f86abeb66da97ba63',
                name: 'Shirona',
                mail: 'shirona@pokemon.com',
                password: 'Garchomp'
            }
        ])

        await Box.create([
            {
                _id: '9cb763b6e72611381ef043e5',
                description: 'The Pokémon Box',
                lang: 'en',
                name: 'Pokémon',
                playlist: [],
                creator: '9ca0df5f86abeb66da97ba5d',
                open: true,
                options: {
                    random: true,
                    loop: true,
                    berries: true
                }
            }
        ])

        await Subscriber.create([
            // Admin: Ash
            {
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba5d',
                connexions: [],
                berries: 0,
                role: 'admin'
            },
            // Moderators: Brock & Misty
            {
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba5e',
                connexions: [],
                berries: 1,
                role: 'moderator'
            },
            {
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba5f',
                connexions: [],
                berries: 13,
                role: 'moderator'
            },
            // VIP: Shirona
            {
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba63',
                connexions: [],
                berries: 13,
                role: 'vip'
            },
            // Community Members: Everyone else
            {
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba60',
                connexions: [],
                berries: 72,
                role: 'simple'
            },
            {
                boxToken: '9cb763b6e72611381ef043e5',
                userToken: '9ca0df5f86abeb66da97ba61',
                connexions: [],
                berries: 13,
                role: 'simple'
            }
        ])
    })

    after(async () => {
        await Box.deleteMany({})
        await User.deleteMany({})
        await Subscriber.deleteMany({})
    })

    describe("Evaluate a command", () => { })

    describe("Change the role of an user", () => {
        it("Fails if the target does not exist", async () => {
            const request: RoleChangeRequest = {
                source: '9ca0df5f86abeb66da97ba5d',
                scope: {
                    userToken: '9ca0df5f86abeb66da97ba70',
                    boxToken: '9cb763b6e72611381ef043e5'
                },
                role: 'moderator'
            }

            try {
                await aclService.onRoleChangeRequested(request)
                chai.assert.fail()
            } catch (error) {
                expect(error.message).to.equal("The user you want to act on is not part of your community for that box.")
            }
        })

        it("Fails if the target is not a subscriber", async () => {
            const request: RoleChangeRequest = {
                source: '9ca0df5f86abeb66da97ba5d',
                scope: {
                    userToken: '9ca0df5f86abeb66da97ba62',
                    boxToken: '9cb763b6e72611381ef043e5'
                },
                role: 'moderator'
            }

            try {
                await aclService.onRoleChangeRequested(request)
                chai.assert.fail()
            } catch (error) {
                expect(error.message).to.equal("The user you want to act on is not part of your community for that box.")
            }
        })

        it("Fails if the target is admin", async () => {
            const request: RoleChangeRequest = {
                source: '9ca0df5f86abeb66da97ba5d',
                scope: {
                    userToken: '9ca0df5f86abeb66da97ba5d',
                    boxToken: '9cb763b6e72611381ef043e5'
                },
                role: 'moderator'
            }

            try {
                await aclService.onRoleChangeRequested(request)
                chai.assert.fail()
            } catch (error) {
                expect(error.message).to.equal("You cannot change the role of the box creator.")
            }
        })

        it("Fails to promote to moderator if the source is not admin", async () => {
            const request: RoleChangeRequest = {
                source: '9ca0df5f86abeb66da97ba5e',
                scope: {
                    userToken: '9ca0df5f86abeb66da97ba60',
                    boxToken: '9cb763b6e72611381ef043e5'
                },
                role: 'moderator'
            }

            try {
                await aclService.onRoleChangeRequested(request)
                chai.assert.fail()
            } catch (error) {
                expect(error.message).to.equal("Only the box creator can promote moderators.")
            }
        })

        it("Fails to demote a moderator if the source is not admin", async () => {
            const request: RoleChangeRequest = {
                source: '9ca0df5f86abeb66da97ba5e',
                scope: {
                    userToken: '9ca0df5f86abeb66da97ba5f',
                    boxToken: '9cb763b6e72611381ef043e5'
                },
                role: 'simple'
            }

            try {
                await aclService.onRoleChangeRequested(request)
                chai.assert.fail()
            } catch (error) {
                expect(error.message).to.equal("Only the box creator can demote moderators.")
            }
        })

        it("Succeeds a promotion to VIP of a community member", async () => {
            const request: RoleChangeRequest = {
                source: '9ca0df5f86abeb66da97ba5e',
                scope: {
                    userToken: '9ca0df5f86abeb66da97ba60',
                    boxToken: '9cb763b6e72611381ef043e5'
                },
                role: 'vip'
            }

            const response: [FeedbackMessage, FeedbackMessage] = await aclService.onRoleChangeRequested(request)

            const feedbackForSource = response[0]
            const feedbackForTarget = response[1]

            expect(feedbackForSource.context).to.equal('success')
            expect(feedbackForSource.scope).to.equal(request.scope.boxToken)
            expect(feedbackForSource.contents).to.equal("Lt. Surge is now one of your VIPs on this box.")

            expect(feedbackForTarget.context).to.equal('success')
            expect(feedbackForTarget.scope).to.equal(request.scope.boxToken)
            expect(feedbackForTarget.contents).to.equal("Brock promoted you to VIP! Your new privileges will appear in a few moments.")

            const promotedMember = await Subscriber.findOne({ userToken: '9ca0df5f86abeb66da97ba60' }).lean()
            expect(promotedMember.role).to.equal('vip')
        })

        it("Succeeds a promotion to Moderator of a community member", async () => {
            const request: RoleChangeRequest = {
                source: '9ca0df5f86abeb66da97ba5d',
                scope: {
                    userToken: '9ca0df5f86abeb66da97ba61',
                    boxToken: '9cb763b6e72611381ef043e5'
                },
                role: 'moderator'
            }

            const response: [FeedbackMessage, FeedbackMessage] = await aclService.onRoleChangeRequested(request)

            const feedbackForSource = response[0]
            const feedbackForTarget = response[1]

            expect(feedbackForSource.context).to.equal('success')
            expect(feedbackForSource.scope).to.equal(request.scope.boxToken)
            expect(feedbackForSource.contents).to.equal("Koga is now one of your Moderators on this box.")

            expect(feedbackForTarget.context).to.equal('success')
            expect(feedbackForTarget.scope).to.equal(request.scope.boxToken)
            expect(feedbackForTarget.contents).to.equal("Ash Ketchum promoted you to Moderator! Your new privileges will appear in a few moments.")

            const promotedMember = await Subscriber.findOne({ userToken: '9ca0df5f86abeb66da97ba61' }).lean()
            expect(promotedMember.role).to.equal('moderator')
        })

        it("Succeeds a demotion to Community Member of a VIP", async () => {
            const request: RoleChangeRequest = {
                source: '9ca0df5f86abeb66da97ba5e',
                scope: {
                    userToken: '9ca0df5f86abeb66da97ba63',
                    boxToken: '9cb763b6e72611381ef043e5'
                },
                role: 'vip'
            }

            const response: [FeedbackMessage, FeedbackMessage] = await aclService.onRoleChangeRequested(request)

            const feedbackForSource = response[0]
            const feedbackForTarget = response[1]

            expect(feedbackForSource.context).to.equal('success')
            expect(feedbackForSource.scope).to.equal(request.scope.boxToken)
            expect(feedbackForSource.contents).to.equal("Shirona is no longer one of your VIPs on this box.")

            expect(feedbackForTarget.context).to.equal('info')
            expect(feedbackForTarget.scope).to.equal(request.scope.boxToken)
            expect(feedbackForTarget.contents).to.equal("You are no longer a VIP of this room. Your display will refresh in a few moments.")

            const demotedMember = await Subscriber.findOne({ userToken: '9ca0df5f86abeb66da97ba63' }).lean()
            expect(demotedMember.role).to.equal('vip')
        })

        it("Succeeds a demotion to Community Member of a Moderator", async () => {
            const request: RoleChangeRequest = {
                source: '9ca0df5f86abeb66da97ba5d',
                scope: {
                    userToken: '9ca0df5f86abeb66da97ba5e',
                    boxToken: '9cb763b6e72611381ef043e5'
                },
                role: 'simple'
            }

            const response: [FeedbackMessage, FeedbackMessage] = await aclService.onRoleChangeRequested(request)

            const feedbackForSource = response[0]
            const feedbackForTarget = response[1]

            expect(feedbackForSource.context).to.equal('success')
            expect(feedbackForSource.scope).to.equal(request.scope.boxToken)
            expect(feedbackForSource.contents).to.equal("Brock is no longer one of your Moderators on this box.")

            expect(feedbackForTarget.context).to.equal('info')
            expect(feedbackForTarget.scope).to.equal(request.scope.boxToken)
            expect(feedbackForTarget.contents).to.equal("You are no longer a Moderator of this room. Your display will refresh in a few moments.")

            const demotedMember = await Subscriber.findOne({ userToken: '9ca0df5f86abeb66da97ba5e' }).lean()
            expect(demotedMember.role).to.equal('simple')
        })
    })
})
