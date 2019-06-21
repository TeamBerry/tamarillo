import * as express from "express";
import * as bodyParser from "body-parser";
import * as supertest from "supertest";
import * as chai from "chai";
const expect = chai.expect;

import UserApi from './../../../src/api/routes/user.api';
const User = require('./../../../src/models/user.model');

describe("User API", () => {
    const expressApp = express();

    before(async () => {
        expressApp.use(bodyParser.json({ limit: '15mb', type: 'application/json' }));
        expressApp.use('/', UserApi);

        await User.findByIdAndDelete('9ca0df5f86abeb66da97ba5d');

        await User.create({
            _id: '9ca0df5f86abeb66da97ba5d',
            name: 'Ash Ketchum',
            mail: 'ash@pokemon.com',
            password: 'Pikachu'
        })
    });

    after(async () => {
        await User.findByIdAndDelete('9ca0df5f86abeb66da97ba5d');
    });

    describe("Gets an user", () => {
        it("Sends a 404 back if no user matches the given id", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5e')
                .expect(404, 'USER_NOT_FOUND');
        });

        it("Sends a 200 with the user if the id matches", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5d')
                .expect(200);
        });
    });

    describe("Gets the boxes of an user", () => {
        it("Sends a 404 back if no user matches the given id", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5e/boxes')
                .expect(404, 'USER_NOT_FOUND');
        });

        it("Sends a 200 with the boxes if the id matches", () => {
            return supertest(expressApp)
                .get('/9ca0df5f86abeb66da97ba5d/boxes')
                .expect(200);
        })
    })
})