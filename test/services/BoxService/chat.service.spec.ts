import * as chai from 'chai'
const expect = chai.expect

import { Message } from "@teamberry/muscadine"
import moment = require('moment')
import chatService from './../../../src/services/BoxService/chat.service'

describe("Chat Service", () => {
    describe("Spam control", () => {
        it("Refuses messages if they don't have a scope", async () => {
            const invalidMessage: Message = {
                author: '5cdelqmpekda',
                contents: 'This is an invalid test message',
                source: '54cxpsdjqhdjad',
                scope: null,
                time: new Date()
            }

            const response = await chatService.isMessageValid(invalidMessage)

            expect(response).to.be.false

        })

        it("Validates message if they have a scope", async () => {
            const invalidMessage: Message = {
                author: '5cdelqmpekda',
                contents: 'This is an invalid test message',
                source: '54cxpsdjqhdjad',
                scope: 'box',
                time: new Date()
            }

            const response = await chatService.isMessageValid(invalidMessage)

            expect(response).to.be.true
        })
    })
})
