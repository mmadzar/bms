jQuery(function ($) {
	var msgCounter = 0;
	var socket = io();
	var $messageslist = $('#messageslist');
	var $generalcol = $('#generalcol');
	var $cellcol = $('#cellcol');
	var $infocol = $('#infocol');

	socket.on('disconnect', function (reason) {
		var dt = new Date();
		displayInLog(dt.toJSON() + '\t' + 'io error: ' + reason + '</br>');
	});
	socket.on('chat message', function (msg) {
		displayInLog(msg + '</br>');
	});
	socket.on('status update', function (data) {
		parseStatusUpdate(data);
	});

	$('#btnSendMessage').click(function (e) {
		e.preventDefault();
		var msg = $('#message').val();
		if (msg !== undefined && msg.length > 0) {
			sendMessage(msg);
		}
	});

	$('#btnStartMonitor').click(function (e) {
		e.preventDefault();
		socket.emit('start monitor');
	});

	$('#btnStopMonitor').click(function (e) {
		e.preventDefault();
		socket.emit('stop monitor');
	});

	function sendMessage(msg) {
		socket.emit('send message', msg);
	}

	function parseStatusUpdate(msg) {
		var data = {};
		$infocol.find("#timestamp").text(msg.timestamp);
		var $parentCol = $cellcol;
		if (msg['general'] !== undefined) {
			$parentCol = $generalcol;
			data = msg.general;
			//update gauges
			setGaugeData(data);
		} else if (msg['cell'] !== undefined) {
			$parentCol = $cellcol;
			data = msg.cell;
		} else if (msg['info'] !== undefined) {
			$parentCol = $infocol;
			data = msg.info;
		} else {
			displayInLog(msg + '[' + msgCounter + ']</br>');
		}

		if ($parentCol.html().trim() === '' && msg['cell'] !== undefined) {
			generateCellTable(msg['cell']['count']);
		}
		var arr = $.map(data, function (v, k) {
			return {
				k: k,
				v: v
			};
		});
		for (var i = arr.length - 1; i >= 0; i--) {
			$parentCol.find('#' + arr[i].k).text(arr[i].v);
		}
	}

	function generateCellTable(itemsCount) {
		var elems = '';
		var cellcount = '';
		for (var i = 0; i < itemsCount; i++) {
			cellcount = String("0".repeat(4) + (i + 1).toString()).slice(-3);
			elems = elems + '<div class="col-xs-4 col-md-1"><h3><label id=cell' + cellcount + ' class="label label-primary"></label></h3><label class="label label-default">' + cellcount + '</label></div>';
		}
		$cellcol.html(elems);
	}

	function displayInLog(msg) {
		$messageslist.prepend(msg);
	}

	//menu navigation
	$('.navigation').on('click', function (e) {
		var elName = e.target.href.split('#')[1];
		var groupEl = '#' + elName.replace('link', 'group');
		showTab(parseInt($(groupEl).attr('index')));
	});

	$('#header-swipe').on("swipeleft", function (e) {
		//visible tab
		var vTab = parseInt($('[class="group"][style!="display: none;"]').attr('index'));
		vTab++;
		showTab(levelVisibleTabIndex(vTab));
	});

	$('#header-swipe').on("swiperight", function (e) {
		//visible tab
		var vTab = parseInt($('[class="group"][style!="display: none;"]').attr('index'));
		vTab--;
		showTab(levelVisibleTabIndex(vTab));
	});

	function levelVisibleTabIndex(index) {
		if (index > 2) {
			return 0;
		}
		else if (index < 0) {
			return 2;
		}
		else {
			return index;
		}
	}

	function showTab(index) {
		$('.group').hide();
		$($('.group')[index]).show();
		$('.menu-item').removeClass('active');
		$($('.menu-item')[index]).addClass('active');
		setStyle(index === 0);
	}

	//container style
	function setStyle(isDark) {
		if (isDark) {
			document.getElementsByTagName('body')[0].setAttribute('style', 'background-color: #1b1b1b;');
			document.getElementsByTagName('nav')[0].setAttribute('style', 'background-color: #1b1b1b;');
		}
		else {
			document.getElementsByTagName('body')[0].removeAttribute('style');
			document.getElementsByTagName('nav')[0].removeAttribute('style');
		}
	}

});

