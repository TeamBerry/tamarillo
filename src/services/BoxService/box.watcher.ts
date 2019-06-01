const Queue = require('bull');
const boxQueue = new Queue('box');

import boxService from './box.service';

export class BoxWatcher {
    listen() {
        boxQueue.process((job, done) => {
            const payload = job.data;

            // Do things depending on the subject
            switch (payload.subject) {
                case 'close':
                    // Alert subscribers
                    boxService.alertClosedBox(payload.boxToken);
                    break;

                default:
                    break;
            };

            done();
        });
    }
}
const boxWatcher = new BoxWatcher();
boxWatcher.listen();
export default boxWatcher;