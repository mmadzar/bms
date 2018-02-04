var RSSI_THRESHOLD = -90,
    util = require('util'),
    EventEmitter = require('events').EventEmitter//,
    noble = require('noble')

var BluetoothBMS = function (settings, evEmitter) {
    var _self = this;

    // config
    var device = settings.bluetoothAddress; //Serial port
    var deviceId = settings.deviceId; //device id on network

    // setup interface
    if (settings.bluetoothAddress !== undefined && settings.bluetoothAddress !== '') {
        noble.on('stateChange', function (state) {
            console.log('state changed: ' + JSON.stringify(state));
            if (state === 'poweredOn') {
                console.log('started scanning...');
                noble.startScanning([], true);
            } else {
                noble.stopScanning();
            }
        });
    }

    var msgQueue = [];
    var allBuffer = new Buffer(0); //temporary buffer collection
    var writeNode = undefined;

    //connect and attach
    noble.on('discover', function (peripheral) {
        if (peripheral.rssi < RSSI_THRESHOLD) {
            // ignore
            return;
        }
        // console.log('found ' + peripheral.address + '');
        noble.stopScanning();
        if (peripheral.address = settings.bluetoothAddress) {
            console.log('connecting to device ' + peripheral.address + '...');
            peripheral.connect(function (error) {
                if (error) {
                    console.log('Error connecting: ' + JSON.stringify(error));
                } else {
                    //scan services
                    peripheral.discoverServices([], function (err, services) {
                        services.forEach(function (service) {
                            // this should be our service
                            if (service.uuid === 'ffe0') {
                                console.log('found service:', service.uuid);
                                service.discoverCharacteristics([], function (err, characteristics) {
                                    for (var i = 0; i < characteristics.length; i++) {
                                        const element = characteristics[i];
                                        // this should be our characteristic
                                        if (element.uuid === 'ffe1') {
                                            console.log("found characteristics: " + element.uuid);
                                            writeNode = element;
                                            writeNode.on('read', function (data, notification) {
                                                if (notification) { // if you got a notification
                                                    onSerialData(data);
                                                } else {
                                                    console.log('data: ' + data.toString());
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    });
                }
            });
        }
    });

    function onSerialData(data) {
        updateBuffer(data);
        evEmitter.emit('bmsdata', data); //original bus message
    }

    function queueMessage(hexMessageWithSpaces) {
        var chars = hexMessageWithSpaces.split(' ');
        var msg = [];
        for (var i = 0; i < chars.length; i++) {
            msg.push('0x' + chars[i]);
        }
        var msgBuff = new Buffer(msg);
        queueMessage(msgBuff);
    }

    function queueMessage(bufferMessage) {
        if (bufferMessage.length > 0) {
            msgQueue.push({
                content: bufferMessage,
                status: 0
            }); //add message to queue with default status
        }
        if (msgQueue.length > 0) {
            writeMessageToSerial(msgQueue[0]);
        }
    }

    function writeMessageToSerial() {
        var msg = msgQueue[0];
        if (msg !== undefined && msg.status === 0) {
            if (writeNode !== undefined) {
                writeNode.write(new Buffer(msg.content), false, function (error) {
                    if (error) {
                        console.log("write failed: " + JSON.stringify(error));
                    }
                });
            } else {
                console.log("write failed: no destination");
            }
            //console.log('write: ' + JSON.stringify(msg));
            msg.status = 1; //sending message
            _self.emit('sent', msg.content);
        }
    }

    function updateBuffer(dataBuff) {
        //Collect buffer and compose message
        if (allBuffer.length > 0) {
            allBuffer = Buffer.concat([allBuffer, dataBuff]);
        } else {
            allBuffer = new Buffer(dataBuff);
        }

        if (allBuffer.length > 4) {
            if (allBuffer[0] === 221 && dataBuff[dataBuff.length - 1] === 119) { //DD A5 (5A) LL LL ... 77
                var mlen = (allBuffer[2] * (16 * 16)) + (allBuffer[3]);
                if (mlen > 0 && allBuffer.length >= mlen + 7) {
                    var buffMsg = new Buffer(msgQueue[0].content); //get message copy
                    msgQueue.shift();
                    _self.emit('data', {
                        command: buffMsg,
                        response: new Buffer(allBuffer)
                    });
                    allBuffer = new Buffer(0);
                }
            }
        }

        if (dataBuff[dataBuff.length - 1] === 119 && allBuffer.length > 0 && (allBuffer[0] !== 221 && allBuffer[1] !== 165)) { //77
            _self.emit('data', {
                command: null,
                response: allBuffer
            });
            allBuffer = new Buffer(0);
        }

        if (allBuffer.length === 0) {
            //update queue
            if (msgQueue.length > 0 && msgQueue[0].status === 1) {
                msgQueue.shift();
            }
            if (msgQueue.length > 0) {
                writeMessageToSerial();
            }
        }
    }

    _self.sendMessage = function (bufferMsg) {
        queueMessage(bufferMsg);
    }

    _self.isReady = function () {
        return msgQueue.length === 0;
    }
};

util.inherits(BluetoothBMS, EventEmitter);
module.exports = BluetoothBMS;