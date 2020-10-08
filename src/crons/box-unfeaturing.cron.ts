require("./../config/connection")
const BoxSchema = require("./../models/box.model")

export class BoxUnfeaturingCron {
    public async process(): Promise<void> {
        await this.run()
    }

    public async run(): Promise<void> {
        console.log('Hey! Starting scan of boxes to unfeature...')

        const boxesToUnfeature = await BoxSchema.find({ featured: { $lte: new Date() } })

        console.log(`${boxesToUnfeature.length} boxes to unfeature`)

        for (const box of boxesToUnfeature) {
            await BoxSchema.findByIdAndUpdate(
                box._id,
                {
                    $set: { featured: null }
                }
            )
        }

        console.log(`${boxesToUnfeature.length} boxes have been unfeatured. Operation complete.`)

        process.exit(0)
    }
}

const boxUnfeaturingCron = new BoxUnfeaturingCron()
void boxUnfeaturingCron.process()
export default boxUnfeaturingCron
