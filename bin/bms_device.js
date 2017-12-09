var SerialPort = require('serialport');
//var baasic = require('./baasic');

// config
var device = 'COM22';
var deviceId = 'bms01';

// setup interface
var serialInterface = new SerialPort(device, {
	baudRate: 9600,
	dataBits: 8,
	stopBits: 1,
	parity: 'even',
	xon: false,
	xoff: false,
	rtscts: false
});

var evEmitter;
var allBuffer = [];

// cleanup
process.on('SIGINT', onSignalInt);

function onSignalInt() {
	ibusInterface.shutdown(function () {
		process.exit();
	});
}

// events
serialInterface.on('data', onSerialData);
serialInterface.on('open', function (err) {
	evEmitter.emit('device', "connected " + deviceId)
	console.log("port open...")
});

function onSerialData(data) {
	evEmitter.emit('bmsdata', data); //original bus message
	collectBuffer(data);
}

function collectBuffer(data) {
	var dt = new Date();
	var msg = dt.toUTCString() + '\t';
	if (data.len === 1) {
		msg = msg + data.toString(16);
		updateBuffer(data);

	} else {
		msg = msg + toHexString(data);
		for (var i = 0; i < data.length; i++) {
			updateBuffer(data[i]);
		}
	}

	evEmitter.emit('bmsmessage', msg);
}

function updateBuffer(dataItem) {
	//Collect buffer and make message
	//0x77 - EOR
	allBuffer.push(dataItem);
	if (allBuffer.len > 3) {
		if (allBuffer[0] == 221 && allBuffer[1] == 165) { //DD A5 LL LL ... CS EOR
			var mlen = parseInt(allBuffer[3]);
			if (mlen > 0 && allBuffer.len >= mlen + 6) {
				console.log('messsage 1: ' + toHexString(allBuffer));
				allBuffer = [];
			}
		}
	}
	if (dataItem === 119) { //77
		console.log('messsage 2: ' + toHexString(allBuffer));
		allBuffer = [];
	}
}

//emits an array of statuses
function emitStatus(k, v) {
	var d = new Date();
	var result = {};
	result[k] = v;
	evEmitter.emit('status update', result);
	//baasic.emitBaasic(k, v);
}

function padLeft(s, n) {
	return String("0".repeat(n + 1) + s).slice(-n);
}

function toHexString(bArray) {
	var result = [];
	for (var i = 0; i < bArray.length; i++) {
		result.push(padLeft(bArray[i].toString(16), 2));
	}
	return result.join(' ');
}

function Buff2Bin(bArray) {
	var r = [];
	for (var i = 0; i < bArray.length; i++) {
		r.push(padLeft(bArray[i].toString(2), 8));
	}
	return Array.from(r.join(''));
}

function Buff2Bin2(bArray) {
	//from second element on in the array
	var r = [];
	for (var i = 1; i < bArray.length; i++) {
		r.push(padLeft(bArray[i].toString(2), 8));
	}
	return r;
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

	init: function (eventemitter, device, /*, baasicapp*/ ) {
		evEmitter = eventemitter;
		//baasic.init(baasicapp, evEmitter, this);
	},

	sendMessage: function (msgstring) {
		sendBusMessage(msgstring);
	},

	getSerialInterface() {
		return serialInterface();
	}
};