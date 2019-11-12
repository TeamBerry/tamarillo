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
    public template: 'signup' | 'password-reset'

    /**
     * Array of mail addresses
     *
     * @type {string[]}
     * @memberof MailJob
     */
    public addresses: Array<string>

    /**
     * All variables to give to the builder
     *
     * @type {*}
     * @memberof MailJob
     */
    public variables: any
}
