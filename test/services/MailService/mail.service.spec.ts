const nodemailer = require('nodemailer')
const Email = require('email-templates')
const path = require('path')

import mailService from './../../../src/services/MailService/mail.service'

describe.only("MailService", () => {
    before(() => {

    })

    after(() => {

    })

    describe("Test mail send", () => {
        it("Sends a signup mail", async () => {
            await mailService.sendMail({
                addresses: ['angelzatch@gmail.com'],
                variables: {},
                template: 'signup'
            })
        })

        it("Sends a reset password mail", async () => {
            await mailService.sendMail({
                addresses: ['angelzatch@gmail.com'],
                variables: {
                    resetToken: '35d76s813ez1s3C7f3dsf1s'
                },
                template: 'password-reset'
            })
        })
    })
})
