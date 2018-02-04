var fs = require('fs'),
	path = require('path'),
	messages_const = new require('./messages'),
	serialBMS = require('./serialbms');
	bluetoothBMS = require('./bluetoothbms');

var BMSdevice = function (settings, evEmitter) {

	var monitorTimer = {};
	var statusAll = {}; //status object with stored values

	var serial = {};
	if (settings.portAddress === "") {
		serial = new bluetoothBMS(settings, evEmitter);
	} else {
		serial = new serialBMS(settings, evEmitter);
	}

	function runMonitor() {
		var resolution = settings.monitor.refreshInterval; //miliseconds
		//Send messages
		if (serial.isReady()) {
			serial.sendMessage(messages_const.getInfo03());
			//serial.sendMessage(messages_const.getInfo04());
		}
		monitorTimer = setTimeout(function () {
			runMonitor();
		}, resolution);
	}

	serial.on('data', function (data) {
		//Handle message
		if (data !== undefined && data.command !== undefined) {
			if (data.command.equals(messages_const.getInfo03())) {
				decodeInfo03(data.response);
			} else if (data.command.equals(messages_const.getInfo04())) {
				decodeInfo04(data.response);
			} else if (data.command.equals(messages_const.getInfo05())) {
				decodeInfo05(data.response);
			}
		}
	});

	serial.on('sent', function (data) {
		evEmitter.emit('sent', toHexString(data));
	});

	if (settings.monitor.autoStart) {
		runMonitor();
	}

	function decodeInfo03(messageArray) {
		var result = {};
		result['packV'] = ((messageArray[4] * 16 * 16 + messageArray[5]) / 100).toFixed(2);
		result['currentA'] = ((messageArray[6] * 16 * 16 + messageArray[7]) / 100).toFixed(2);

		result['temp1'] = getTemp(messageArray[27] * 16 * 16 + messageArray[28]);
		result['temp2'] = getTemp(messageArray[29] * 16 * 16 + messageArray[30]);

		result['remaining'] = (messageArray[8] * 16 * 16 + messageArray[9]) * 10;
		result['full'] = (messageArray[10] * 16 * 16 + messageArray[11]) * 10;

		emitStatus('general', result);
	}

	function decodeInfo04(messageArray) {
		var count = ((messageArray[2] * (16 * 16)) + (messageArray[3])) / 2;
		var result = {};
		result['count'] = count;
		for (var i = 0; i < count; i++) {
			var index = (i * 2) + 4;
			var cellV = (messageArray[index] * (16 * 16)) + (messageArray[index + 1]);
			result['cell' + padLeft((i + 1).toString(), 3)] = (cellV / 1000.000).toFixed(3);
		}
		emitStatus('cell', result);
	}

	function decodeInfo05(messageArray) {
		var result = {};
		var msg = [];
		for (var i = 0 + 4; i < messageArray.length - 4; i++) { //skip message start and end
			msg.push(String.fromCharCode(messageArray[i]));
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
		logToFile(k, v);
		var result = undefined;
		var inMemValues = statusAll[k];
		var tKey = '';
		var tVal = '';
		if (inMemValues === undefined) {
			result = v;
			statusAll[k] = v;
		} else {
			result = {};
			for (var i = 0; i < Object.keys(v).length; i++) {
				tKey = Object.keys(v)[i];
				tVal = v[tKey];
				if (inMemValues[tKey] !== tVal) { // only changed values
					inMemValues[tKey] = tVal;
					result[tKey] = tVal;
				}
			}
		}
		if (Object.keys(result).length > 0) {
			var d = new Date();
			var output = {};
			output[k] = result;
			output['timestamp'] = d.toISOString().substr(0, 21);
			evEmitter.emit('status', output);
		}
	}

	function logToFile(k, v) {
		var d = new Date();
		var filename = 'logs/' + d.toISOString().substr(0, 13).replace(/-/g, '') + '_log_' + k + '.csv';

		var content = d.toISOString() + ';';
		for (var i = 0; i < Object.keys(v).length; i++) {
			content = content + v[Object.keys(v)[i]] + ';';
		}
		content = content + '\n';
		fs.appendFile(filename, content, function (err) {
			if (err) {
				if (!fs.existsSync('logs')) {
					fs.mkdirSync('logs');
				}
				console.log(err);
			}
		});
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

	//Exported functions
	this.sendMessage = function (msgHexStringWithSpaces) {
		var arrMsg = msgHexStringWithSpaces.split(' ');
		var result = new Buffer(arrMsg.length);
		for (var i = 0; i < arrMsg.length; i++) {
			result[i] = parseInt(arrMsg[i], 16);
		}
		serial.sendMessage(result);
		evEmitter.emit('msgsent', result);
	}

	this.startMonitor = function () {
		runMonitor();
	}

	this.stopMonitor = function () {
		clearTimeout(monitorTimer);
	}
	this.resetInMemoryStatus = function () {
		statusAll = {};
	}

};

module.exports = BMSdevice;