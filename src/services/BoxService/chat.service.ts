import { Message } from "@teamberry/muscadine"

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
    public async isMessageValid(message: Message): Promise<boolean> {
        return message.scope ? true : false
    }
}

const chatService = new ChatService()
export default chatService
