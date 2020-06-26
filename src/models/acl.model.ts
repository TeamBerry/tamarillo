export type Permission = 'addVideo' | 'removeVideo' | 'forceNext' | 'forcePlay' | 'skipVideo' | 'editBox' | 'promoteVIP' | 'demoteVIP'

export type Role = 'moderator' | 'vip' | 'simple'

export interface ACLConfig {
    moderator: Array<Permission>
    vip: Array<Permission>
    simple: Array<Permission>
}
