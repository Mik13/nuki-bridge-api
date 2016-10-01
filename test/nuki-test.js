var assert = require('assert');
var API = require('../index');
var Promise = require('bluebird');

describe('Nuki Bridge API', function () {
  var bridgeInstance;
  var nuki;

  it('should be able to get bridge instance', function () {
    bridgeInstance = new API.Bridge('127.0.0.1', 12345, 'token');

    assert.ok(bridgeInstance);
  });

  describe('Bridge Instance', function () {
    before(function () {
      bridgeInstance._request = function mockRequest () {
        return Promise.resolve([{"nukiId": 1, "name": "Home"}, {"nukiId": 2, "name": "Grandma"}]);
      };
    });

    it('should be able to get a list of connected nukis', function () {
      return bridgeInstance.list().then(function (nukis) {
        assert.ok(nukis);
        assert.equal(nukis.length, 2);
        assert.ok(nukis[0].nuki);

        nuki = nukis[0].nuki;
      });
    });

    describe('Nuki Instance', function () {
      var counter = 0;

      before(function () {
        nuki._request = function mockRequest (action) {
          return Promise.try(function () {
            if (counter === 0) {
              return {"state": 1, "stateName": "locked", "batteryCritical": true, success: "true"};
            }

            if (action === 'lockState') {
              return {"state": 1, "stateName": "locked", "batteryCritical": false, success: "true"};
            }

            if (action === 'lockAction') {
              return {"batteryCritical": false, success: "true"};
            }
          });
        };
      });

      it('should emit batteryCritical', function () {
        var batteryCriticalFired = false;

        nuki.on('batteryCritical', function () {
          batteryCriticalFired = true;
        });

        return nuki.lockState().then(function (result) {
          assert.equal(batteryCriticalFired, true);
          assert.equal(result, API.lockState.LOCKED);
        });
      });

      it('should get lock state', function () {
        return nuki.lockState().then(function (result) {
          assert.equal(result, API.lockState.LOCKED);
        });
      });

      it('should do lock action', function () {
        return nuki.lockAction(API.lockAction.UNLOCK);
      });
    });
  });
});