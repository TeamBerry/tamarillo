var Queue = require('bull');
var mailQueue = new Queue('mail');

import mailService from './mail.service';

/**
 * Watches the "mail" Redis queue and sends the
 * jobs to the Mail Service
 *
 * @export
 * @class MailWatcher
 */
export class MailWatcher {
    listen() {
        // When I detect a "mail" job, I send it to the service
        mailQueue.process(async (job, done) => {
            await mailService
                .sendMail(job.data)
                .then((response) => {
                    console.log('mail has been sent.');
                    done(response);
                })
                .catch((error) => {
                    console.error('An error has occured.');
                    done(error);
                });
        })
    }
}

const mailWatcher = new MailWatcher();
mailWatcher.listen();
export default mailWatcher;