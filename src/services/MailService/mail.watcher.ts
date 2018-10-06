var redis = require('redis');
var client = redis.createClient();

/**
 * Watches the "mail" Redis queue and sends the
 * jobs to the Mail Service
 *
 * @export
 * @class MailWatcher
 */
export class MailWatcher {

    init() {
        client.on('connect', () => {
            console.log('Mail Watcher is now connected to Redis');
        });

        client.on('error', () => {
            console.log('Mail Watcher couldn\'t connect to Redis');
        })
    }

    listen(){
        // TODO: Connect to the queue and listen for specific jobs
        // When I detect a "mail" job, I send it to the service
    }
}

const mailWatcher = new MailWatcher();
mailWatcher.init();
export default mailWatcher;