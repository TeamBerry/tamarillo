import * as _ from 'lodash';

const nodemailer = require('nodemailer');
const Email = require('email-templates');

const dotenv = require('dotenv');
dotenv.config();

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
    sendMail(type: string, addresses: Array<string>): Promise<any> {
        let transport = nodemailer.createTransport({
            ignoreTLS: true,
            host: 'localhost',
            port: process.env.MAILDEV_PORT
        });

        if (process.env.NODE_ENV === 'production') {
            // TODO: Use real transport
        }

        const email = new Email({
            message: {
                from: 'system@berrybox.com'
            },
            send: true,
            transport: transport
        });

        return email
            .send({
                template: type,
                message: {
                    to: addresses
                }
            });
    }
}

const mailService = new MailService();
export default mailService;