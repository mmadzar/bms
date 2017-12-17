jQuery(function($){
	var socket = io();
	var $messageslist = $('#messageslist');
	var $favoritecol = $('#favoritecol');
	var $lightscol = $('#lightscol');
	var $doorswndscol = $('#doors_windowscol');
  var baasicMsgCounter = 0;

	socket.on('disconnect', function(reason){
		var dt = new Date();
      	displayInLog(dt.toUTCString() + '\t' + 'io error: ' + reason + '</br>');
	});
	socket.on('chat message', function(msg){
      	displayInLog(msg + '</br>');
    });
	socket.on('status update', function(data){
		  parseStatusUpdate(data);
    });

    $('#btnSendMessage').click(function(e){
    	e.preventDefault();
		var msg = $('#message').val();
    	if(msg!==undefined && msg.length>0) {
			sendMessage(msg);
		}
    });

    function sendMessage(msg) {
  		socket.emit('send message', msg);
  		displayInLog('message sent: ' + msg + '</br>');
    }

    function parseStatusUpdate(msg){
			console.log(msg);
    	var data=msg.favorite;
    	var $parentCol = $favoritecol;
    	if(msg['favorite']!==undefined){ }
    	else if (msg['doors_windows']!==undefined){ $parentCol = $doorswndscol; data=msg.doors_windows;}
		  else if(msg['lights']!==undefined) { $parentCol = $lightscol; data=msg.lights;}
      else{
        baasicMsgCounter++;
        displayInLog(msg + '[' + baasicMsgCounter + ']</br>');
      }

  		var arr = $.map(data, function (v,k) {return {k: k, v: v};});
      	for (var i = arr.length - 1; i >= 0; i--) {
			     $parentCol.find('#' + arr[i].k).text(arr[i].v);
      	}
    }

    function displayInLog(msg) {
    	$messageslist.prepend(msg);
    }
});

