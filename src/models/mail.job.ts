/**
 * The job to give to the mail watcher process to send mails
 *
 * @export
 * @class MailJob
 */
export class MailJob {
    /**
     * Type of the mail
     *
     * @type {string}
     * @memberof MailJob
     */
    type: string;

    /**
     * Array of mail addresses
     *
     * @type {string[]}
     * @memberof MailJob
     */
    addresses: string[];
}