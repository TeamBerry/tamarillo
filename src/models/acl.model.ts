import { Permission } from "@teamberry/muscadine"

export interface ACLConfig {
    moderator: Array<Permission>
    vip: Array<Permission>
    simple: Array<Permission>
}
