var request = require('request-promise');
var Nuki = require('./nuki');

/**
 * The constructor for a connection to a bridge.
 *
 * @class Bridge
 * @param {String}    ip        the ip of the bridge
 * @param {String}    port      the port of the bridge
 * @param {String}    token     the token of the bridge
 * @returns {Bridge}
 * @constructor
 */
var Bridge = function Bridge (ip, port, token) {
  if (!(this instanceof Bridge)) {
    return new Bridge(ip, port, token);
  }

  this.ip = ip;
  this.port = parseInt(port, 10);
  this.token = token;

  if (!this.ip || !this.port || !this.token || this.port < 1 || this.port > 65536) {
    throw new Error('Please check the arguments!');
  }
};

/**
 * This function requests an action.
 *
 * @param {String}    action                    the name of the action
 * @param {String}    [additionalParameter]     additional get parameters
 * @returns {Promise<Object>}
 * @private
 */
Bridge.prototype._request = function _request (action, additionalParameter) {
  var url = 'http://' + this.ip + ':' + this.port + '/' + action + '?token=' + this.token;

  if (additionalParameter) {
    url += additionalParameter;
  }

  return request({
    uri: url,
    json: true
  });
};

/**
 * This function returnes a list of Nukis.
 *
 * @memberOf Bridge#
 * @returns {Promise<NukiInformation[]>}
 */
Bridge.prototype.list = function list () {
  var self = this;

  return this
    ._request('list')
    .then(function (nukis) {
      if (!Array.isArray(nukis)) {
        throw new Error('did not receive a list of nukis');
      }

      return nukis;
    })
    .map(function processEachNuki (nuki) {
      nuki.nuki = new Nuki(self, nuki.nukiId);

      return nuki;
    });
};

/**
 * This function returnes one Nuki.
 *
 * @memberOf Bridge#
 * @param {Number}    nukiId              the id of the nuki
 * @param {Boolean}   [doNotValidate]     if true, will not validate existance (by calling the list endpoint of the bridge)
 * @returns {Promise<Nuki>}
 */
Bridge.prototype.get = function get (nukiId, doNotValidate) {
  var self = this;

  if (doNotValidate) {
    return new Nuki(self, nukiId);
  }

  return this
    ._request('list')
    .then(function validateNuki (nukis) {
      if (!Array.isArray(nukis)) {
        throw new Error('did not receive a list of nukis');
      }

      const found = nukis.some(function findNuki (nuki) {
        return nuki.nukiId === nukiId;
      });

      if (!found) {
        throw new Error('did not find nuki!');
      }

      return new Nuki(self, nukiId);
    });
};

/**
 * Returns all Smart Locks in range and some device information of the bridge itself.
 *
 * @memberof Bridge#
 * @returns {Promise.<Object>}
 */
Bridge.prototype.info = function info () {
  return this
    ._request('info');
};

/**
 * Clears the log of the Bridge.
 *
 * @memberof Bridge#
 * @param {Number}    [offset=0]    Offset position where to start retrieving log entries
 * @param {Number}    [count=100]   How many log entries to retrieve
 * @returns {Promise.<Object[]>}
 */
Bridge.prototype.log = function log (offset, count) {
  if (!offset) {
    offset = 0;
  }

  if (!count) {
    count = 100;
  }

  return this
    ._request('log', '&offset=' + offset + '&count=' + count);
};

/**
 * Clears the log of the Bridge.
 *
 * @memberof Bridge#
 * @returns {Promise}
 */
Bridge.prototype.clearlog = function clearlog () {
  return this
    ._request('clearlog');
};

/**
 * Immediately checks for a new firmware update and installs it.
 *
 * @memberof Bridge#
 * @returns {Promise}
 */
Bridge.prototype.fwupdate = function fwupdate () {
  return this
    ._request('fwupdate');
};

/**
 * Reboots the bridge.
 *
 * @memberof Bridge#
 * @returns {Promise}
 */
Bridge.prototype.reboot = function reboot () {
  return this
    ._request('reboot');
};

module.exports = Bridge;

/**
 * @typedef {Object}  NukiInformation
 * @property {Number}   nukiId      the id of the nuki
 * @property {String}   name        the name of the nuki
 * @property {Nuki}     nuki        nuki instance
 */
