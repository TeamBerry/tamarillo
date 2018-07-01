import * as chai from 'chai';
import * as sinon from 'sinon';
const expect = chai.epxect;

import SyncService from './../../src/services/sync.service';

describe("SyncService", () => {

    let spy = sinon.spy();
    beforeEach(() => {

    })

    it('creates the correct object to post to the box', () => {

        const video = {

        };

        SyncService.postToBox(video, '');
    })
});