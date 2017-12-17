var baasic;
var bckey = '7ilgDcx7j4MLxQTH0FTfn2';
var bdkey = 'fsxLX3BYs4AuhATQ01FWI0';
var blkey = 'L6CMFWS2jKQS9ATS00TeR1';
var baasicKeyValues = [];
var localKeyValues = [];

var evEmitter;
var bus;

function checkBaasicCommands(){
	console.log('checking commands...');
	baasic.dynamicResourceClient.get('Commands', bckey)
		.then(function(request){
				console.log('checking commands... received request');
				var data=request.data;
				if(data.id===bckey && data.vehicle==='BMW528'){
					executeMessageFromBaasic(data);
				}
			},
			function(err){
					console.log('ErrorCHECK : ' + err);
			});

	setTimeout(() => {
		checkBaasicCommands();
	}, 1500);
}

function executeMessageFromBaasic(msg){
	var k = msg.id;
	var curBK=localKeyValues[k];
	var changed=[];
	var isChanged=false;
	if(curBK===undefined){ 
		localKeyValues[k] = msg.state;
		changed=msg.state;
		isChanged=true;
	}
	else{
		var vArr=Object.keys(msg.state).map(function (key) {return {key: key, value: msg.state[key]};});
		for (var i = 0; i < vArr.length; i++) {
			var el=vArr[i];
			var key=el.key;
			var curr = curBK[key];
			if(curr===undefined || curr!==el.value){
				curBK[key]=el.value;
				changed[key]=el.value;
				isChanged=true;
			}
		}
	}

	if(isChanged){
		if(changed['locks']!==undefined){
			bus.sendMessage('3f 00 0c 00 0b 01'); //toggle
		}
		if(changed['lightLowBeam']!==undefined || changed['lightHighBeam']!==undefined || changed['lightTurnSignal']!==undefined) {
			var lcomp=0;
			if(changed['lightTurnSignal']!==undefined && changed['lightTurnSignal']===true){
				lcomp=lcomp+2;
			}
			if(changed['lightLowBeam']!==undefined && changed['lightLowBeam']===true){
				lcomp=lcomp+4;
			}
			if(changed['lightHighBeam']!==undefined && changed['lightHighBeam']===true){
				lcomp=lcomp+8;
			}
			bus.sendMessage('00 BF 76 ' + padLeft(lcomp.toString(16),2));
		}
	}
}

function loginToBaasic(){
	console.log('logging to baasic...');
	baasic.membershipClient.login.login({
	    username: 'info@baasic.com',
	    password: 'bmw-sc-1122'})
			.then(function (data) {
				console.log('connected to baasic.');
				//checkBaasicCommands();
			},
			function (err) {
				console.log('Error - will retry in 10s: ', err);
				setTimeout(() => {
					console.log('retry login: ', err);
					loginToBaasic();
				}, 10000);
			});
}

function emitBaasic(k, v){

	//sync keys
	var curBK=baasicKeyValues[k];
	var changed=[];
	var isChanged=false;
	if(curBK===undefined){ 
		baasicKeyValues[k] = v;
		changed=v;
		isChanged=true;
	}
	else{
		var vArr=Object.keys(v).map(function (key) {return {key: key, value: v[key]};});
		for (var i = 0; i < vArr.length; i++) {
			var el=vArr[i];
			var key=el.key;
			var curr = curBK[key];
			if(curr===undefined || curr!==el.value){
				curBK[key]=el.value;
				changed[key]=el.value;
				isChanged=true;
			}
		}
	}
	console.log('changed: ', changed);

	if (isChanged) {
		if(k!=='favorite'){
			//update state
			baasicUpdateKeys(k, changed);
		}
		else{
			//update metering
			baasicUpdateMetering(k, changed);
		}
	}
}

