import * as _ from 'lodash';

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
        console.log(mail);
    }

}

const mailService = new MailService();
export default mailService;