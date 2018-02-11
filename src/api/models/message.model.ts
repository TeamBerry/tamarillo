import * as moment from 'moment';

export class Message {
    type: string;
    contents: string;
    time: any;

    constructor(obj?: any) {
        this.type = obj && obj.type;
        this.contents = obj && obj.contents;
        this.time = obj && obj.time;
    }
}
