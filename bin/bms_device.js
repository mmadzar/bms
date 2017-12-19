var path = require('path');
var messages_const = new require('./messages.js')
var SerialPort = require('serialport');
//var baasic = require('./baasic');

// config
var device = 'COM20'; //Serial port
var deviceId = 'bms01'; //device id on network

// setup interface
var serialInterface = new SerialPort(device, {
	baudRate: 9600,
	dataBits: 8,
	stopBits: 1,
	parity: 'none',
	autoOpen: false
});
serialInterface.open();

var evEmitter;
var msgQueue = [];
var allBuffer = new Buffer(0); //temporary buffer collection
var statusAll = []; //status object (key, value) with values

// cleanup
process.on('SIGINT', onSignalInt);

function onSignalInt() {
	serialInterface.close();
}

// events
serialInterface.on('open', function (err) {
	evEmitter.emit('device', 'connected ' + deviceId)
	console.log('connected ' + deviceId);
});
serialInterface.on('data', onSerialData);
serialInterface.on('error', function (error) {
	console.log(error);
});

function onSerialData(data) {
	collectBuffer(data);
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
		serialInterface.write(new Buffer(msg.content), function (err) {
			if (err) {
				console.log('Error on writing to serial. ' + err);
			}
		});
		msg.status = 1; //sending message
		var hexMessageWithSpaces = toHexString(msg.content);
		evEmitter.emit('msg sent: ', hexMessageWithSpaces);
		//console.log('sent: ' + hexMessageWithSpaces);
	}
}

function realtimeMonitor() {
	var resolution = 250; //miliseconds
	//Send messages
	if (msgQueue.length === 0) {
		queueMessage(messages_const.getInfo03());
		queueMessage(messages_const.getInfo04());
	}
	setTimeout(function () {
		realtimeMonitor();
	}, resolution);
}

function collectBuffer(data) {
	updateBuffer(data);
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
			//console.log('len: ' + mlen + '...' + toHexString(allBuffer));
			if (mlen > 0 && allBuffer.length >= mlen + 7) {
				evEmitter.emit('bmsmessage', toHexString(allBuffer));

				//Handle message
				var buffMsg = msgQueue[0];
				if (buffMsg !== undefined && buffMsg.status === 1) {
					msgQueue.shift();
					if (buffMsg.content.equals(messages_const.getInfo03())) {
						decodeInfo03(allBuffer, mlen);
					} else if (buffMsg.content.equals(messages_const.getInfo04())) {
						decodeInfo04(allBuffer, mlen);
					} else if (buffMsg.content.equals(messages_const.getInfo05())) {
						decodeInfo05(allBuffer, mlen);
					}
				}
				allBuffer = new Buffer(0);
			}
		}
	}

	if (dataBuff[dataBuff.length - 1] === 119 && allBuffer.length > 0 && (allBuffer[0] !== 221 && allBuffer[1] !== 165)) { //77
		evEmitter.emit('bmsmessage', toHexString(allBuffer));
		//console.log('unknown : ' + toHexString(allBuffer));
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

function decodeInfo03(messageArray, len) {
	var result = {};
	result['packV'] = ((messageArray[5] * 16 * 16 + messageArray[6]) / 1000).toFixed(2);
	result['currentA'] = messageArray[7] * 16 * 16 + messageArray[8];

	result['temp1'] = getTemp(messageArray[27] * 16 * 16 + messageArray[28]);
	result['temp2'] = getTemp(messageArray[29] * 16 * 16 + messageArray[30]);

	result['remaining'] = messageArray[9] * 16 * 16 + messageArray[10]
	result['full'] = messageArray[11] * 16 * 16 + messageArray[12];

	emitStatus('general', result);
}

function decodeInfo04(messageArray, len) {
	var count = len / 2;
	var result = {};
	result['count'] = count;
	for (var i = 0; i < count; i++) {
		var index = (i * 2) + 4;
		var cellV = (messageArray[index] * (16 * 16)) + (messageArray[index + 1]);
		result['cell' + padLeft((i + 1).toString(), 3)] = (cellV / 1000.000).toFixed(3);
	}
	emitStatus('cell', result);
}

function decodeInfo05(messageArray, len) {
	var result = {};
	var msg = '';
	for (var i = 0; i < messageArray.length; i++) {
		msg.push(messageArray[i].toString());
	}
	result['name'] = msg.join('');
	emitStatus('info', result);
}

function getTemp(kelvin10) {
	var tempC = (kelvin10 / 10) - 273.15; // Convert Kelvin to Celsius
	return tempC.toFixed(2);
}

//emits an array of statuses
function emitStatus(k, v) {
	var d = new Date();
	var result = {};
	result[k] = v;
	evEmitter.emit('status update', result);
}

function padLeft(s, n) {
	return String('0'.repeat(n + 1) + s).slice(-n);
}

function toHexString(bArray) {
	var result = [];
	for (var i = 0; i < bArray.length; i++) {
		result.push(padLeft(bArray[i].toString(16), 2));
	}
	return result.join(' ');
}

function getPaddedLenBuf(text, len) {
	var outputTextBuf = new Buffer(len);
	outputTextBuf.fill(0x20);

	var textBuf = (new Buffer(text, 'utf-8')).slice(0, len);

	// copy to the new padded buffer
	textBuf.copy(outputTextBuf);

	return outputTextBuf;
}

module.exports = {

	init: function (eventemitter /*, baasicapp*/ ) {
		evEmitter = eventemitter;
		msgQueue = [];
		//baasic.init(baasicapp, evEmitter, this);
	},

	sendMessage: function (msgstring) {
		realtimeMonitor();
		//sendSerialMessage(msgstring);
	},
};