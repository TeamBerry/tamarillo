import * as AWS from 'aws-sdk'
import * as fs from 'fs'
AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: process.env.AWS_PROFILE })

const DEFAULT_BUCKET = 'berrybox-user-pictures'
const DEFAULT_FOLDER = 'profile-pictures'

export interface MulterFile {
    fieldname: string
    originalname: string
    encoding: string
    mimetype: string
    size: number
    destination: string
    filename: string
    path: string
    buffer: Buffer
}

export class UploadService {
    private s3: AWS.S3

    constructor() {
        this.s3 = new AWS.S3()
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    public async storeProfilePicture(user: string, uploadedFile: MulterFile) {
        if (!uploadedFile) {
            return null
        }

        const fileStream: fs.ReadStream = fs.createReadStream(uploadedFile.path)

        const extension = this.matchExtension(uploadedFile.mimetype)

        if (!extension) {
            return null
        }

        const fileName = `${user}-picture`

        await this.s3.putObject({
            Bucket: DEFAULT_BUCKET,
            Key: `${DEFAULT_FOLDER}/${fileName}`,
            Body: fileStream
        }).promise()

        fs.unlinkSync(uploadedFile.path)

        return fileName
    }

    /**
     * Matches the extension to the type
     *
     * @param {string} imageType
     * @returns {string}
     * @memberof UploadService
     */
    public matchExtension(imageType: string): string {
        const typeMap = [
            { type: 'image/png', extension: 'png' },
            { type: 'image/gif', extension: 'gif' },
            { type: 'image/jpeg', extension: 'jpg' },
            { type: 'image/svg+xml', extension: 'svg' },
            { type: 'image/tiff', extension: 'tif' },
            { type: 'image/webp', extension: 'webp' }
        ]

        const matchingType = typeMap.find(type => type.type === imageType)
        return matchingType ? matchingType.extension : null
    }
}

const uploadService = new UploadService()
export default uploadService
