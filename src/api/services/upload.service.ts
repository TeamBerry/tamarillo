import * as AWS from 'aws-sdk'
import * as fs from 'fs'
AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: process.env.AWS_PROFILE })

const DEFAULT_BUCKET = 'berrybox-user-content'
const DEFAULT_FOLDER = 'profile-pictures'

export interface ExpressFile {
    fieldName: string
    originalFilename: string
    path: string
    headers: object
    size: number
    type: string
}

export class UploadService {
    private s3: AWS.S3

    constructor() {
        this.s3 = new AWS.S3()
    }

    public async storeProfilePicture(user: string, uploadedFile: ExpressFile) {
        if (!uploadedFile) {
            return null
        }

        const fileStream: fs.ReadStream = fs.createReadStream(uploadedFile.path)

        const extension = this.matchExtension(uploadedFile.type)

        if (!extension) {
            return null
        }

        const filePath = `${DEFAULT_FOLDER}/${user}-picture.${extension}`

        await this.s3.putObject({
            Bucket: DEFAULT_BUCKET,
            Key: filePath,
            Body: fileStream
        })

        return filePath
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
            { type: 'image/webp', extension: 'webp' },
        ]

        const matchingType = typeMap.find((type) => {
            return type.type === imageType
        })
        return matchingType ? matchingType.extension : null
    }
}

const uploadService = new UploadService()
export default uploadService
