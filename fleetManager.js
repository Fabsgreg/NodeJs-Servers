/**
 * Created by gregoire frezet on 07/07/2016.
 */
 
require('events').EventEmitter.prototype._maxListeners = 0;

require('log-timestamp');
ProtoBuf = require("protobufjs");
path = require("path");

const SERVER = 'server';
const BROADCAST = 'broadcast';


var builder_general = ProtoBuf.loadProtoFile(path.join(__dirname, "ressource", "general.proto"));
var Position = builder_general.build("Position");
var AndroidMission = builder_general.build("AndroidMission");
var onDemandMission = builder_general.build("onDemandMission");
var UpdateShuttle = builder_general.build("UpdateShuttle");


var builder_socket_com = ProtoBuf.loadProtoFile(path.join(__dirname, "ressource", "socket_com.proto"));
var Announce = builder_socket_com.build("Announce");
var NetworkEvent = builder_socket_com.build("NetworkEvent");
var NetworkStatus = builder_socket_com.build("NetworkStatus");

var NetworkEventEnum = builder_socket_com.build("NetworkStatus.network_status_t");      // Get value
//var sourceTypeName = ProtoBuf.Reflect.Enum.getName(NetworkEventEnum, 0);              // Get name



///////////////////////////////// MySQL DB Trigger ///////////////////////////////////

var MySQLEvents = require('mysql-events');
var dsn = {
    host     : 'localhost',
    user     : 'root',
    password : 'root',
};
var myCon = MySQLEvents(dsn);

var event1 = myCon.add(
    'navyatraveller.request',
    function (oldRow, newRow) {
        //row inserted 
        if (oldRow === null) {
            // New request added
            if (newRow.fields.state == 1) {
                console.log("On-demand mission request added");

                // Find Fm socket
                var index = arrayObjectIndexOf(fm, newRow.fields.FM, 'name');
                if (index != -1) {
                    // Create message
                    var response = new onDemandMission;
                    response.client = newRow.fields.phone_number;
                    response.start = newRow.fields.start;
                    response.end = newRow.fields.end;

                    // Send mission to the corresponding FM
                    fm[index].socket.send({ tag: 'onDemandMission', myData: response.encodeAB(), id: 0, emitter: SERVER, ack: false });
                    console.log("Server has sent onDemandMission to "+ newRow.fields.FM +"");
                }
                else {
                    console.log(""+ newRow.fields.FM +" is currently not connected");
                }
            }
        }

        //row deleted 
        if (newRow === null) {
        }

        //row updated 
        if (oldRow !== null && newRow !== null) {
            // Request accepted
            if (newRow.fields.state == 2) {
                // Find shuttle
                var index = arrayObjectIndexOf(shuttle, newRow.fields.shuttle_name, 'name');
                if (index != -1) {
                    // Create message
                    var response = new onDemandMission;
                    response.client = newRow.fields.phone_number;
                    response.bluetooth_address = newRow.fields.bluetooth_address;

                    // Send mission to the corresponding shuttle
                    shuttle[index].socket.send({ tag: 'onDemandMission', myData: response.encodeAB(), id: 0, emitter: SERVER, ack: false });
                    console.log("Server has sent onDemandMission to "+ newRow.fields.shuttle_name +"");
                }
                else {
                    console.log(""+ newRow.fields.shuttle_name +" is currently not connected");
                }
            }
            // Shuttle unavailable
            else if (newRow.fields.state == 6) {
                sendMessageToAndroidServer('shuttleUnavailable', SERVER, undefined, newRow.fields.phone_number);
            }
        }
    }
);


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

        // Send shuttle location to the Android server
        var msg = UpdateShuttle.decode(data["myData"]);

        var index = arrayObjectIndexOf(shuttle, socket, 'socket');
        if (index != -1) {
            sendMessageToAndroidServer('Position', shuttle[index].name, msg.location, BROADCAST);
        }
        else {
            console.log("UpdateShuttle to Android has failed")
        }   
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


    socket.on('journeyCompleted', function(data, ack) {
        sendMessageToAndroidServer('journeyCompleted', SERVER, undefined, data["receiver"]);
    });
	

    socket.on('shuttleArrived', function(data, ack) {
        sendMessageToAndroidServer('shuttleArrived', SERVER, undefined, data["receiver"]);
    });


	socket.on('disconnect', function() {
        var index = arrayObjectIndexOf(shuttle, socket, 'socket');
        if ((index != -1) && (isAndroidServerConnected == true)) {
            Androidsocket.emit('shuttleDisconnected', { myData: shuttle[index].name, receiver: BROADCAST, emitter: SERVER});
        }

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

    socket.on('MissionState', function(data, ack) {
		forwardMessage('MissionState', 'FM', shuttle, fm, socket, data, ack);
    });


    socket.on('Mission', function(data, ack) {
		forwardMessage('Mission', 'FM', shuttle, fm, socket, data, ack);
    });


	socket.on('Announce', function(data, ack) {
		announceMessage('FM', shuttle, fm, socket, data, ack);
    });


	socket.on('AndroidMission', function(data, ack) {
        var msg = AndroidMission.decode(data["myData"]);

        var index = arrayObjectIndexOf(fm, socket, 'socket');
        if (index != -1) {
            sendMessageToAndroidServer('AndroidMission', fm[index].name, msg, data["receiver"]);
            console.log('FM Fm1 has sent AndroidMission to ' + data["receiver"] + '');
        }
        else {
            console.log("AndroidMission to Android has failed")
        }
        
    });


	socket.on('disconnect', function() {
        disconnectMessage("FM", shuttle, fm, socket);
	});
	

    socket.on('ack', function(data, ack) {
		forwardAck('FM', shuttle, fm, socket, data, ack);
    });
});


