//module settings.js
var fs = require('fs');
var filename = ('settings.json');

settings = {
    deviceId: 'bms01',
    portAddress: 'COM20',
    bluetoothAddress: '00:15:83:00:71:11',
    monitor: {
        refreshInterval: 1000, //ms
        autoStart: false,
        logToFile: false
    },
    load: function () {
        var loaded = JSON.parse(fs.readFileSync(filename));
        this.deviceId = loaded.deviceId;
        this.portAddress = loaded.portAddress;
        this.bluetoothAddress = loaded.bluetoothAddress;
        this.monitor.refreshInterval = loaded.monitor.refreshInterval;
        this.monitor.autoStart = loaded.monitor.autoStart;
        this.monitor.logToFile = loaded.monitor.logToFile;
    },
    save: function () {
        fs.writeFileSync(filename, JSON.stringify(this));
    }
};

module.exports = settings;