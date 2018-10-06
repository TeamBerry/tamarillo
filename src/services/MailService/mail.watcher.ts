var Redis = require('ioredis');
var redis = new Redis();
var publisher = new Redis();

import mailService from './mail.service';

/**
 * Watches the "mail" Redis queue and sends the
 * jobs to the Mail Service
 *
 * @export
 * @class MailWatcher
 */
export class MailWatcher {

    init() {
        redis.subscribe('mail', (err, count) => {
            if (err) {
                console.error('Impossible to connect to Redis');
            } else {
                console.info('Connected to the Redis "mail" queue');
                this.listen();

                publisher.publish('mail', 'Hello world!');
            }
        });
    }

    listen() {
        // When I detect a "mail" job, I send it to the service
        redis.on('message', (channel, message) => {
            // Calls the service `sendMail` method
            mailService.sendMail(message);
        });
    }
}

const mailWatcher = new MailWatcher();
mailWatcher.init();
export default mailWatcher;