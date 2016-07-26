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
//var NetworkEventEnum = builder.build("NetworkStatus.network_status_t");       // Get value
//var sourceTypeName = ProtoBuf.Reflect.Enum.getName(NetworkEventEnum, 0);      // Get name


////////////////////////////// ARMA Client  //////////////////////////////////////



const io_shuttle_Port = 4000;
var io_shuttle = require('socket.io').listen(io_shuttle_Port);

io_shuttle.set('heartbeat timeout', 5000);
io_shuttle.set('heartbeat interval', 1000);
console.log("Listening test on port " + io_shuttle_Port);

var arma_clients = [];
var arma_names = [];

io_shuttle.on("connection", function(socket){
	
    arma_clients.push(socket);

    socket.on('UpdateShuttle', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

        var thisName;
        var thisIndex = arma_clients.indexOf(socket);
        if (thisIndex != -1) {
                thisName = arma_names[thisIndex];
        }
        else {
            console.log('Shuttle ' + socket.id + ' is unknown, on request : UpdateShuttle(' + data["id"] + ')');
            return;
        }

        var receiver = data["receiver"];

        if (receiver == BROADCAST) {
            var i;
            for (i = 0; i < fm_clients.length; ++i) {
                fm_clients[i].send({ tag: 'UpdateShuttle', myData: data["myData"], id: data["id"], emitter: data["emitter"] });
            }
            console.log('Shuttle ' + thisName + ' has sent UpdateShuttle(' + data["id"] + ') to BROADCAST');
        }
        else if (receiver == SERVER) {
            console.log('Shuttle ' + thisName + ' has sent UpdateShuttle(' + data["id"] + ') to SERVER');
        }
        else {
            var index = fm_names.indexOf(receiver);
            if (index != -1) {
                //fm_clients[index].send({ tag: 'UpdateShuttle', myData: data["myData"] });
                fm_clients[index].emit('message', { tag: 'UpdateShuttle', myData: data["myData"], id: data["id"], emitter: data["emitter"] });
                console.log('Shuttle ' + thisName + ' has sent UpdateShuttle(' + data["id"] + ') to ' + receiver + '');
            }
            else {
                console.log('Shuttle ' + thisName + ' has sent UpdateShuttle(' + data["id"] + ') to UNKNOWN (' + receiver + ')');
            }
        }
    });


    socket.on('Mission', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

        var thisName;
        var thisIndex = arma_clients.indexOf(socket);
        if (thisIndex != -1) {
                thisName = arma_names[thisIndex];
            }
        else {
            console.log('Shuttle ' + socket.id + ' is unknown, on request : Mission(' + data["id"] + ')');
            return;
        }

        var receiver = data["receiver"];

        if (receiver == BROADCAST) {
            var i;
            for (i = 0; i < fm_clients.length; ++i) {
                fm_clients[i].send({ tag: 'Mission', myData: data["myData"], id: data["id"], emitter: data["emitter"] });
            }
            console.log('Shuttle ' + thisName + ' has sent Mission(' + data["id"] + ') to BROADCAST');
        }
        else if (receiver == SERVER) {
            console.log('Shuttle ' + thisName + ' has sent Mission(' + data["id"] + ') to SERVER');
        }
        else {
            var index = fm_names.indexOf(receiver);
            if (index != -1) {
                fm_clients[index].send({ tag: 'Mission', myData: data["myData"], id: data["id"], emitter: data["emitter"] });
                console.log('Shuttle ' + thisName + ' has sent Mission(' + data["id"] + ') to ' + receiver + '');
            }
            else {
                console.log('Shuttle ' + thisName + ' has sent Mission(' + data["id"] + ') to UNKNOWN (' + receiver + ')');
            }
        }
    });


    socket.on('MissionState', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

        var thisName;
        var thisIndex = arma_clients.indexOf(socket);
        if (thisIndex != -1) {
                thisName = arma_names[thisIndex];
            }
        else {
            console.log('Shuttle ' + socket.id + ' is unknown, on request : MissionState(' + data["id"] + ')');
            return;
        }

        var receiver = data["receiver"];

        if (receiver == BROADCAST) {
            var i;
            for (i = 0; i < fm_clients.length; ++i) {
                fm_clients[i].send({ tag: 'MissionState', myData: data["myData"], id: data["id"], emitter: data["emitter"] });
            }
            console.log('Shuttle ' + thisName + ' has sent MissionState(' + data["id"] + ') to BROADCAST');
        }
        else if (receiver == SERVER) {
            console.log('Shuttle ' + thisName + ' has sent MissionState(' + data["id"] + ') to SERVER');
        }
        else {
            var index = fm_names.indexOf(receiver);
            if (index != -1) {
                fm_clients[index].send({ tag: 'MissionState', myData: data["myData"], id: data["id"], emitter: data["emitter"] });
                console.log('Shuttle ' + thisName + ' has sent MissionState(' + data["id"] + ') to ' + receiver + '');
            }
            else {
                console.log('Shuttle ' + thisName + ' has sent MissionState(' + data["id"] + ') to UNKNOWN (' + receiver + ')');
            }
        }
    });
	

	socket.on('Announce', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

        var msg = Announce.decode(data["myData"]);

		var index = arma_clients.indexOf(socket);
		arma_names[index] = msg.status.device;
        console.log('Arma connected : id = ' + socket.id + ', name = ' + msg.status.device + '');

        var response = new NetworkEvent;
        response.status.push(msg.status);
        for (i = 0; i < fm_clients.length; ++i) {
             fm_clients[i].send({ tag: 'NetworkEvent', myData: response.encodeAB() });
        }

        var ownResponse = new NetworkEvent;
        var index2 = fm_clients.length;
        if (index2 != 0)
        {
            for (i = 0; i < fm_clients.length; ++i) {
                var Nstatus = new NetworkStatus;
                Nstatus.device = fm_names[i];
                Nstatus.value = "RECONNECTED";
                ownResponse.status.push(Nstatus);
            }
            socket.send({ tag: 'NetworkEvent', myData: ownResponse.encodeAB() });
        }
    });
	

	socket.on('disconnect', function() {
        var index = arma_clients.indexOf(socket);

        if (index != -1) {
            var Nstatus = new NetworkStatus;
            Nstatus.value = "DISCONNECTED";
            Nstatus.device = arma_names[index];
            var msg = new NetworkEvent;
            msg.status = Nstatus;
            for (i = 0; i < fm_clients.length; ++i) {
               fm_clients[i].send({ tag: 'NetworkEvent', myData: msg.encodeAB() });
               console.log('NetworkEvent ('+Nstatus.device+': '+Nstatus.value+') to '+fm_names[i]+'')
            }

			console.log('Arma disconnected : id = ' + socket.id + ', name = ' + arma_names[index] + '');
			arma_clients.splice(index, 1);
			arma_names.splice(index, 1);
        }
        else {
            console.log('Arma disconnected : id = ' + socket.id + ', name = ERROR');
        }
	});


    // socket.on('ack', function(data, ack) {
	// 	if (ack != undefined) {
	// 		ack('ack');
	// 	}

    //     var thisName;
    //     var thisIndex = arma_clients.indexOf(socket);
    //     if (thisIndex != -1) {
    //             thisName = arma_names[thisIndex];
    //         }
    //     else {
    //         console.log('Shuttle ' + socket.id + ' is unknown, on request : ack');
    //         return;
    //     }

    //     var receiver = data["receiver"];
    //     var ID = data["id"];

    //     if (receiver == BROADCAST) {
    //         var i;
    //         for (i = 0; i < fm_clients.length; ++i) {
    //             fm_clients[i].send({ tag: 'ack', myData: data, id: data["id"], emitter: data["emitter"] });
    //         }
    //         console.log('Fm ' + thisName + ' has acked '+ ID +' from BROADCAST');
    //     }
    //     else {
    //         var index = fm_names.indexOf(receiver);
    //         if (index != -1) {
    //             fm_clients[index].send({ tag: 'ack', myData: data, id: data["id"], emitter: data["emitter"] });
    //             console.log('Shuttle ' + thisName + ' has acked '+ ID +' from ' + receiver + '');
    //         }
    //         else {
    //             console.log('Shuttle ' + thisName + ' has acked '+ ID +' from UNKNOWN (' + receiver + ')');
    //         }
    //     }

    // });
});


