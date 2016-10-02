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
 * @param {String}    action                the name of the action
 * @returns {Promise<Object>}
 * @private
 */
Bridge.prototype._request = function _request (action) {
  var url = 'http://' + this.ip + ':' + this.port + '/' + action + '?token=' + this.token;

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

module.exports = Bridge;

/**
 * @typedef {Object}  NukiInformation
 * @property {Number}   nukiId      the id of the nuki
 * @property {String}   name        the name of the nuki
 * @property {Nuki}     nuki        nuki instance
 */