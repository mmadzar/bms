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
		if (e.target.href.endsWith("#statuslink")) {
			showMonitor();
		} else if (e.target.href.endsWith("#debuglink")) {
			showDebug();
		}
	})
	$('#header-swipe').on("swipeleft", function (e) {
		//visible tab
		var vTab = parseInt($('[class="group"][style!="display: none;"]').attr('index'));
		vTab++;
		showTab(levelVisibleTabIndex(vTab));
	})

	$('#header-swipe').on("swiperight", function (e) {
		//visible tab
		var vTab = parseInt($('[class="group"][style!="display: none;"]').attr('index'));
		vTab--;
		showTab(levelVisibleTabIndex(vTab));
	})

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