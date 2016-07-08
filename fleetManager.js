/**
 * Created by gregoire frezet on 07/07/2016.
 */
 
require('log-timestamp');
ProtoBuf = require("protobufjs");
path = require("path");

const SERVER = 'server';
const BROADCAST = 'broadcast';

var builder = ProtoBuf.loadProtoFile(path.join(__dirname, "ressource", "general.proto")),
    Announce = builder.build("Announce");

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
            console.log('Shuttle ' + socket.id + ' is unknown, on request : UpdateShuttle');
            return;
        }

        var receiver = data["receiver"];

        if (receiver == BROADCAST) {
            var i;
            for (i = 0; i < fm_clients.length; ++i) {
                fm_clients[i].send({ tag: 'UpdateShuttle', myData: data["myData"] });
            }
            console.log('Shuttle ' + thisName + ' requested UpdateShuttle to BROADCAST');
        }
        else if (receiver == SERVER) {
            console.log('Shuttle ' + thisName + ' requested UpdateShuttle to SERVER');
        }
        else {
            var index = fm_names.indexOf(receiver);
            if (index != -1) {
                fm_clients[index].send({ tag: 'UpdateShuttle', myData: data["myData"] });
                console.log('Shuttle ' + thisName + ' requested UpdateShuttle to ' + receiver + '');
            }
            else {
                console.log('Shuttle ' + thisName + ' requested UpdateShuttle to UNKNOWN (' + receiver + ')');
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
            console.log('Shuttle ' + socket.id + ' is unknown, on request : Mission');
            return;
        }

        var receiver = data["receiver"];

        if (receiver == BROADCAST) {
            var i;
            for (i = 0; i < fm_clients.length; ++i) {
                fm_clients[i].send({ tag: 'Mission', myData: data["myData"] });
            }
            console.log('Shuttle ' + thisName + ' requested Mission to BROADCAST');
        }
        else if (receiver == SERVER) {
            console.log('Shuttle ' + thisName + ' requested Mission to SERVER');
        }
        else {
            var index = fm_names.indexOf(receiver);
            if (index != -1) {
                fm_clients[index].send({ tag: 'Mission', myData: data["myData"] });
                console.log('Shuttle ' + thisName + ' requested Mission to ' + receiver + '');
            }
            else {
                console.log('Shuttle ' + thisName + ' requested Mission to UNKNOWN (' + receiver + ')');
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
            console.log('Shuttle ' + socket.id + ' is unknown, on request : MissionState');
            return;
        }

        var receiver = data["receiver"];

        if (receiver == BROADCAST) {
            var i;
            for (i = 0; i < fm_clients.length; ++i) {
                fm_clients[i].send({ tag: 'MissionState', myData: data["myData"] });
            }
            console.log('Shuttle ' + thisName + ' requested MissionState to BROADCAST');
        }
        else if (receiver == SERVER) {
            console.log('Shuttle ' + thisName + ' requested MissionState to SERVER');
        }
        else {
            var index = fm_names.indexOf(receiver);
            if (index != -1) {
                fm_clients[index].send({ tag: 'MissionState', myData: data["myData"] });
                console.log('Shuttle ' + thisName + ' requested MissionState to ' + receiver + '');
            }
            else {
                console.log('Shuttle ' + thisName + ' requested MissionState to UNKNOWN (' + receiver + ')');
            }
        }
    });
	

	socket.on('Announce', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

        var msg = Announce.decode(data["myData"]);

		var index = arma_clients.indexOf(socket);
		arma_names[index] = msg.id;

        console.log('Arma connected : id = ' + socket.id + ', name = ' + msg.id + '');
    });
	

	socket.on('disconnect', function() {
        var index = arma_clients.indexOf(socket);
        if (index != -1) {
			console.log('Arma disconnected : id = ' + socket.id + ', name = ' + arma_names[index] + '');
			arma_clients.splice(index, 1);
			arma_names.splice(index, 1);
        }
        else {
            console.log('Arma disconnected : id = ' + socket.id + ', name = ERROR');
        }
	});
	
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
            console.log('Fm ' + socket.id + ' is unknown, on request : UpdateShuttle');
            return;
        }

        var receiver = data["receiver"];

        if (receiver == BROADCAST) {
            var i;
            for (i = 0; i < arma_clients.length; ++i) {
                arma_clients[i].send({ tag: 'UpdateShuttle', myData: data["myData"] });
            }
            console.log('Fm ' + thisName + ' requested UpdateShuttle to BROADCAST');
        }
        else if (receiver == SERVER) {
            console.log('Fm ' + thisName + ' requested UpdateShuttle to SERVER');
        }
        else {
            var index = arma_names.indexOf(receiver);
            if (index != -1) {
                arma_clients[index].send({ tag: 'UpdateShuttle', myData: data["myData"] });
                console.log('Fm ' + thisName + ' requested UpdateShuttle to ' + receiver + '');
            }
            else {
                console.log('Fm ' + thisName + ' requested UpdateShuttle to UNKNOWN (' + receiver + ')');
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
            console.log('Fm ' + socket.id + ' is unknown, on request : MissionState');
            return;
        }

        var receiver = data["receiver"];

        if (receiver == BROADCAST) {
            var i;
            for (i = 0; i < arma_clients.length; ++i) {
                arma_clients[i].send({ tag: 'MissionState', myData: data["myData"] });
            }
            console.log('Fm ' + thisName + ' requested MissionState to BROADCAST');
        }
        else if (receiver == SERVER) {
            console.log('Fm ' + thisName + ' requested MissionState to SERVER');
        }
        else {
            var index = arma_names.indexOf(receiver);
            if (index != -1) {
                arma_clients[index].send({ tag: 'MissionState', myData: data["myData"] });
                console.log('Fm ' + thisName + ' requested MissionState to ' + receiver + '');
            }
            else {
                console.log('Fm ' + thisName + ' requested MissionState to UNKNOWN (' + receiver + ')');
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
            console.log('Fm ' + socket.id + ' is unknown, on request : Mission');
            return;
        }

        var receiver = data["receiver"];

        if (receiver == BROADCAST) {
            var i;
            for (i = 0; i < arma_clients.length; ++i) {
                arma_clients[i].send({ tag: 'Mission', myData: data["myData"] });
            }
            console.log('Fm ' + thisName + ' requested Mission to BROADCAST');
        }
        else if (receiver == SERVER) {
            console.log('Fm ' + thisName + ' requested Mission to SERVER');
        }
        else {
            var index = arma_names.indexOf(receiver);
            if (index != -1) {
                arma_clients[index].send({ tag: 'Mission', myData: data["myData"] });
                console.log('Fm ' + thisName + ' requested Mission to ' + receiver + '');
            }
            else {
                console.log('Fm ' + thisName + ' requested Mission to UNKNOWN (' + receiver + ')');
            }
        }
    });


	socket.on('Announce', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}
        var msg = Announce.decode(data["myData"]);

		var index = fm_clients.indexOf(socket);
		fm_names[index] = msg.id;

        console.log('Fm connected : id = ' + socket.id + ', name = ' + msg.id + '');
    });
	

	socket.on('disconnect', function() {
        var index = fm_clients.indexOf(socket);
        if (index != -1) {
			console.log('Fm disconnected : id = ' + socket.id + ', name = ' + fm_names[index] + '');
			fm_clients.splice(index, 1);
			fm_names.splice(index, 1);
        }
        else {
            console.log('Fm disconnected : id = ' + socket.id + ', name = ERROR');
        }
	});
	
});









	//  socket.on('mess', function(data, ack) {
	// 		if (ack != undefined) {
	// 			ack('ack');
	// 		}

	// 		var msg = Message.Person.decode(data["data"]);
	// 		console.log(msg.name);
	// 		console.log(msg.id);
	// 		console.log(msg.email);


	// 		var result = new Message.Person;
	// 		result.name = "cafe";
	// 		result.id = 56;
	// 		result.email = "toto";

    //         socket.send({ tag: 'test', myData: {data: result.encode()} });			
	// });