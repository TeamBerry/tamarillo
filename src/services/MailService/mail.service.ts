import * as _ from "lodash"

const nodemailer = require("nodemailer")
const Email = require("email-templates")
const path = require("path")

const dotenv = require("dotenv")
dotenv.config()

/**
 * Service that handles mailing requests.
 *
 * @class MailService
 */
class MailService {
    /**
     * Sends mails
     *
     * @param {string} type The type of mail
     * @param {Array<string>} addresses The list of all recipients
     * @returns {Promise<any>}
     * @memberof MailService
     */
    public sendMail(type: string, addresses: string[]): Promise<any> {
        let transport = nodemailer.createTransport({
            ignoreTLS: true,
            host: "localhost",
            port: process.env.MAILDEV_PORT || 1025,
        })

        if (process.env.NODE_ENV === "production") {
            transport = nodemailer.createTransport({
                service: "Gmail",
                port: 587,
                secure: true,
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_PASS,
                },
            })
        }

        return new Email({
            message: {
                from: "system@berrybox.tv",
            },
            send: true,
            transport,
        }).send({
            template: path.resolve(`dist/services/MailService/emails/${type}`),
            message: {
                to: addresses,
            },
        })
    }
}

const mailService = new MailService()
export default mailService
