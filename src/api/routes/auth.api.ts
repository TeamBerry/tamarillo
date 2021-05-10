import { Router } from "express"

const Queue = require("bull")
const mailQueue = new Queue("mail")
import * as bcrypt from 'bcrypt'
const cmp = require('semver-compare')

import { MailJob } from "../../models/mail.job"
import authService from "../services/auth.service"
import { UserPlaylist } from "../../models/user-playlist.model"
import { User } from '../../models/user.model'
import { Subscriber } from "../../models/subscriber.model"
import { nanoid } from "nanoid"
const Box = require("./../../models/box.model")

const auth = require("./../middlewares/auth.middleware")

const dotenv = require("dotenv")
dotenv.config()

const router = Router()
const SALT_ROUNDS = 10

router.post("/compat", [], async (request, response) => {
    const currentVersion: string = request.body.version

    if (!currentVersion) {
        return response.status(412).send('VERSION_NOT_SPECIFIED')
    }

    if (cmp(currentVersion, '1.0.0') === -1) {
        return response.status(403).send('UPGRADE_MANDATORY')
    }

    return response.status(200).send('OK')
})

router.post("/login", [], async (request, response) => {
    if (!request.body.mail || !request.body.password) {
        return response.status(412).send("MISSING_CREDENTIALS")
    }

    const mail = request.body.mail.toLowerCase()
    const password = request.body.password

    try {
        // Find user in database
        const user = await User.findOne({ mail }, 'name mail settings password')

        // If password is not correct, send back 401 HTTP error
        if (!user) {
            return response.status(401).send("INVALID_CREDENTIALS") // Unauthorized
        }

        if (!await bcrypt.compare(password, user.password)) {
            return response.status(401).send("INVALID_CREDENTIALS")
        }

        const authResult = authService.createSession(user)

        // Sending bearer token
        return response.status(200).json(authResult)
    } catch (error) {
        console.log(error)
        return response.status(500).send(error)
    }
})

router.post("/signup", [], async (request, response) => {
    const mail = request.body.mail.toLowerCase()
    const { password, name } = request.body

    try {
        if (await User.exists({ mail })) {
            return response.status(409).send('MAIL_ALREADY_EXISTS')
        }

        if (await User.exists({ name })) {
            return response.status(409).send('USERNAME_ALREADY_EXISTS')
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

        const createdUser = await User.create({
            mail,
            password: hashedPassword,
            name
        })

        // Create Favorites playlist
        await UserPlaylist.create({
            name: 'Favorites',
            isPrivate: false,
            user: {
                _id: createdUser._id,
                name: createdUser.name
            },
            isDeletable: false
        })

        const mailJob: MailJob = {
            addresses: [mail],
            variables: { name },
            template: "signup"
        }
        mailQueue.add(mailJob)

        const authResult = authService.createSession(createdUser)

        return response.status(200).send(authResult)
    } catch (error) {
        response.status(500).send(error)
    }
})

router.post("/reset", [], async (request, response) => {
    const mail = request.body.mail

    try {
        const resetToken = nanoid(20)

        await User.findOneAndUpdate(
            { mail },
            {
                $set: { password: null, resetToken }
            }
        )

        const mailJob: MailJob = {
            addresses: [mail],
            variables: {
                resetToken
            },
            template: 'password-reset'
        }

        mailQueue.add(mailJob)

        // Always OK to avoid hackers
        return response.status(200).send()
    } catch (error) {
        return response.status(500).send(error)
    }
})

router.put("/", auth.isAuthorized, async (request, response) => {
    try {
        const password = await bcrypt.hash(request.body.password, SALT_ROUNDS)

        await User.findByIdAndUpdate(
            response.locals.auth.user,
            {
                $set: { password, resetToken: null }
            }
        )

        return response.status(200).send()
    } catch (error) {
        return response.status(500).send()
    }
})

router.get("/reset/:token", [], async (request, response) => {
    try {
        const user = await User.exists({ resetToken: request.params.token })

        if (!user) {
            return response.status(404).send('TOKEN_NOT_FOUND')
        }

        return response.status(200).send()
    } catch (error) {
        console.log(error)
        return response.status(500).send(error)
    }
})

router.post("/reset/:token", [], async (request, response) => {
    const matchingUser = await User.findOne({ resetToken: request.params.token })

    if (!matchingUser) {
        return response.status(404).send('TOKEN_NOT_FOUND')
    }

    try {
        const password = await bcrypt.hash(request.body.password, SALT_ROUNDS)

        await User.findByIdAndUpdate(
            matchingUser._id,
            {
                $set: { password, resetToken: null }
            }
        )

        return response.status(200).send()
    } catch (error) {
        console.log(error)
        return response.status(500).send()
    }
})

router.post("/deactivate", auth.isAuthorized, async (request, response) => {
    if (await Box.count({ creator: response.locals.auth.user }) > 0) {
        return response.status(412).send('USER_STILL_HAS_BOXES')
    }

    try {
        await UserPlaylist.deleteMany({ user: response.locals.auth.user })
        await Subscriber.deleteMany({ userToken: response.locals.auth.user })
        await User.deleteOne({ _id: response.locals.auth.user })

        return response.status(200).send()
    } catch (error) {
        return response.status(500).send()
    }
})

export const AuthApi = router
