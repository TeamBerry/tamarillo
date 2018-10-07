import * as _ from 'lodash';

const nodemailer = require('nodemailer');

/**
 * Service that handles mailing requests.
 *
 * @class MailService
 */
class MailService {

    /**
     * Sends mails
     *
     * @memberof MailService
     */
    async sendMail(mailDetails): Promise<any>{
        console.log('Received mail to send: ', mailDetails);

        const transporter = nodemailer.createTransport({
            ignoreTLS: true,
            host: 'localhost',
            port: 1025
        });

        const mailOptions = {
            from: 'system@berrybox.com',
            to: mailDetails.mail,
            subject: 'Test mail',
            text: 'Hey!',
            html: 'HELLO WORLD' // TODO: Template the mail
        };

        return transporter.sendMail(mailOptions);
    }

}

const mailService = new MailService();
export default mailService;