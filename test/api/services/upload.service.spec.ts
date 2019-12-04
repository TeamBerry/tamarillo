import '../../test-helper'

import * as chai from 'chai'
const expect = chai.expect
import * as _ from 'lodash'

import uploadService from "./../../../src/api/services/upload.service"

describe("Upload Service", () => {
    describe("Gets extension from picture", () => {
        it("Returns null if the extension couldn't be found", () => {
            const matchedExtension = uploadService.matchExtension("unknown/extension")

            expect(matchedExtension).to.equal(null)
        })

        it("Gets correct extension if it exists", () => {
            const matchedExtension = uploadService.matchExtension("image/png")

            expect(matchedExtension).to.equal("png")
        })
    })
})