///////////////////////////////////////////////////// Android server client //////////////////////////////////////////////////////////////////////////////

var io = require('socket.io-client');
var Androidsocket = io.connect('http://localhost:3009', {reconnect: true});
var isAndroidServerConnected = false;

// Add a connect listener
Androidsocket.on('connect', function (socket) {
    isAndroidServerConnected = true;
    console.log('Connected to fmServer');
});

Androidsocket.on('disconnect', function (socket) {
    isAndroidServerConnected = false;
    console.log('fmServer disconnected');
});


///////////////////////////////////////////////////// Globlal functions //////////////////////////////////////////////////////////////////////////////

function findID(receiverName, decodedAnnounceMessage) {
    for (a = 0; a < decodedAnnounceMessage.status.length; ++a) {
        if (decodedAnnounceMessage.status[a].device == receiverName) {
            return decodedAnnounceMessage.status[a].last_cmd_id;
        }
    }
    return 0;
}

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
            receiverArray[i].socket.send({ tag: 'ack', id: ID, emitter: data["emitter"]});
        }
        console.log(''+emitterName+' ' + thisName + ' has acked '+ ID +' from BROADCAST');
    }
    else {
        var index = arrayObjectIndexOf(receiverArray, receiver, 'name');
        if (index != -1) {
            receiverArray[index].socket.send({ tag: 'ack', id: ID, emitter: data["emitter"]});
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

    emitterArray.push({socket: socket, name: msg.status[0].device})
    console.log(''+emitterName+' connected : id = ' + socket.id + ', name = ' + msg.status[0].device + '');

    var response = new NetworkEvent;
    response.status.push(msg.status[0]);
    for (i = 0; i < otherArray.length; ++i) {
        otherArray[i].socket.send({ tag: 'NetworkEvent', myData: response.encodeAB() });
        console.log('NetworkEvent ('+msg.status[0].device+': '+ProtoBuf.Reflect.Enum.getName(NetworkEventEnum, msg.status[0].value)+' and last id acked: ' + findID(otherArray[i].name, msg) + ') to '+otherArray[i].name+'');
    }

    var ownResponse = new NetworkEvent;
    if (otherArray.length != 0)
    {
        for (i = 0; i < otherArray.length; ++i) {
            var Nstatus = new NetworkStatus;
            Nstatus.device = otherArray[i].name;
            Nstatus.value = "RECONNECTED";
            ownResponse.status.push(Nstatus);
            console.log('NetworkEvent ('+Nstatus.device+': '+Nstatus.value+') to '+msg.status[0].device+'');
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

function sendMessageToAndroidServer(messageName, emitter, protoData, receiver) {
    if (isAndroidServerConnected == true) {
        if (protoData != undefined) {
            Androidsocket.emit(messageName, { myData: protoData.encodeHex(), receiver: receiver, emitter: emitter});
        }
        else {
            Androidsocket.emit(messageName, { receiver: receiver, emitter: emitter});
        }
        console.log('Server has sent '+ messageName +' to AndroidServer');
    }
    else {
        console.log('Android server is not connected');
    }
}