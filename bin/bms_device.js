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
serialInterface.on('open', function (err) {
	evEmitter.emit('device', "connected " + deviceId)
	console.log("connected " + deviceId);
});
serialInterface.on('data', onSerialData);


function onSerialData(data) {
	evEmitter.emit('bmsdata', data); //original bus message
	collectBuffer(data);
}

function collectBuffer(data) {
	var dt = new Date();
	var msg = dt.toUTCString() + '\t';
	if (data.len === 1) {
		CONSOLE.log
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
	//Collect buffer and compose message
	//0x77 - EOR
	allBuffer.push(dataItem);
	if (allBuffer.length % 256 === 0) {
		console.log(toHexString(allBuffer))
	}

	//console.log(toHexString(allBuffer));
	if (allBuffer.length > 4) {
		if (allBuffer[0] === 221 && (allBuffer[1] === 165 || allBuffer[1] === 90)) { //DD A5 (5A) LL LL ... CS EOR
			//check for command dd 5a xx xx xx xx 77
			if (allBuffer.length === 7 && allBuffer[6] === 119) {
				console.log('command.: ' + toHexString(allBuffer));
				allBuffer = [];
			} else {
				var mlen = allBuffer[3];
				//console.log("len: " + mlen + "..." + toHexString(allBuffer));
				if (mlen > 0 && allBuffer.length >= mlen + 7) {
					console.log('response: ' + toHexString(allBuffer));

					//Handle message - refactor out
					if (allBuffer[2] === 0 && allBuffer[3] === 27) //status info for command 03
					{
						var t1 = toHexString([allBuffer[27], allBuffer[28]]);
						var t2 = toHexString([allBuffer[29], allBuffer[30]]);
						var temp1 = getTemp(parseInt(t1.replace(' ', ''), 16));
						var temp2 = getTemp(parseInt(t2.replace(' ', ''), 16));
						//console.log('temp: ' + t1 + ' ' + temp1 + " .. " + t2 + ' ' + temp2);
					}
					allBuffer = [];
				}
			}
		}
	}

	if (dataItem === 119 && allBuffer.length > 0 && (allBuffer[0] !== 221 && allBuffer[1] !== 165)) { //77
		console.log('unknown : ' + toHexString(allBuffer));
		allBuffer = [];
	}
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