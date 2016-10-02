var request = require('request-promise');

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
 * @param {String}    nukiId          the id of the nuki
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
 * @param {String}    action                the name of the action
 * @param {String}    [parameterAction]     the get parameter action
 * @returns {Promise<Object>}
 * @private
 */
Nuki.prototype._request = function _request (action, parameterAction) {
  var ip = this.connection.ip;
  var port = this.connection.port;
  var token = this.connection.token;

  var url = 'http://' + ip + ':' + port + '/' + action + '?token=' + token + '&nukiId=' + this.nukiId;

  if (parameterAction) {
    url += '&action=' + parameterAction;
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
  if (response.batteryCritical) {
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

      if (response.success === true) {
        return response.state;
      }

      throw response;
    });
};

/**
 * This function requests a lock-action.
 *
 * @param {LockAction}    action      the action to request
 * @returns {Promise<Boolean>}
 */
Nuki.prototype.lockAction = function lockAction (action) {
  var self = this;

  return this
    ._request('lockAction', action)
    .then(function processLockState (response) {
      self._checkBatteryCritical(response);

      return response.success;
    });
};

module.exports = Nuki;