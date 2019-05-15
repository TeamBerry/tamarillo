import * as _ from 'lodash';

import { Message } from '../../models/message.model';

class ChatService {
    /**
     * Checks the message for validity
     *
     * TODO: Checks for spam.
     *
     * @param {Message} message
     * @returns {Promise<boolean>} Whether or not the message is valid
     * @memberof ChatService
     */
    async isMessageValid(message: Message): Promise<boolean> {
        return message.scope ? true : false;
    }
}

const chatService = new ChatService();
export default chatService;