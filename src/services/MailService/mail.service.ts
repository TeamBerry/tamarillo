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
    sendMail(mail){
        console.log('Received mail to send: ', mail);

        const transporter = nodemailer.createTransport({
            ignoreTLS: true,
            host: 'localhost',
            port: 1025
        });

        const mailOptions = {
            from: 'system@berrybox.com',
            to: 'angelzatch@gmail.com',
            subject: 'Test mail',
            text: 'Hey!',
            html: 'HELLO WORLD'
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if(err){
                console.error(err);
            }

            console.log('Mail sent: ', info.messageId);
        })


    }

}

const mailService = new MailService();
export default mailService;