jQuery(function ($) {
	var msgCounter = 0;
	var socket = io();
	var $messageslist = $('#messageslist');
	var $generalcol = $('#generalcol');
	var $cellcol = $('#cellcol');
	var $infowndscol = $('#infocol');

	socket.on('disconnect', function (reason) {
		var dt = new Date();
		displayInLog(dt.toUTCString() + '\t' + 'io error: ' + reason + '</br>');
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

	function sendMessage(msg) {
		socket.emit('send message', msg);
		displayInLog('message sent: ' + msg + '</br>');
	}

	function parseStatusUpdate(msg) {
		var data = msg.favorite;
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
		for (var i = 0; i < itemsCount; i++) {
			elems = elems + '<tr><td><label id=cell' + String("0".repeat(4) + (i + 1).toString()).slice(-3) + '></label></td></tr>';
		}
		$cellcol.html(elems);
	}

	function displayInLog(msg) {
		$messageslist.prepend(msg);
	}
});