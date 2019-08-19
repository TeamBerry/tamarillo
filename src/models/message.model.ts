import * as moment from "moment"
export class Message {
    public author: string | { _id: string, name: string }
    public contents: string
    public source: string
    public scope: string
    public time: any

    constructor(obj?: any) {
        this.author = obj && obj.author || null
        this.contents = obj && obj.contents
        this.source = obj && obj.source || null
        this.scope = obj && obj.scope || null
        this.time = obj && obj.time || moment()
    }
}
