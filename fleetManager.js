/**
 * Created by gregoire frezet on 07/07/2016.
 */
 
require('log-timestamp');
ProtoBuf = require("protobufjs");
path = require("path");

const SERVER = 'server';
const BROADCAST = 'broadcast';


var builder = ProtoBuf.loadProtoFile(path.join(__dirname, "ressource", "socket_com.proto"));
var Announce = builder.build("Announce");
var NetworkEvent = builder.build("NetworkEvent");
var NetworkStatus = builder.build("NetworkStatus");

var NetworkEventEnum = builder.build("NetworkStatus.network_status_t");       // Get value
//var sourceTypeName = ProtoBuf.Reflect.Enum.getName(NetworkEventEnum, 0);      // Get name


////////////////////////////// ARMA Client  //////////////////////////////////////


const io_shuttle_Port = 4000;
var io_shuttle = require('socket.io').listen(io_shuttle_Port);

io_shuttle.set('heartbeat timeout', 2000);
io_shuttle.set('heartbeat interval', 3000);
console.log("Listening test on port " + io_shuttle_Port);

var shuttle = [];

io_shuttle.on("connection", function(socket){
	
    socket.on('UpdateShuttle', function(data, ack) {
		forwardMessage('UpdateShuttle', 'Shuttle', fm, shuttle, socket, data, ack);
    });


    socket.on('Mission', function(data, ack) {
        forwardMessage('Mission', 'Shuttle', fm, shuttle, socket, data, ack);
    });


    socket.on('MissionState', function(data, ack) {
        forwardMessage('MissionState', 'Shuttle', fm, shuttle, socket, data, ack);
    });
	

	socket.on('Announce', function(data, ack) {
		announceMessage('Shuttle', fm, shuttle, socket, data, ack);
    });
	

	socket.on('disconnect', function() {
        disconnectMessage("Shuttle", fm, shuttle, socket);
	});


    socket.on('ack', function(data, ack) {
		forwardAck('Shuttle', fm, shuttle, socket, data, ack);
    });
});


////////////////////////////// FLEET_MANAGER Client  //////////////////////////////////////


const io_fm_Port = 4001;
var io_fm = require('socket.io').listen(io_fm_Port);

io_fm.set('heartbeat timeout', 2000);
io_fm.set('heartbeat interval', 3000);
console.log("Listening test on port " + io_fm_Port);

var fm = [];

io_fm.on("connection", function(socket){

    socket.on('UpdateShuttle', function(data, ack) {
		forwardMessage('UpdateShuttle', 'FM', shuttle, fm, socket, data, ack);
    });


    socket.on('MissionState', function(data, ack) {
		forwardMessage('MissionState', 'FM', shuttle, fm, socket, data, ack);
    });


    socket.on('Mission', function(data, ack) {
		forwardMessage('Mission', 'FM', shuttle, fm, socket, data, ack);
    });


	socket.on('Announce', function(data, ack) {
		announceMessage('FM', shuttle, fm, socket, data, ack);
    });
	

	socket.on('disconnect', function() {
        disconnectMessage("FM", shuttle, fm, socket);
	});
	

    socket.on('ack', function(data, ack) {
		forwardAck('FM', shuttle, fm, socket, data, ack);
    });
});



///////////////////////////////////////////////////// Globlal functions //////////////////////////////////////////////////////////////////////////////



function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === searchTerm) return i;
    }
    return -1;
}

function forwardMessage(messageName, emitterName, receiverArray, emitterArray, socket, data, ack) { 
    if (ack != undefined) {
        ack('ack');
    }
    var thisName;
    var thisIndex = arrayObjectIndexOf(emitterArray, socket, 'socket');
    if (thisIndex != -1) {
            thisName = emitterArray[thisIndex].name;
        }
    else {
        console.log(''+emitterName+' ' + socket.id + ' is unknown, on request : '+messageName+'(' + data["id"] + ')');
        return;
    }

    var receiver = data["receiver"];

    if (receiver == BROADCAST) {
        var i;
        for (i = 0; i < receiverArray.length; ++i) {
            receiverArray[i].socket.send({ tag: ''+messageName+'', myData: data["myData"], id: data["id"], emitter: data["emitter"], ack: data["ack"] });
        }
        console.log(''+emitterName+' ' + thisName + ' has sent '+messageName+'(' + data["id"] + ') to BROADCAST');
    }
    else if (receiver == SERVER) {
        console.log(''+emitterName+' ' + thisName + ' has sent '+messageName+'(' + data["id"] + ') to SERVER');
    }
    else {
        var index = arrayObjectIndexOf(receiverArray, receiver, 'name');
        if (index != -1) {
            receiverArray[index].socket.send({ tag: ''+messageName+'', myData: data["myData"], id: data["id"], emitter: data["emitter"], ack: data["ack"] });
            console.log(''+emitterName+' ' + thisName + ' has sent '+messageName+'(' + data["id"] + ') to ' + receiver + '');
        }
        else {
            console.log(''+emitterName+' ' + thisName + ' has failed to send '+messageName+'(' + data["id"] + ') to UNKNOWN (' + receiver + ')');
        }
    }
}

