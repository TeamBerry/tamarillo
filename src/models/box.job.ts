/**
 * The job to give to the box watcher process to build jobs
 * and notify subscribers that things are happening in the box
 *
 * @export
 * @class BoxJob
 */
export class BoxJob {
    /**
     * The box document Id
     *
     * @type {string}
     * @memberof BoxJob
     */
    public boxToken: string

    /**
     * The subject of the job
     *
     * @type {string}
     * @memberof BoxJob
     */
    public subject: string
}
