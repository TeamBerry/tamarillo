export class Message {
    public author: string | { _id: string, name: string }
    public contents: string
    public source: string
    public scope: string
    public time: Date

    constructor(message?: Partial<Message>) {
        this.author = message && message.author || null
        this.contents = message && message.contents
        this.source = message && message.source || null
        this.scope = message && message.scope || null
        this.time = message && message.time || new Date()
    }
}
