var SerialPort = require('serialport');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
	
var SerialBMS = function (deviceSettings, evEmitter) {
    var _self = this;

    // config
    var device = deviceSettings.portAddress; //Serial port
    var deviceId = deviceSettings.deviceId; //device id on network

    // setup interface
    var serialInterface = new SerialPort(device, {
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        autoOpen: false
    });

    var msgQueue = [];
    var allBuffer = new Buffer(0); //temporary buffer collection

    serialInterface.open();

    // events
    serialInterface.on('open', function (err) {
        evEmitter.emit('device', 'connected ' + deviceId);
        console.log('connected ' + deviceId);
    });
    serialInterface.on('data', onSerialData);
    serialInterface.on('error', function (error) {
        console.log(error);
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
            //console.log('write: ' + JSON.stringify(msg));
            serialInterface.write(new Buffer(msg.content), function (err) {
                if (err) {
                    console.log('Error on writing to serial. ' + err);
                }
            });
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

    // cleanup
    process.on('SIGINT', onSignalInt);

    function onSignalInt() {
        serialInterface.close();
    }

    _self.sendMessage = function (bufferMsg) {
        queueMessage(bufferMsg);
    }

    _self.isReady = function(){
        return msgQueue.length===0;
    }
};

util.inherits(SerialBMS, EventEmitter);
module.exports = SerialBMS;