const nodemailer = require('nodemailer');
const Email = require('email-templates');
const path = require('path');

import mailService from './../../../src/services/MailService/mail.service';

describe.skip("MailService", () => {
    before(() => {

    });

    after(() => {

    });

    describe("Test mail send", () => {
        it("Sends a signup mail", async () => {
            await mailService.sendMail('signup', ['pinbouen.andreas@gmail.com']);
        });
    });
});