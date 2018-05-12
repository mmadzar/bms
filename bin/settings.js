//module settings.js
var fs = require('fs');
var filename = ('settings.json');

settings = {
    devices:
        [],
    monitor: {
        refreshInterval: 1000, //ms
        autoStart: false,
        logToFile: false
    },
    load: function () {
        return JSON.parse(fs.readFileSync(filename));
        // this.deviceId = loaded.deviceId;
        // this.portAddress = loaded.portAddress;
        // this.bluetoothAddress = loaded.bluetoothAddress;
        // this.monitor.refreshInterval = loaded.monitor.refreshInterval;
        // this.monitor.autoStart = loaded.monitor.autoStart;
        // this.monitor.logToFile = loaded.monitor.logToFile;
    },
    save: function () {
        fs.writeFileSync(filename, JSON.stringify(this));
    }
};

module.exports = settings;