////////////////////////////// FLEET_MANAGER Client  //////////////////////////////////////


const io_fm_Port = 4001;
var io_fm = require('socket.io').listen(io_fm_Port);

io_fm.set('heartbeat timeout', 5000);
io_fm.set('heartbeat interval', 1000);
console.log("Listening test on port " + io_fm_Port);

var fm_clients = [];
var fm_names = [];


io_fm.on("connection", function(socket){
	
    fm_clients.push(socket);


    socket.on('UpdateShuttle', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

        var thisName;
        var thisIndex = fm_clients.indexOf(socket);
        if (thisIndex != -1) {
                thisName = fm_names[thisIndex];
            }
        else {
            console.log('Fm ' + socket.id + ' is unknown, on request : UpdateShuttle(' + data["id"] + ')');
            return;
        }

        var receiver = data["receiver"];

        if (receiver == BROADCAST) {
            var i;
            for (i = 0; i < arma_clients.length; ++i) {
                arma_clients[i].send({ tag: 'UpdateShuttle', myData: data["myData"], id: data["id"], emitter: data["emitter"] });
            }
            console.log('Fm ' + thisName + ' has sent UpdateShuttle(' + data["id"] + ') to BROADCAST');
        }
        else if (receiver == SERVER) {
            console.log('Fm ' + thisName + ' has sent UpdateShuttle(' + data["id"] + ') to SERVER');
        }
        else {
            var index = arma_names.indexOf(receiver);
            if (index != -1) {
                arma_clients[index].send({ tag: 'UpdateShuttle', myData: data["myData"], id: data["id"], emitter: data["emitter"] });
                console.log('Fm ' + thisName + ' has sent UpdateShuttle(' + data["id"] + ') to ' + receiver + '');
            }
            else {
                console.log('Fm ' + thisName + ' has sent UpdateShuttle(' + data["id"] + ') to UNKNOWN (' + receiver + ')');
            }
        }
    });


    socket.on('MissionState', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

        var thisName;
        var thisIndex = fm_clients.indexOf(socket);
        if (thisIndex != -1) {
                thisName = fm_names[thisIndex];
            }
        else {
            console.log('Fm ' + socket.id + ' is unknown, on request : MissionState(' + data["id"] + ')');
            return;
        }

        var receiver = data["receiver"];

        if (receiver == BROADCAST) {
            var i;
            for (i = 0; i < arma_clients.length; ++i) {
                arma_clients[i].send({ tag: 'MissionState', myData: data["myData"], id: data["id"], emitter: data["emitter"] });
            }
            console.log('Fm ' + thisName + ' has sent MissionState(' + data["id"] + ') to BROADCAST');
        }
        else if (receiver == SERVER) {
            console.log('Fm ' + thisName + ' has sent MissionState(' + data["id"] + ') to SERVER');
        }
        else {
            var index = arma_names.indexOf(receiver);
            if (index != -1) {
                arma_clients[index].send({ tag: 'MissionState', myData: data["myData"], id: data["id"], emitter: data["emitter"] });
                console.log('Fm ' + thisName + ' has sent MissionState(' + data["id"] + ') to ' + receiver + '');
            }
            else {
                console.log('Fm ' + thisName + ' has sent MissionState(' + data["id"] + ') to UNKNOWN (' + receiver + ')');
            }
        }
    });


    socket.on('Mission', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

        var thisName;
        var thisIndex = fm_clients.indexOf(socket);
        if (thisIndex != -1) {
                thisName = fm_names[thisIndex];
            }
        else {
            console.log('Fm ' + socket.id + ' is unknown, on request : Mission(' + data["id"] + ')');
            return;
        }

        var receiver = data["receiver"];

        if (receiver == BROADCAST) {
            var i;
            for (i = 0; i < arma_clients.length; ++i) {
                arma_clients[i].send({ tag: 'Mission', myData: data["myData"], id: data["id"], emitter: data["emitter"] });
            }
            console.log('Fm ' + thisName + ' has sent Mission(' + data["id"] + ') to BROADCAST');
        }
        else if (receiver == SERVER) {
            console.log('Fm ' + thisName + ' has sent Mission(' + data["id"] + ') to SERVER');
        }
        else {
            var index = arma_names.indexOf(receiver);
            if (index != -1) {
                arma_clients[index].send({ tag: 'Mission', myData: data["myData"], id: data["id"], emitter: data["emitter"] });
                console.log('Fm ' + thisName + ' has sent Mission(' + data["id"] + ') to ' + receiver + '');
            }
            else {
                console.log('Fm ' + thisName + ' has sent Mission(' + data["id"] + ') to UNKNOWN (' + receiver + ')');
            }
        }
    });


	socket.on('Announce', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}
        var msg = Announce.decode(data["myData"]);

		var index = fm_clients.indexOf(socket);
		fm_names[index] = msg.status.device;
        console.log('Fm connected : id = ' + socket.id + ', name = ' + msg.status.device + '');

        var response = new NetworkEvent;
        response.status.push(msg.status);
        for (i = 0; i < arma_clients.length; ++i) {
            arma_clients[i].send({ tag: 'NetworkEvent', myData: response.encodeAB() });
        }

        var ownResponse = new NetworkEvent;
        var index2 = arma_clients.length;
        if (index2 != 0)
        {
            for (i = 0; i < arma_clients.length; ++i) {
                var Nstatus = new NetworkStatus;
                Nstatus.device = arma_names[i];
                Nstatus.value = "RECONNECTED";
             ownResponse.status.push(Nstatus);
            }
            socket.send({ tag: 'NetworkEvent', myData: ownResponse.encodeAB() });
        }
    });
	

	socket.on('disconnect', function() {
        var index = fm_clients.indexOf(socket);

        if (index != -1) {
            var Nstatus = new NetworkStatus;
            Nstatus.value = "DISCONNECTED";
            Nstatus.device = fm_names[index];
            var msg = new NetworkEvent;
            msg.status = Nstatus;
            for (i = 0; i < arma_clients.length; ++i) {
                arma_clients[i].send({ tag: 'NetworkEvent', myData: msg.encodeAB() });
                console.log('NetworkEvent ('+Nstatus.device+': '+Nstatus.value+') to '+arma_names[i]+'')
            }
        
			console.log('Fm disconnected : id = ' + socket.id + ', name = ' + fm_names[index] + '');
			fm_clients.splice(index, 1);
			fm_names.splice(index, 1);
        }
        else {
            console.log('Fm disconnected : id = ' + socket.id + ', name = ERROR');
        }
	});
	

    // socket.on('ack', function(data, ack) {
	// 	if (ack != undefined) {
	// 		ack('ack');
	// 	}

    //     var thisName;
    //     var thisIndex = fm_clients.indexOf(socket);
    //     if (thisIndex != -1) {
    //             thisName = fm_names[thisIndex];
    //         }
    //     else {
    //         console.log('Fm ' + socket.id + ' is unknown, on request : ack');
    //         return;
    //     }

    //     var receiver = data["receiver"];
    //     var ID = data["id"];

    //     if (receiver == BROADCAST) {
    //         var i;
    //         for (i = 0; i < arma_clients.length; ++i) {
    //             arma_clients[i].send({ tag: 'ack', id: data["id"], emitter: data["emitter"] });
    //         }
    //         console.log('Fm ' + thisName + ' has acked '+ ID +' from BROADCAST');
    //     }
    //     else {
    //         var index = arma_names.indexOf(receiver);
    //         if (index != -1) {
    //             arma_clients[index].send({ tag: 'ack', id: data["id"], emitter: data["emitter"] });
    //             console.log('Fm ' + thisName + ' has acked '+ ID +' from ' + receiver + '');
    //         }
    //         else {
    //             console.log('Fm ' + thisName + ' has acked '+ ID +' from UNKNOWN (' + receiver + ')');
    //         }
    //     }

    // });
});




