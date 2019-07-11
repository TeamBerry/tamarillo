var Queue = require('bull');
var mailQueue = new Queue('mail');

import mailService from './mail.service';
import { MailJob } from '../../models/mail.job';

/**
 * Watches the "mail" Redis queue and sends the
 * jobs to the Mail Service
 *
 * @export
 * @class MailWatcher
 */
export class MailWatcher {
    /**
     * Listens to the mail queue and processes any job it finds.
     *
     * The whole process goes as follows: When the mail watcher sees a
     * job in the mail queue, it contacts the method `sendMail` of the
     * Mail Service so that a mail is sent accordingly.
     *
     * Depending on the status of the sending of the mail, the watcher will
     * set the job as done or failed. A failed job will be retried.
     *
     * @memberof MailWatcher
     */
    listen() {
        // When I detect a "mail" job, I send it to the service
        mailQueue.process((job, done) => {
            const { type, addresses }: MailJob = job.data;

            mailService
                .sendMail(type, addresses)
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