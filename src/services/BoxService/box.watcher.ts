const Queue = require("bull")
const boxQueue = new Queue("box")
const syncQueue = new Queue("sync")

import { Message } from "@teamberry/muscadine"
import { BoxJob } from "../../models/box.job"
import boxService from "./box.service"

export class BoxWatcher {
    public listen() {
        boxQueue.process((job, done) => {
            const { boxToken, subject }: BoxJob = job.data

            // Do things depending on the subject
            let message: Message
            switch (subject) {
                case "close":
                    // Build message
                    message = new Message({
                        author: "system",
                        contents: `This box has just been closed. Video play and submission have been disabled.
                        Please exit this box.`,
                        source: "bot",
                        scope: boxToken,
                    })

                    // Alert subscribers
                    boxService.alertSubscribers(boxToken, message)
                    break

                case "open":
                    // Build message
                    message = new Message({
                        author: "system",
                        contents: "This box has been reopened. Video play and submissions have been reenabled.",
                        source: "bot",
                        scope: boxToken,
                    })

                    // Alert subscribers
                    boxService.alertSubscribers(boxToken, message)
                    break

                case "destroy":
                    // Build message
                    message = new Message({
                        author: "system",
                        contents: `This box is being destroyed following an extended period of inactivity or a decision
                        of its creator. All systems have been deactivated and cannot be restored. Please exit this box.`,
                        source: "bot",
                        scope: boxToken,
                    })

                    // Alert subscribers
                    boxService.alertSubscribers(boxToken, message)

                    // Remove subscribers
                    boxService.removeSubscribers(boxToken)
                    break

                case "update":
                    message = new Message({
                        author: "system",
                        contents: `This box has just been updated.`,
                        source: "bot",
                        scope: boxToken
                    })

                    boxService.alertSubscribers(boxToken, message)

                    boxService.sendBoxToSubscribers(boxToken)
                    break

                default:
                    break
            }

            done()
        })

        // Listen to the sync queue for autoplay
        syncQueue.process((job, done) => {
            const { boxToken, order } = job.data

            if (order === 'next') {
                boxService.transitionToNextVideo(boxToken)
            }

            done()
        })
    }
}
const boxWatcher = new BoxWatcher()
boxWatcher.listen()
export default boxWatcher
