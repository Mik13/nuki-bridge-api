var request = require('request-promise');
var Promise = require('bluebird');
var Nuki = require('./nuki');
var Callback = require('./callback');
var shajs = require('sha.js');

/**
 * The constructor for a connection to a bridge.
 *
 * @class Bridge
 * @param {String}    ip                                the ip of the bridge
 * @param {String}    port                              the port of the bridge
 * @param {String}    token                             the token of the bridge
 * @param {Object}    [options]                         additional options
 * @param {Number}    [options.delayBetweenRequests]    delay in ms between requests made to the bridge (default=250)
 * @returns {Bridge}
 * @constructor
 */
var Bridge = function Bridge (ip, port, token, options) {
  if (!(this instanceof Bridge)) {
    return new Bridge(ip, port, token);
  }

  this.ip = ip;
  this.port = parseInt(port, 10);
  this.token = token;
  this.type = null;
  this.delayBetweenRequests = options && options.delayBetweenRequests || 250;
  this.delayer = Promise.resolve();

  if (!this.ip || !this.port || !this.token || this.port < 1 || this.port > 65536) {
    throw new Error('Please check the arguments!');
  }
  
  // get bridge type
  this._getBridgeType(); // 1 = hardware, 2 = software
};

/**
 * This function retrieves the type of bridge (1 = hardware, 2 = software).
 *
 * @param void
 * @returns void
 * @private
 */
Bridge.prototype._getBridgeType = async function _getBridgeType () {

	var self = this;
	await this._request('info', '', true).then(function _setBridgeType(bridge)
	{
		self.type = bridge.bridgeType;
	});
};

/**
 * This function gets the required parameters for the token.
 *
 * @param {Boolean}		[forcePlainToken=false]		force to use plain instead of encrypted token
 * @returns {Object}
 * @private
 */
Bridge.prototype._getTokenParams = function _getTokenParams (forcePlainToken) {

  if (forcePlainToken || this.type != 1)
    return { token: this.token };

  else
  {
    var ts = new Date().toISOString().substr(0, 19)+'Z'; // YYY-MM-DDTHH:MM:SSZ
	var rnr = Math.floor(Math.random() * 900000 + 100000); // 6 random digits
	var hash = shajs('sha256').update(ts + ',' + rnr + ',' + this.token).digest('hex');
	
	return {
		ts: ts,
		rnr: rnr,
		hash: hash
	};
  }
};

/**
 * This function requests an action.
 *
 * @param {String}    	action                    	the name of the action
 * @param {String}    	[additionalParameter]     	additional get parameters
 * @param {Boolean}	[forcePlainToken=false]		force to use plain instead of encrypted token
 * @returns {Promise<Object>}
 * @private
 */
Bridge.prototype._request = function _request (action, additionalParameter, forcePlainToken) {
  var url = 'http://' + this.ip + ':' + this.port + '/' + action + '?1';
  
  var tokenParams = this._getTokenParams(forcePlainToken || false);
  Object.keys(tokenParams).forEach(function(key, i) {url += '&' + key + '=' + tokenParams[key]});

  if (additionalParameter) {
    url += additionalParameter;
  }

  var self = this;
  return new Promise(function requestWithoutDelay (resolve) {
    self.delayer = self.delayer
        .then(function doRequest () {
          var req = request({
            uri: url,
            json: true,
          });

          resolve(req); // Resolve returned promise without delay

          return req;
        })
        .catch(function ignoreErrorsForNextRequest () {})
        .delay(self.delayBetweenRequests);
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
      nuki.nuki = new Nuki(self, nuki.nukiId, {delayBetweenRequests: self.delayBetweenRequests});

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
    return Promise.resolve(new Nuki(self, nukiId, {delayBetweenRequests: self.delayBetweenRequests}));
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

      return new Nuki(self, nukiId, {delayBetweenRequests: self.delayBetweenRequests});
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

/**
 * Enables or disabled the auth-endpoint and publication to the discovery url.
 *
 * @memberof Bridge#
 * @param {Boolean}   enable
 * @returns {Promise}
 */
Bridge.prototype.configAuth = function configAuth (enable) {
  return this
      ._request('configAuth', '&enable=' + (enable ? 1 : 0));
};

/**
 * This function returns all callbacks.
 *
 * @returns {Promise<Callback[]>}
 */
Bridge.prototype.getCallbacks = function getCallbacks () {
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
 * This function adds a callback.
 *
 * @param {String}      hostname        the hostname of the current connection
 * @param {Number}      port            the port we want to send
 * @param {Boolean}     [listen=false]  if true, we open a web server to listen for the callbacks
 * @param {String}      [path]          if given, this path is used for the callback
 * @returns {Promise}
 */
Bridge.prototype.addCallback = function addCallback (hostname, port, listen, path) {
  var self = this;
  var url = 'http://' + hostname + ':' + port + '/' + (path || 'nuki-api-bridge');

  return this
      ._request('callback/add', '&url=' + url)
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

module.exports = Bridge;

/**
 * @typedef {Object}  NukiInformation
 * @property {Number}   nukiId      the id of the nuki
 * @property {String}   name        the name of the nuki
 * @property {Nuki}     nuki        nuki instance
 */
