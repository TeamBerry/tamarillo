import { NextFunction, Request, Response, Router } from "express"
const multer = require('multer')
const upload = multer({ dest: 'upload/' })

const Box = require("./../../models/box.model")

import { UserPlaylist } from "../../models/user-playlist.model"
import uploadService, { MulterFile } from "../services/upload.service"
import { User, UserClass } from "../../models/user.model"
const auth = require("./../middlewares/auth.middleware")

const router = Router()

router.param("user", async (request: Request, response: Response, next: NextFunction): Promise<Response> => {
    const matchingUser = await User
        .findById(request.params.user)
        .select('-password')

    if (!matchingUser) {
        return response.status(404).send("USER_NOT_FOUND")
    }

    response.locals.user = matchingUser

    next()
})

router.get("/me", auth.isAuthorized, async (_: Request, response: Response) => {
    const user = await User.findById(response.locals.auth.user)
        .select('-password -resetToken')

    return response.status(200).send(user)
})

router.patch("/settings", auth.isAuthorized, async (request: Request, response: Response) => {
    try {
        const settings: Partial<UserClass['settings']> = request.body

        if (Object.keys(request.body).length === 0) {
            return response.status(412).send("MISSING_PARAMETERS")
        }

        const updateFields = {}
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.keys(settings).map((value, index) => {
            updateFields[`settings.${value}`] = settings[value]
        })

        await User.findByIdAndUpdate(
            response.locals.auth.user,
            {
                $set: updateFields
            }
        )

        return response.status(200).send()
    } catch (error) {
        return response.status(500).send()
    }
})

router.patch("/acl", auth.isAuthorized, async (request: Request, response: Response) => {
    try {
        const acl: UserClass['acl'] = request.body

        if (Object.keys(request.body).length === 0) {
            return response.status(412).send("MISSING_PARAMETERS")
        }

        const updatedUser = await User.findByIdAndUpdate(
            response.locals.auth.user,
            {
                $set: { acl }
            },
            {
                new: true
            }
        )

        return response.status(200).send(updatedUser.acl)
    } catch (error) {
        return response.status(500).send()
    }
})

router.get("/:user/boxes", auth.isAuthorized, async (request: Request, response: Response) => {
    const userId = request.params.user

    try {
        const boxes = await Box.find({ creator: userId })
            .populate("creator", "_id name settings.picture")

        return response.status(200).send(boxes)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.get("/:user/playlists", auth.isAuthorized, async (request: Request, response: Response) => {
    const filters = {
        user: request.params.user,
        isPrivate: false
    }

    const decodedToken = response.locals.auth

    try {
        // If the token is decoded correctly and the user inside matches the request parameters, the privacy filter
        // is removed so that the API serves private and public playlists.
        if (decodedToken && decodedToken.user === request.params.user) {
            delete filters.isPrivate
        }

        const userPlaylists = await UserPlaylist
            .find(filters)
            .populate("videos")
            .lean()

        return response.status(200).send(userPlaylists)
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.post("/picture", [auth.isAuthorized, upload.single('picture')], async (request: Request, response: Response) => {
    const userToken: string = response.locals.auth.user

    try {
        if (!request.file) {
            return response.status(404).send('FILE_NOT_FOUND')
        }

        const user = await User.findById(userToken)

        const fileToUpload: MulterFile = request.file as MulterFile

        // Uploads file
        const uploadedFile = await uploadService.storeProfilePicture(user._id, fileToUpload)

        if (!uploadedFile) {
            return response.status(400).send("CORRUPTED_FILE")
        }

        // Deletes previous picture if it's not the default one
        if (user.settings.picture !== 'default-picture') {
            await uploadService.deleteProfilePicture(user.settings.picture)
        }

        // Updates entity
        await User.findByIdAndUpdate(
            user._id,
            {
                $set: { 'settings.picture': uploadedFile }
            }
        )

        return response.status(200).send({ file: uploadedFile })
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.delete("/picture", auth.isAuthorized, async (request: Request, response: Response) => {
    const userToken: string = response.locals.auth.user

    try {
        const user = await User.findById(userToken)

        if (user.settings.picture === 'default-picture') {
            return response.status(412).send("CANNOT_DELETE_DEFAULT")
        }

        await uploadService.deleteProfilePicture(user.settings.picture)

        await User.findByIdAndUpdate(
            user._id,
            {
                $set: { 'settings.picture': 'default-picture' }
            }
        )

        return response.status(200).send({ file: 'default-picture' })
    } catch (error) {
        return response.status(500).send(error)
    }
})

export const UserApi = router