function baasicUpdateKeys(k, changed){
	var chgArr=Object.keys(changed).map(function (key) {return {key: key, value: changed[key]};});
	var cmd={};
	var keyToSync = '';
	var idToSync = '';
	if(k==='doors_windows'){
		keyToSync='StatusDoorsWindows';
		idToSync = bdkey;
		for (var i = 0; i < chgArr.length; i++) {
			var el=chgArr[i];
			switch(el.key){
				case 'lock_locked':
				cmd.locks = (el.value ? 'locked' : 'unlocked');
				break;
				case 'trunk':
				cmd.trunk = el.value;
				break;
				case 'sunroof':
				cmd.sunroof = el.value;
				break;
				case 'lr_door':
				cmd.doorRearLeft = el.value;
				break;
				case 'lf_door':
				cmd.doorFrontLeft = el.value;
				break;
				case 'rr_door':
				cmd.doorRearRight = el.value;
				break;
				case 'rf_door':
				cmd.doorFrontRight = el.value;
				break;
				case 'interior_light':
				cmd.interiorLights = (el.value ? 'on' : 'off');
				break;
				case 'lr_wnd':
				cmd.windowRearLeft = el.value;
				break;
				case 'lf_wnd':
				cmd.windowFrontLeft = el.value;
				break;
				case 'rr_wnd':
				cmd.windowRearRight = el.value;
				break;
				case 'rf_wnd':
				cmd.windowFrontRight = el.value;
				break;
			}
		}
	}
	else if(k === 'lights'){
		keyToSync='StatusLights';
		idToSync=blkey;
		for (var j = 0; j < chgArr.length; j++) {
			var el=chgArr[j];
			switch(el.key){
				case 'fog_rear':
				cmd.fogRear = (el.value==='on' ? true : false);
				break;
				case 'low_beam':
				cmd.lowBeam = (el.value==='on' ? true : false);
				break;
				case 'fog_front':
				cmd.fogFront = (el.value==='on' ? true : false);
				break;
				case 'high_beam':
				cmd.highBeam = (el.value==='on' ? true : false);
				break;
				case 'brake_left':
				cmd.brakeLeft = (el.value==='on' ? true : false);
				break;
				case 'park':
				cmd.parkFront = (el.value==='on' ? true : false);
				break;
				case 'brake_right':
				cmd.brakeRight = (el.value==='on' ? true : false);
				break;
				case 'brake':
				cmd.brakeCenter = (el.value==='on' ? true : false);
				break;
				case 'rear_left':
				cmd.parkRearLeft = (el.value==='on' ? true : false);
				break;
				case 'indicator_left':
				cmd.indicatorLeft = (el.value==='on' ? true : false);
				break;
				case 'indicator_right':
				cmd.indicatorRight = (el.value==='on' ? true : false);
				break;
				case 'rear_right':
				cmd.parkRearRight = (el.value==='on' ? true : false);
				break;
			}
		}
	}

	if(cmd!=={}){
		var forUpdate = { id: idToSync, schemaName: keyToSync, state: cmd};
		baasic.dynamicResourceClient.patch(keyToSync, forUpdate)
			.then(function (data) {   
					evEmitter.emit('status update', 'patched baasic.');
					console.log('patched baasic.');
                    // perform success action here 
                },
                 function (response, status, headers, config) {   
					evEmitter.emit('status update', 'error patching baasic.');
                    console.log('error: ', response);
                });
	}
}

function baasicUpdateMetering(k, changed){
	var msg=[];
	var item;
	console.log('met: ', changed);
	if(changed!==undefined && changed!==[]){
		if(k==='favorite'){
			if(changed.speed!==undefined){
				msg.push({name:'KPH',moduleName:'Speed',status:200,value:changed.speed,category:'Drive'});
			}
			if(changed.rpm!==undefined){
				msg.push({name:'RPM',moduleName:'Speed',status:200,value:changed.rpm,category:'Drive'});
			}
			if(changed.rangeleft!==undefined){
				msg.push({name:'RangeLeft',moduleName:'State',status:200,value:changed.rangeleft,category:'Drive'});
			}
			if(changed.tempoutside!==undefined){
				msg.push({name:'TempOutside',moduleName:'Temperature',status:200,value:changed.tempoutside,category:'ambient'});
			}
			if(changed.tempcoolant!==undefined){
				msg.push({name:'TempCoolant',moduleName:'Temperature',status:200,value:changed.tempcoolant,category:'ambient'});
			}
			if(changed.total!==undefined){
				msg.push({name:'Total',moduleName:'Mileage',status:200,value:changed.total,category:'mileage'});
			}
		}
	}
	if(msg.length>0){
		baasic.meteringClient.batch.create(msg)
			.then(function (data) {   
				console.log('sent to baasic.');
				evEmitter.emit('status update', 'sent to baasic.');

                // perform success action here 
            },
             function (err) {   
                 // perform error handling here 
				evEmitter.emit('status update', 'error sending to baasic.');
				console.log('Err sending to baasic: ', err);
            });
	}
}

function padLeft(s, n){
	return String("0".repeat(n+1) + s).slice(-n);
}

module.exports = {

	init: function(baasicapp, evemitter, busserver) {
		bus = busserver;
		baasic = baasicapp;
		evEmitter = evemitter;
		loginToBaasic();
	},

	emitBaasic: function(k, v){
		 emitBaasic(k, v);
	}
};