function forwardAck(emitterName, receiverArray, emitterArray, socket, data, ack) {
    if (ack != undefined) {
        ack('ack');
    }

    var thisName;
    var thisIndex = arrayObjectIndexOf(emitterArray, socket, 'socket');
    if (thisIndex != -1) {
            thisName = emitterArray[thisIndex].name;
    }
    else {
        console.log(''+emitterName+' ' + socket.id + ' is unknown, on request : ack');
        return;
    }

    var receiver = data["receiver"];
    var ID = data["id"];

    if (receiver == BROADCAST) {
        var i;
        for (i = 0; i < receiverArray.length; ++i) {
            receiverArray[i].socket.send({ tag: 'ack', id: ID});
        }
        console.log(''+emitterName+' ' + thisName + ' has acked '+ ID +' from BROADCAST');
    }
    else {
        var index = arrayObjectIndexOf(receiverArray, receiver, 'name');
        if (index != -1) {
            receiverArray[index].socket.send({ tag: 'ack', id: ID});
            console.log(''+emitterName+' ' + thisName + ' has acked '+ ID +' from ' + receiver + '');
        }
        else {
            console.log(''+emitterName+' ' + thisName + ' has failed to ack '+ ID +' from UNKNOWN (' + receiver + ')');
        }
    }
}

function announceMessage(emitterName, otherArray, emitterArray, socket, data, ack) {
    if (ack != undefined) {
        ack('ack');
    }
    var msg = Announce.decode(data["myData"]);

    emitterArray.push({socket: socket, name: msg.status.device})
    console.log(''+emitterName+' connected : id = ' + socket.id + ', name = ' + msg.status.device + '');

    var response = new NetworkEvent;
    response.status.push(msg.status);
    for (i = 0; i < otherArray.length; ++i) {
        otherArray[i].socket.send({ tag: 'NetworkEvent', myData: response.encodeAB() });
        console.log('NetworkEvent ('+msg.status.device+': '+ProtoBuf.Reflect.Enum.getName(NetworkEventEnum, msg.status.value)+') to '+otherArray[i].name+'');
    }

    var ownResponse = new NetworkEvent;
    if (otherArray.length != 0)
    {
        for (i = 0; i < otherArray.length; ++i) {
            var Nstatus = new NetworkStatus;
            Nstatus.device = otherArray[i].name;
            Nstatus.value = "RECONNECTED";
            ownResponse.status.push(Nstatus);
            console.log('NetworkEvent ('+Nstatus.device+': '+Nstatus.value+') to '+msg.status.device+'');
        }
        socket.send({ tag: 'NetworkEvent', myData: ownResponse.encodeAB() });
    }
}

function disconnectMessage(emitterName, receiverArray, emitterArray, socket) {
    var index = arrayObjectIndexOf(emitterArray, socket, 'socket');

    if (index != -1) {
        var Nstatus = new NetworkStatus;
        Nstatus.value = "DISCONNECTED";
        Nstatus.device = emitterArray[index].name;
        var msg = new NetworkEvent;
        msg.status = Nstatus;
        for (i = 0; i < receiverArray.length; ++i) {
            receiverArray[i].socket.send({ tag: 'NetworkEvent', myData: msg.encodeAB() });
            console.log('NetworkEvent ('+Nstatus.device+': '+Nstatus.value+') to '+receiverArray[i].name+'')
        }
    
        console.log(''+emitterName+' disconnected : id = ' + socket.id + ', name = ' + emitterArray[index].name + '');
        emitterArray.splice(index, 1);
    }
    else {
        console.log(''+emitterName+' disconnected : id = ' + socket.id + ', name = ERROR');
    }
}