var myChart;
var option;
var gaugeStatus = {};

function setGauges(elementId) {
	var voltsMin = 2.0 * 46,
		voltsMax = 3.7 * 46,
		ampsMin = -150,
		ampsMax = 250,
		kwMin = -25,
		kwMax = 45;

	myChart = echarts.init(document.getElementById(elementId));
	option = {
		backgroundColor: '#1b1b1b',
		tooltip: {
			formatter: "{a} <br/>{c} {b}"
		},
		toolbox: {
			show: false
		},
		series: [
			{
				name: 'power',
				type: 'gauge',
				min: kwMin,
				max: kwMax,
				splitNumber: 14,
				axisLine: {
					lineStyle: {
						color: [[0.043, '#ff4500'], [0.36, 'lime'], [0.93, '#1e90ff'], [1, '#ff4500']],
						width: 3,
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				axisLabel: {
					textStyle: {
						fontWeight: 'bolder',
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10,
						fontSize: 20
					},
					formatter: function (v) {
						switch (v % 10) {
							case 0: return v;
							case 5: return '';
						}
					}
				},
				axisTick: {
					length: 15,
					lineStyle: {
						color: 'auto',
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				splitLine: {
					length: 25,
					lineStyle: {
						width: 3,
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				pointer: {
					shadowColor: '#fff',
					shadowBlur: 5
				},
				title: {
					textStyle: {
						fontWeight: 'bolder',
						fontSize: 20,
						fontStyle: 'italic',
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					},
					offsetCenter: [0, '-30%']
				},
				detail: {
					backgroundColor: 'rgba(30,144,255,0.8)',
					borderWidth: 1,
					borderColor: '#fff',
					shadowColor: '#fff',
					shadowBlur: 5,
					offsetCenter: [0, '50%'],
					textStyle: {
						fontWeight: 'bolder',
						color: '#fff'
					}
				},
				data: [{ value: kwMin - 2, name: 'kW' }]
			},
			{
				name: 'amps',
				type: 'gauge',
				center: ['18%', '40%'],
				radius: '50%',
				min: ampsMin,
				max: ampsMax,
				endAngle: 45,
				splitNumber: 8,
				axisLine: {
					lineStyle: {
						color: [[0.05, '#ff4500'], [0.25, 'lime'], [0.92, '#1e90ff'], [1, '#ff4500']],
						width: 2,
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				axisLabel: {
					textStyle: {
						fontWeight: 'bold',
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10,
						fontSize: 14
					},
					formatter: function (v) {
						if (((v / 10) % 10) === 0) {
							return (v / 10).toFixed(0);
						}
					}
				},
				axisTick: {
					length: 12,
					lineStyle: {
						color: 'auto',
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				splitLine: {
					length: 20,
					lineStyle: {
						width: 3,
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				pointer: {
					width: 5,
					shadowColor: '#fff',
					shadowBlur: 5
				},
				title: {
					offsetCenter: [0, '-30%'],
					textStyle: {
						fontWeight: 'bolder',
						fontStyle: 'italic',
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				detail: {
					borderColor: '#fff',
					shadowColor: '#fff',
					shadowBlur: 5,
					width: 60,
					height: 20,
					offsetCenter: [0, '20%'],       // x, y
					textStyle: {
						fontWeight: 'bolder',
						color: '#fff'
					},
					formatter: function (v) {
						return v.toFixed(0);
					}
				},
				data: [{ value: ampsMin - 20, name: 'x10 A' }]
			},
			{
				name: 'battery',
				type: 'gauge',
				center: ['85%', '45%'],
				radius: '50%',
				min: 0,
				max: 10,
				startAngle: 135,
				endAngle: 45,
				splitNumber: 4,
				axisLine: {
					lineStyle: {
						color: [[0.15, '#ff4500'], [0.85, '#1e90ff'], [1, '#ff4500']],
						width: 2,
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				axisTick: {
					length: 12,
					lineStyle: {
						color: 'auto',
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				axisLabel: {
					textStyle: {
						fontWeight: 'bolder',
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					},
					formatter: function (v) {
						switch (v + '') {
							case '0': return '0';
							case '5': return '%';
							case '10': return '100';
						}
					}
				},
				splitLine: {
					length: 15,
					lineStyle: {
						width: 3,
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				pointer: {
					width: 2,
					shadowColor: '#fff',
					shadowBlur: 5
				},
				title: {
					show: true,
					textStyle: {
						fontWeight: 'bolder',
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					},
					offsetCenter: [0, '-25%']
				},
				detail: {
					show: false
				},
				data: [{ value: -1, name: 'Battery' }]
			},
			{
				name: 'volts',
				type: 'gauge',
				center: ['15%', '55%'],
				radius: '50%',
				min: voltsMin,
				max: voltsMax,
				startAngle: 315,
				endAngle: 225,
				splitNumber: 4,
				axisLine: {
					lineStyle: {
						color: [[0.10, '#ff4500'], [0.5, '#1e90ff'], [0.90, 'lime'], [1, '#ff4500']],
						width: 2,
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				axisTick: {
					show: true
				},
				axisLabel: {
					textStyle: {
						fontWeight: 'bold',
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10,
						fontSize: 8
					},
					formatter: function (v) {
						return v.toFixed(0);
					}
				},
				splitLine: {
					length: 15,
					lineStyle: {
						width: 3,
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				pointer: {
					width: 2.5,
					shadowColor: '#fff',
					shadowBlur: 5
				},
				title: {
					offsetCenter: [0, '25%'],
					textStyle: {
						fontWeight: 'bolder',
						fontStyle: 'italic',
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				detail: {
					show: true,
					offsetCenter: [0, '25%'],
					formatter: function (v) {
						return v.toFixed(0);
					},
					textStyle: {
						fontWeight: 'bolder',
						fontSize: 15,
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				data: [{ value: voltsMin - 10, name: 'V' }]
			},
			{
				name: 'temp',
				type: 'gauge',
				center: ['85%', '55%'],
				radius: '50%',
				min: -10,
				max: 90,
				startAngle: 315,
				endAngle: 225,
				splitNumber: 4,
				axisLine: {
					lineStyle: {
						color: [[0.25, '#1e90ff'], [0.75, 'lime'], [1, '#ff4500']],
						width: 2,
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				axisTick: {
					show: true
				},
				axisLabel: {
					textStyle: {
						fontWeight: 'normal',
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					},
					formatter: function (v) {
						var fv = v.toFixed(0);
						if (fv === '15' || fv === '65') {
							return '';
						}
						else {
							return v.toFixed(0);
						}
					}
				},
				splitLine: {
					length: 15,
					lineStyle: {
						width: 3,
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				pointer: {
					width: 2.5,
					shadowColor: '#fff',
					shadowBlur: 5
				},
				title: {
					offsetCenter: [0, '25%'],
					textStyle: {
						fontWeight: 'bolder',
						fontStyle: 'italic',
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				detail: {
					show: true,
					offsetCenter: [0, '25%'],
					formatter: function (v) {
						return v.toFixed(0);
					},
					textStyle: {
						fontWeight: 'bolder',
						fontSize: 15,
						color: '#fff',
						shadowColor: '#fff',
						shadowBlur: 10
					}
				},
				data: [{ value: -20, name: '°C' }]
			}
		]
	};

	myChart.setOption(option);
	myChart.setTheme(theme);

	function getRandomInt(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
	}

	window.onresize = function (event) {
		myChart.resize();
	}
}

function setGaugeData(general) {
	if (gaugeStatus === {}) {
		gaugeStatus = general;
	}
	else {
		var arr = $.map(data, function (v, k) {
			return {
				k: k,
				v: v
			};
		});
		for (var i = arr.length - 1; i >= 0; i--) {
			gaugeStatus[arr[i].k] = arr[i];
		}
	}
	if (general !== undefined) {
		if (general.currentA !== undefined || general.packV !== undefined) {
			option.series[0].data[0].value = gaugeStatus.packV * gaugeStatus.currentA / 1000; //kW
			option.series[1].data[0].value = gaugeStatus.currentA; //Amps
			option.series[3].data[0].value = gaugeStatus.packV; //volts
		}
		if (general.remaining !== undefined || general.full !== undefined) {
			option.series[2].data[0].value = gaugeStatus.remaining / gaugeStatus.full * 10; //battery
		}
		if (general.temp1 !== undefined) {
			option.series[4].data[0].value = gaugeStatus.temp1; //temp
		}
		myChart.setOption(option, true);
	}
}
