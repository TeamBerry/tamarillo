import * as express from "express";
import * as bodyParser from 'body-parser';
import * as supertest from "supertest";

import AuthApi from './../../../src/api/routes/auth.api';
const User = require('./../../../src/models/user.model');

describe.only("Auth API", () => {

    const expressApp = express();

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }));
        expressApp.use('/', AuthApi);
    })

    describe("Login", () => {
        before(async () => {
            await User.findByIdAndDelete('9ca0df5f86abeb66da97ba5d');

            await User.create({
                _id: '9ca0df5f86abeb66da97ba5d',
                name: 'Ash Ketchum',
                mail: 'ash@pokemon.com',
                password: 'Pikachu'
            });
        });

        after(async () => {
            await User.findByIdAndDelete('9ca0df5f86abeb66da97ba5d');
        })

        it("Rejects the login if no credentials are given", () => {
            return supertest(expressApp)
                .post("/login")
                .expect(412, 'MISSING_CREDENTIALS');
        });

        it("Rejects the login if part of the credentials are missing", () => {
            const credentials = {
                mail: 'test-mail@gmail.com'
            };

            return supertest(expressApp)
                .post("/login")
                .send(credentials)
                .expect(412, 'MISSING_CREDENTIALS');
        });

        it("Rejects the login if the credentials don't belong to any user", () => {
            const credentials = {
                mail: 'test-mail@gmail.com',
                password: 'TestPassword'
            };

            return supertest(expressApp)
                .post("/login")
                .send(credentials)
                .expect(401, 'INVALID_CREDENTIALS');
        });

        it("Accepts the login if credentials are valid and match an user", () => {
            const credentials = {
                mail: 'ash@pokemon.com',
                password: 'Pikachu'
            };

            return supertest(expressApp)
                .post("/login")
                .send(credentials)
                .expect(200);
        });
    });

    describe("Signup", () => {

    });
});