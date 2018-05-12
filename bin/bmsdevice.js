//handles collection of bms devices
var RSSI_THRESHOLD = -90,
	fs = require('fs'),
	path = require('path'),
	messages_const = new require('./messages'),
	bluetoothBMS = require('./bluetoothbms'),
	noble = require('noble');

var BMSdevice = function (settings, evEmitter) {

	var monitorTimer = {},
		statusAll = {}, //status object with stored values
		btdevices = []; //bluetooth devices

	settings.devices.forEach(device => {
		var btDevice = new bluetoothBMS(device, evEmitter, noble);
		btdevices.push({ settings: device, peripheral: undefined, device: btDevice });
	});

	//scan for bluetooth devices
	noble.on('stateChange', function (state) {
		evEmitter.emit('device', 'BT state changed');
		console.log('state changed: ' + JSON.stringify(state));
		if (state === 'poweredOn') {
			evEmitter.emit('device', 'Scan started...');
			console.log('started scanning...');
			noble.startScanning([], true);
		} else {
			evEmitter.emit('device', 'Scan stopped.');
			noble.stopScanning();
		}
	});

	//connect and attach bluetooth devices
	noble.on('discover', function (peripheral) {
		if (peripheral.rssi < RSSI_THRESHOLD) {
			// ignore
			return;
		}
		//console.log('found ' + peripheral.address + '');
		btdevices.forEach(device => {
			if (device.peripheral === undefined & device.settings.bluetoothAddress === peripheral.address) {
				evEmitter.emit('device', device.settings.deviceId + ' [' + peripheral.address + '] searching...');
				console.log('added ' + peripheral.address + '');
				device.peripheral = peripheral;
				return;
			}
		});

		//all devices found. connect to all.
		if (btdevices.findIndex(function (d) {
			return d.peripheral === undefined;
		}) === -1) {
			noble.stopScanning();

			btdevices.forEach(deviceBT => {
				var peripheralBT = deviceBT.peripheral;
				console.log('connecting to device ' + peripheralBT.address + '...');
				evEmitter.emit('device', deviceBT.settings.deviceId + ' connecting...');
				peripheralBT.connect(function (error) {
					onConnect(error, deviceBT, peripheralBT);
				});
			});
		}
	});

	function onConnect(error, deviceBT, peripheralBT) {
		if (error) {
			console.log('Error connecting: ' + JSON.stringify(error));
		} else {
			evEmitter.emit('device', deviceBT.settings.deviceId + ' connected.');
			console.log('connected to device ' + peripheralBT.address + '...');
			//scan services
			peripheralBT.discoverServices([deviceBT.settings.bluetoothService], function (err, services) {
				services.forEach(function (service) {
					evEmitter.emit('device', deviceBT.settings.deviceId + ' service OK.');
					console.log(deviceBT.settings.deviceId, 'found service:', service.uuid);
					//scan characteristics
					service.discoverCharacteristics([deviceBT.settings.bluetoothCharacteristicRead, deviceBT.settings.bluetoothCharacteristicWrite], function (err1, characteristics) {
						for (var i = 0; i < characteristics.length; i++) {
							var element = characteristics[i];
							evEmitter.emit('device', deviceBT.settings.deviceId + ' characteristic OK.');
							console.log(deviceBT.settings.deviceId, "found characteristics: ", element.uuid);
							if (element.uuid === deviceBT.settings.bluetoothCharacteristicRead) {
								deviceBT.device.setReadNode(element);
								deviceBT.device.on('data', function (data) {
									onSerialData(deviceBT.settings.deviceId, data);
								});
							}
							//support same characteristic for read and write						
							if (element.uuid === deviceBT.settings.bluetoothCharacteristicWrite) {
								deviceBT.device.setWriteNode(element);
							}
						}
					});
				});
			});
			peripheralBT.once('disconnect', function () {
				deviceBT.peripheral = undefined;
				evEmitter.emit('device', deviceBT.settings.deviceId + ' disconnected.');
				console.log(deviceBT.settings.deviceId, 'disconnected.');
			});

		}
	}



	function runMonitor() {
		var resolution = settings.monitor.refreshInterval; //miliseconds
		//Send messages to BT
		btdevices.forEach(device => {
			if (device.device.isReady()) {
				device.device.sendMessage(messages_const.getInfo03());
				if (settings.logToFile) {
					//read additional info for file logs
					device.device.sendMessage(messages_const.getInfo04());
				}
			}
		});
		monitorTimer = setTimeout(function () {
			runMonitor();
		}, resolution);
	}

	function onSerialData(deviceId, data) {
		//Handle message
		if (data !== undefined && data.command !== undefined) {
			if (data.command.equals(messages_const.getInfo03())) {
				emitStatus(deviceId, "general", decodeInfo03(data.response));
			} else if (data.command.equals(messages_const.getInfo04())) {
				emitStatus(deviceId, "cell", decodeInfo04(data.response));
			} else if (data.command.equals(messages_const.getInfo05())) {
				emitStatus(deviceId, "info", decodeInfo05(data.response));
			}
		}
	};

	if (settings.monitor.autoStart) {
		runMonitor();
	}

	function decodeInfo03(messageArray) {
		var result = {};
		result['packV'] = ((messageArray[4] * 16 * 16 + messageArray[5]) / 100).toFixed(2);
		result['currentA'] = ((messageArray[6] * 16 * 16 + messageArray[7]) / 10000).toFixed(0);

		result['temp1'] = getTemp(messageArray[27] * 16 * 16 + messageArray[28]);
		result['temp2'] = getTemp(messageArray[29] * 16 * 16 + messageArray[30]);

		result['remaining'] = (messageArray[8] * 16 * 16 + messageArray[9]) * 10;
		result['full'] = (messageArray[10] * 16 * 16 + messageArray[11]) * 10;
		return result;
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
		return result;
	}

	function decodeInfo05(messageArray) {
		var result = {};
		var msg = [];
		for (var i = 0 + 4; i < messageArray.length - 4; i++) { //skip message start and end
			msg.push(String.fromCharCode(messageArray[i]));
		}
		result['name'] = msg.join('');
		return result;
	}

	function getTemp(kelvin10) {
		var tempC = (kelvin10 / 10) - 273.15; // Convert Kelvin to Celsius
		return tempC.toFixed(2);
	}

	//emits an array of statuses
	function emitStatus(deviceId, k, v) {
		logToFile(deviceId, k, v);
		var result = {};
		result[k] = undefined;
		if (statusAll[deviceId] === undefined) {
			statusAll[deviceId] = {};
		}
		var inMemValues = statusAll[deviceId][k];
		var tKey = '';
		var tVal = '';
		if (inMemValues === undefined) {
			result[k] = v;
			statusAll[deviceId][k] = v;
		} else {
			for (var i = 0; i < Object.keys(v).length; i++) {
				tKey = Object.keys(v)[i];
				tVal = v[tKey];
				if (inMemValues[tKey] !== tVal) { // only changed values
					if (result[k] === undefined) {
						result[k] = {};
					}
					inMemValues[tKey] = tVal;
					result[k][tKey] = tVal;
				}
			}
		}
		if (result[k] !== undefined && Object.keys(result[k]).length > 0) {
			var d = new Date();
			var output = {};

			if (k === 'cell') {
				output[k] = v;
			}
			else {
				//calculate totals
				var summary = getTotals(k, result[k]);
				output[k] = summary;
			}
			output['timestamp'] = d.toISOString().substr(0, 21);
			output['deviceId'] = deviceId;
			evEmitter.emit('status', output);
		}
	}

	function getTotals(group, values) {
		var summary = {};
		for (var i = 0; i < Object.keys(values).length; i++) {
			tKey = Object.keys(values)[i];
			tVal = values[tKey];
			switch (tKey) {
				case 'remaining':
				case 'full':
					var sum = getSum(group, tKey);
					if (tVal !== sum) {
						summary[tKey] = sum.toFixed(0);
					}
					break;
				case 'packV':
					var sum = getSum(group, tKey);
					if (tVal !== sum) {
						summary[tKey] = sum.toFixed(2);
					}
					break;

				case 'currentA':
					var avg = getAvg(group, tKey);
					if (tVal !== avg) {
						summary[tKey] = avg.toFixed(2);
					}
					break;

				case 'temp1':
				case 'temp2':
					summary['tempMin'] = getMinTemp(group).toFixed(2);
					summary['tempMax'] = getMaxTemp(group).toFixed(2);
					break;

				default:
					break;
			}
		}
		return summary;
	}

	function getAvg(group, key) {
		var total = 0;
		var count = 0;
		btdevices.forEach(device => {
			var currentStatus = statusAll[device.settings.deviceId];
			if (currentStatus !== undefined && currentStatus[group] !== undefined) {
				count++;
				if (currentStatus[group][key] !== undefined) {
					total = total + parseFloat(currentStatus[group][key]);
				}
			}
		});
		return (total / count);
	}

	function getSum(group, key) {
		var total = 0;
		btdevices.forEach(device => {
			var currentStatus = statusAll[device.settings.deviceId];
			if (currentStatus !== undefined && currentStatus[group] !== undefined) {
				total = total + parseFloat(currentStatus[group][key]);
			}
		});
		return total;
	}

	function getMinTemp(group, key) {
		var min = 1000;
		btdevices.forEach(device => {
			var currentStatus = statusAll[device.settings.deviceId];
			if (currentStatus !== undefined && currentStatus[group] !== undefined) {
				var value1 = parseFloat(currentStatus[group]["temp1"]);
				var value2 = parseFloat(currentStatus[group]["temp2"]);
				if (min === undefined || min > value1) {
					min = value1;
				}
				if (min > value2) {
					min = value2;
				}
			}
		});
		return min;
	}

	function getMaxTemp(group) {
		var max = -1000;
		btdevices.forEach(device => {
			var currentStatus = statusAll[device.settings.deviceId];
			if (currentStatus !== undefined && currentStatus[group] !== undefined) {
				var value1 = parseFloat(currentStatus[group]["temp1"]);
				var value2 = parseFloat(currentStatus[group]["temp2"]);
				if (max === undefined || max < value1) {
					max = value1;
				}
				if (max < value2) {
					max = value2;
				}
			}
		});
		return max;
	}

	function logToFile(deviceId, k, v) {
		var d = new Date();
		var filename = 'logs/' + deviceId + '_' + d.toISOString().substr(0, 13).replace(/-/g, '') + '_log_' + k + '.csv';

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

	function disconnectBT() {
		clearTimeout(monitorTimer);
		btdevices.forEach(device => {
			if (device.peripheral !== undefined) {
				device.peripheral.disconnect();
			}
		});
	}

	//Exported functions
	this.sendMessage = function (msgHexStringWithSpaces) {
		var arrMsg = msgHexStringWithSpaces.split(' ');
		var forSend = new Buffer(arrMsg.length);
		for (var i = 0; i < arrMsg.length; i++) {
			forSend[i] = parseInt(arrMsg[i], 16);
		}

		//Send messages
		btdevices.forEach(device => {
			if (device.device.isReady()) {
				device.device.sendMessage(forSend);
			}
		});
		evEmitter.emit('msgsent', forSend);
	}

	this.startMonitor = function () {
		var allConnected = btdevices.length;
		btdevices.forEach(device => {
			if (device.peripheral !== undefined) {
				allConnected = allConnected - 1;
			}
		});
		if (allConnected === 0) {
			runMonitor();
		}
	}

	this.stopMonitor = function () {
		clearTimeout(monitorTimer);
	}
	this.resetInMemoryStatus = function () {
		statusAll = {};
	}
	this.disconnectBT = function () {
		disconnectBT();
	}
	this.connectBT = function () {
		//are all devices disconnected?
		var allDisconnected = 0;
		btdevices.forEach(device => {
			if (device.peripheral !== undefined) {
				allDisconnected = allDisconnected + 1;
			}
		});
		if (allDisconnected === 0) {
			noble.startScanning([], true);
		}
	}
};

module.exports = BMSdevice;