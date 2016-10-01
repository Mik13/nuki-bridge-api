# nuki-bridge-api
An API for Nuki Bridge

## How it works

### Get Bridge Connection
``` js
var NukiBridgeApi = require('nuki-bridge-api');

var ip = '127.0.0.1';
var port = 12345;
var token = 'token';

var bridge = new NukiBridgeApi.Bridge(ip, port, token);
```

### Get Nukis
``` js
var bridge = new NukiBridgeApi.Bridge(ip, port, token);

bridge.getList().then(function gotNukis (nukis) {
    // Do something with the nukis
});
```

### What can i do with a nuki instance
``` js
var NukiBridgeApi = require('nuki-bridge-api');
var lockStates = NukiBridgeApi.lockState;
var lockActions = NukiBridgeApi.lockAction;

...

nuki.lockState().then(function (lockState) {
    if (lockState === lockStates.LOCKED) {
        return nuki.lockAction(lockActions.UNLOCK);
    } else if (lockState === lockStates.UNLOCKED) {
        return nuki.lockAction(lockActions.LOCK);
    }
});
```

### Does it warn me if the battery is low?
Yes, every nuki instance is an event-emitter, which emits a `batteryCritical` event if any request receives the flag.