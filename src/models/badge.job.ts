export interface BadgeEvent {
    /**
     * The target user that gains the badge
     *
     * @type {string}
     * @memberof BadgeJob
     */
    userToken: string

    /**
     * The event subject. Each subject key maps to an event in the app, that will
     * be potentially translated by the badge microservice as worthy
     * of an award, depending on the subject value
     *
     * Examples of keys:
     * box.access, box.life, queue.add, queue.skip, queue.now, subscription.berries
     *
     * Values can be Youtube URL, dates, berry counts... Each badge has its own subject
     * and gives the type of the value to compare.
     *
     *
     * @type {StringType | NumberType}
     * @memberof BadgeJob
     */
    subject: BadgeEventSubject
}

export type BadgeEventSubject = StringType | NumberType

interface StringType {
    key: 'box.join' | 'queue.now'
    value: string
    valueType?: 'string'
}
interface NumberType {
    key: 'box.life' | 'queue.add' | 'subscription.berries'
    value: number
    valueType?: 'number'
}

