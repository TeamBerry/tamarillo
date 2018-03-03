import * as _ from 'lodash';
import * as moment from 'moment';

import { Message } from './../models/message.model';

class ChatService {
    /**
     * When recieving a message by users to be dispatched.
     *
     * TODO: Checks for spam.
     *
     * @param {any} message
     * @returns
     * @memberof ChatService
     */
    async onChat(message) {
        console.log("Recieved a message.");
        if (message.scope) {
            console.log("Dispatching to all subscribers...");
            return true;
        } else {
            console.log("message doesn't have a token. Message ignored.");
            return false;
        }
    }
}

const chatService = new ChatService();
export default chatService;