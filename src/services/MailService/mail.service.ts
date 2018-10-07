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
     * @param {*} mailDetails The details given by whoever created the job
     * Can contain these options:
     * - mail: The address to send the mail to
     * - name: The name of the user linked to the mail
     * - type: The type of mail to send (signup, reset...)
     * @returns {Promise<any>}
     * @memberof MailService
     */
    sendMail(mailDetails): Promise<any> {
        console.log('Received mail to send: ', mailDetails);

        const transporter = nodemailer.createTransport({
            ignoreTLS: true,
            host: 'localhost',
            port: 1025
        });

        let dynamicOptions = this.buildOptions(mailDetails.type);

        const mailOptions = {
            from: 'system@berrybox.com',
            to: mailDetails.mail,
            subject: dynamicOptions.subject,
            text: 'Hey!',
            html: 'HELLO WORLD' // TODO: Template the mail
        };

        return transporter.sendMail(mailOptions);
    }

    /**
     * Gets the dynamic options for the type of mail
     *
     * @private
     * @param {string} type The type of mail obtained from the job details
     * @returns {{subject: string, html: string}} A list of options based on said type:
     * - subject: The subject of the mail
     * - html: The template of the mail
     * @memberof MailService
     */
    private buildOptions(type: string): {subject: string, html: string} {
        let options = {
            subject: '',
            html: ''
        };

        switch (type) {
            case 'signup':
                options.subject = 'Welcome to Berrybox!';
                break;

            default:
                options.subject = 'Welcome to Berrybox!';
                break;
        }

        return options;
    }

}

const mailService = new MailService();
export default mailService;