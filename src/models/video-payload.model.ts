export interface SubmissionPayload {
    /**
     * The YouTube uID of the video to add
     *
     * @type {string}
     * @memberof VideoPayload
     */
    link: string

    /**
     * The document ID of the user who submitted the video
     *
     * @type {string}
     * @memberof VideoPayload
     */
    userToken: string

    /**
     * The document ID of the box to which the video is added
     *
     * @type {string}
     * @memberof VideoPayload
     */
    boxToken: string
}

export interface CancelPayload {
    /**
     * Identifier of the playlist item
     *
     * @type {string}
     * @memberof CancelPayload
     */
    item: string

    /**
     * Identifier of the user who requested the cancel
     *
     * @type {string}
     * @memberof CancelPayload
     */
    userToken: string

    /**
     * Identifier of the box of the playlist
     *
     * @type {string}
     * @memberof CancelPayload
     */
    boxToken: string
}