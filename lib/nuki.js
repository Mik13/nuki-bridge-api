var request = require('request-promise');
var Callback = require('./callback');

var EventEmitter = require('events').EventEmitter;
var util = require('util');

/**
 * The event `batteryCritical` will be emitted, if it is represent in any response.
 *
 * @event Nuki#batteryCritical
 */

/**
 * The constructor for nuki commands.
 *
 * @class Nuki
 * @param {Bridge}    connection      the bridge connection
 * @param {Number}    nukiId          the id of the nuki
 * @constructor
 */
var Nuki = function Nuki (connection, nukiId) {
  EventEmitter.call(this);

  this.connection = connection;
  this.nukiId = nukiId;
};

util.inherits(Nuki, EventEmitter);

/**
 * This function requests an action.
 *
 * @param {String}    action                    the name of the action
 * @param {String}    [parameterAction]         the get parameter action
 * @param {String}    [additionalParameter]     additional get parameters
 * @returns {Promise<Object>}
 * @private
 */
Nuki.prototype._request = function _request (action, parameterAction, additionalParameter) {
  var ip = this.connection.ip;
  var port = this.connection.port;
  var token = this.connection.token;

  var url = 'http://' + ip + ':' + port + '/' + action + '?token=' + token + '&nukiId=' + this.nukiId;

  if (parameterAction) {
    url += '&action=' + parameterAction;
  }

  if (additionalParameter) {
    url += additionalParameter;
  }

  return request({
    uri: url,
    json: true
  });
};

/**
 * This function checks if the `batteryCritical` flag is present and emits.
 *
 * @emits Nuki#batteryCritical
 * @param {Object}    response      the response to check
 * @private
 */
Nuki.prototype._checkBatteryCritical = function _checkBatteryCritical (response) {
  if (response.batteryCritical || (response.lastKnownState && response.lastKnownState.batteryCritical)) {
    this.emit('batteryCritical');
  }
};

/**
 * This function returns the lock-state of the Nuki.
 *
 * @returns {Promise<LockState>}
 */
Nuki.prototype.lockState = function lockState () {
  var self = this;

  return this
    ._request('lockState')
    .then(function processLockState (response) {
      self._checkBatteryCritical(response);

      if (response.success === true || response.success === "true") {
        return response.state;
      }

      throw response;
    });
};

/**
 * This function requests a lock-action.
 *
 * @param {LockAction}    action            the action to request
 * @param {Boolean}       [noWait=false]    if true, this function does not wait for the lock action to complete
 * @returns {Promise<Boolean>}
 */
Nuki.prototype.lockAction = function lockAction (action, noWait) {
  var self = this;

  return this
    ._request('lockAction', action, '&noWait=' + (noWait ? 1 : 0))
    .then(function processLockState (response) {
      self._checkBatteryCritical(response);

      return response.success;
    });
};

/**
 * This function returns all callbacks.
 *
 * @returns {Promise<Callback[]>}
 */
Nuki.prototype.getCallbacks = function getCallbacks () {
  var self = this;

  return this
    ._request('callback/list')
    .then(function processCallbacks (response) {
      if (Array.isArray(response.callbacks)) {
        return response.callbacks.map(function processCallback (callback) {
          return new Callback(self, callback.id, callback.url);
        });
      }

      throw response;
    });
};

/**
 * This function adds an callback.
 *
 * @param {String}      hostname        the hostname of the current connection
 * @param {Number}      port            the port we want to send
 * @param {Boolean}     [listen=false]  if true, we open a web server to listen for the callbacks
 * @param {String}      [path]          if given, this path is used for the callback
 * @returns {Promise}
 */
Nuki.prototype.addCallback = function addCallback (hostname, port, listen, path) {
  var self = this;
  var url = 'http://' + hostname + ':' + port + '/' + (path || 'nuki-api-bridge');

  return this
    ._request('callback/add', null, '&url=' + url)
    .then(function checkResponse (response) {
      if (response.success) {
        return self
          .getCallbacks()
          .then(function findCallback (callbacks) {
            for (var i = 0; i < callbacks.length; i++) {
              if (callbacks[i].url === url) {
                return new Callback(self, callbacks[i].id, url);
              }
            }

            throw new Error(response);
          }).tap(function checkIfWeShouldListen (callback) {
            if (listen) {
              return callback.startListen();
            }
          });
      }
    });
};

module.exports = Nuki;
