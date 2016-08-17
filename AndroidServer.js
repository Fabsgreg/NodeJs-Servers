/**
 * Created by gregoire frezet on 08/10/2016.
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

///////////////////////////////// MySQL DB Request ///////////////////////////////////

var mysql     =    require('mysql');
var pool      =    mysql.createPool({
    connectionLimit : 0, //important
    host     : 'localhost',
    user     : 'root',
    password : 'root',
    database : 'navyatraveller',
    debug    :  false
});

function databaseRequest(socket, req, tag1) {
    
    pool.getConnection(function(err,connection){
        if (err) {
          console.log(err);
          return;
        }   

        console.log('connected as id ' + connection.threadId);
        
        connection.query(req ,function(err, results, field){
            connection.release();
			if (err) {
				console.log(err);
				return;
			}
            else if((!err) && (tag1 != null)) {		
				socket.emit(tag1,results);
            }
        });

        connection.on('error', function(err) {
			connection.release();			
            console.log(err);
            return;     
        });
  });
}

function signUpRequest(socket, data) {
	pool.getConnection(function(err,connection){
        if (err) {
          console.log(err);
          return;
        }
		
		console.log('connected as id ' + connection.threadId);
		
		// Find duplicate result
		var sql1 = 'SELECT * FROM client WHERE (phone_number = ' + mysql.escape(data["phone_number"]) + ') OR (email = ' + mysql.escape(data["email"]) + ')';
		connection.query(sql1 ,function(err, results1, field1){
			if (err) {
				connection.release();
				console.log(err);
				return;
			}
						
			if (results1.length != 0) {
				connection.release();
				if (results1[0].phone_number == data["phone_number"]) {
					socket.emit("phoneNumberError");
				}
				else if (results1[0].email == data["email"]) {
					socket.emit("emailError");
				}
				return;
			}
			
			// Sign up client
			var sql2 = 'INSERT INTO client (first_name, last_name, phone_number, email, password, duration, distance, nbr_travel, state, penalization) VALUES (' + mysql.escape(data["first_name"]) + ', ' + mysql.escape(data["last_name"]) + ', ' + mysql.escape(data["phone_number"]) + ', ' + mysql.escape(data["email"]) + ', ' + mysql.escape(data["password"]) + ', 0.0, 0.0, 0, 1, 0)';	
			connection.query(sql2 ,function(err, results2, field2){
				connection.release();
				if (err) {
					console.log(err);
					return;
				}
				socket.emit("signUpSuccessful");
			});
        });
			
		connection.on('error', function(err) {
			connection.release();			
            console.log(err);
            return;     
        });	
	});
}

function passForgotRequest(socket, data) {
	pool.getConnection(function(err,connection){
        if (err) {
          console.log(err);
          return;
        }
		
		console.log('connected as id ' + connection.threadId);
		
		// Find email
		var sql1 = 'SELECT * FROM client WHERE email = ' + mysql.escape(data["email"]);
		connection.query(sql1 ,function(err, results1, field1){
			connection.release();
			if (err) {
				console.log(err);
				return;
			}
						
			if (results1.length == 0) {
				socket.emit("emailNotFound");
			}
			else {
				sendMail("" + data ["email"] + "", results1[0].password, socket, "recipientRejected")
				socket.emit("emailSent");
			}
        });
			
		connection.on('error', function(err) {
			connection.release();			
            console.log(err);
            return;     
        });	
	});
}

function signInRequest(socket, data) {
	pool.getConnection(function(err,connection){
        if (err) {
          console.log(err);
          return;
        }
		
		console.log('connected as id ' + connection.threadId);
		
		// Find if the email alerady exist
		var sql1 = 'SELECT * FROM client WHERE (email = ' + mysql.escape(data["email"]) + ') AND (password = ' + mysql.escape(data["password"]) + ')';
		connection.query(sql1 ,function(err, results1, field1){
			if (err) {
				connection.release();
				console.log(err);
				return;
			}
							
			if (results1.length == 0) {
				connection.release();
				socket.emit("signInFailed");
				return;
			}

			// Check phone number too
			var sql2 = 'SELECT * FROM client WHERE (phone_number = ' + mysql.escape(data["phone_number"]) + ') AND (email = ' + mysql.escape(data["email"]) + ')';
			console.log(sql2);
			connection.query(sql2 ,function(err, results2, field2){
				connection.release();
				if (err) {
					console.log(err);
					return;
				}
				
				if (results2.length == 0) {
					socket.emit("phoneNumberError");
				}
				else {
					// Update client
					var sql21 = 'UPDATE client SET state = 1 WHERE email = ' + mysql.escape(data["email"]) + '';
					databaseRequest(null, sql21,null);
					socket.emit("signInSuccessful");
				}	
			});		
						
        });
			
		connection.on('error', function(err) {
			connection.release();
            console.log(err);
            return;     
        });	
	});
}

function journeyRequest(socket, data) {
	pool.getConnection(function(err,connection){
        if (err) {
          console.log(err);
          return;
        }
		
		console.log('connected as id ' + connection.threadId);
				
		// Check user authorization
		var sql1 = 'SELECT * FROM client WHERE phone_number = ' + mysql.escape(data["phone_number"]);
		connection.query(sql1, function(err, results1, field1){
			if (err) {
				connection.release();
				console.log(err);
				return;
			}
			
			if (results1[0].penalization >= penalizationMax) {
				connection.release();
				var sql11 = 'INSERT INTO request (start, end, line, phone_number, bluetooth_address, state) VALUES ('+ mysql.escape(data["start"]) +', '+ mysql.escape(data["end"]) +', '+ mysql.escape(data["line"]) +', '+ mysql.escape(data["phone_number"]) +', '+ mysql.escape(data["bluetooth_address"]) +', 4)';
				databaseRequest(socket, sql11, null);
				socket.emit("journeyRefused");
				return;
			}

            // Get the FM of the corresponding line
            var sql2 = 'SELECT FM FROM line WHERE name = ' + mysql.escape(data["line"]);
            connection.query(sql2, function(err, results2, field2){
                if (err) {
                    connection.release();
                    console.log(err);
                    return;
                }

                // Save the journey request in the Database
                var sql3 = 'INSERT INTO request (start, end, line, phone_number, bluetooth_address, state, FM) VALUES ('+ mysql.escape(data["start"]) +', '+ mysql.escape(data["end"]) +', '+ mysql.escape(data["line"]) +', '+ mysql.escape(data["phone_number"]) +', '+ mysql.escape(data["bluetooth_address"]) +', 1, "'+ results2[0].FM +'")';
                connection.query(sql3, function(err, results3, field3){
                    if (err) {
                        connection.release();
                        console.log(err);
                        return;
                    }
                    connection.release();
                });
            });		
		});
			
		connection.on('error', function(err) {
			connection.release();			
            console.log(err);
            return;     
        });	
	});
}


//////////////////////////////////// Gmail Account //////////////////////////////////

var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
//var transporter = nodemailer.createTransport(smtpTransport(options));

var transporter = nodemailer.createTransport('smtps://developer.navya%40gmail.com:ntckgrpoleicmtpw@smtp.gmail.com');

var options = {
	service: 'gmail',
	auth: {
		user: 'developer.navya@gmail.com',
		pass: 'kkugfbhtqhwxbwox'
	}
};
	
function sendMail (dest, pass, socket, tag) {
	
	// Setup e-mail data with unicode symbols
	var mailOptions = {
		from: 'developer.navya@gmail.com', 
		to: dest, 
		subject: 'Navya Traveller password recovery', 
		text: 'Hi there,\n\n\rYou recently requested your password for your Navya Traveller account.\n\rPassword : ' + pass + '\n\rTo keep your account secure, please change your password as soon as you will be re-connected.\n\n\n\rThanks,\n\rThe Navya Team',
	};

	// Send mail with its defined transport object
	transporter.sendMail(mailOptions, function(error, response){
		if(error){
			socket.email(tag);
			console.log(error);
		}
		if (response){
			console.log(response);
		}
	});
}


/////////////////////////////// DEVICES /////////////////////////////////////////////


var device_port = 3010;
var device = [];
var penalizationMax = 500;


var https = require('https');
var fs = require('fs');
var socketio = require('socket.io');

var SSLoptions = {
	key: fs.readFileSync('/home/pi/Desktop/Servers/certificate/file.pem', 'utf8'),
	cert: fs.readFileSync('/home/pi/Desktop/Servers/certificate/file.crt', 'utf8')
};

var server = https.createServer(SSLoptions).listen(device_port);
var io_device = socketio.listen(server);


io_device.set('heartbeat timeout', 3000);
io_device.set('heartbeat interval', 6000);
console.log("Listening devices on port " + device_port);

/* Socket.IO events */
io_device.on("connection", function(socket){
	
	// Associate a phone number with a socket at each connection
	socket.on('nameUpdate', function(data) {
        device.push({socket: socket, name: data["phone_number"]})
		
		console.info('New device connected : id = ' + socket.id + ', number = ' + data["phone_number"] + '');
    });

    // When socket disconnects, remove it from the list:
    socket.on('disconnect', function() {
        var index = arrayObjectIndexOf(device, socket, 'socket');

        if (index != -1) {
            console.info('Device disconnected : id = ' + socket.id + ', number = ' + device[index].name + '');
            device.splice(index, 1);
        }
        else {
            console.info('Device disconnected : id = ' + socket.id + ', number = ERROR');
        }
    });

    	// Return all stations from BDD to the device
	socket.on('stationRequest', function() {
		var sql = 'SELECT * from station';
		databaseRequest(socket, sql, "stationReceived");
	});
	
	// Return all lines from BDD to the device
	socket.on('lineRequest', function() {
		var sql = 'SELECT * from line';
		databaseRequest(socket, sql, "lineReceived");
	});

    // Signing up user on DB
	socket.on('signUpRequest', function(data) {	
		signUpRequest(socket,data);
	});

    socket.on('signInRequest', function(data) {	
		signInRequest(socket,data);
	});
	
	// Send back an email to the user with its password
	socket.on('passForgotRequest', function(data) {	
		passForgotRequest(socket,data);
	});

    	// Retrieve history data of the user
	socket.on('updateAccountData', function(data) {
		var sql = 'SELECT * FROM client WHERE phone_number = ' + mysql.escape(data["phone_number"]);
		databaseRequest(socket, sql, "accountDataUpdated");
	});
	
	// Update personal information of the user
	socket.on('changeRequest', function(data) {
		var sql = 'UPDATE client SET first_name = ' + mysql.escape(data["first_name"]) + ', last_name = ' + mysql.escape(data["last_name"]) + ', email = ' +  mysql.escape(data["email"]) + ', password = ' + mysql.escape(data["password"]) + ' WHERE phone_number = ' + mysql.escape(data["phone_number"]);
		databaseRequest(socket, sql, null);
	});
	
	// Disconnect an account
	socket.on('accountDisconnected', function(data) {
		var sql = 'UPDATE client SET state = 0 WHERE phone_number = ' + mysql.escape(data["phone_number"]);
		databaseRequest(socket, sql, null);
	});

    // Handle journey request sent by the user
	socket.on('journeyRequest', function(data) {
		console.log("journeyRequested");
		journeyRequest(socket, data);
	});

});



///////////////////////////////////////////////////// FM server connection //////////////////////////////////////////////////////////////////////////////

const fmServer_port = 3009;
var io_fmServer= require('socket.io').listen(fmServer_port);

io_fmServer.set('heartbeat timeout', 1000);
io_fmServer.set('heartbeat interval', 2000);
console.log("Listening FM server on port " + fmServer_port);

var fmServer = undefined;

io_fmServer.on("connection", function(socket){

	fmServerConnectionProcess(socket);

    socket.on('Position', function(data) {
		sendMessageToDevice('Position',data);
	});

    socket.on('AndroidMission', function(data) {
		sendMessageToDevice('AndroidMission', data);
	});

	socket.on('journeyCompleted', function(data) {
		sendMessageToDevice('journeyCompleted', data);
		var sql = 'UPDATE request SET state = 2 WHERE phone_number = ' + data["receiver"];
		databaseRequest(socket, sql, null);
	});

	socket.on('shuttleArrived', function(data) {
		sendMessageToDevice('shuttleArrived', data);
	});

	socket.on('shuttleUnavailable', function(data) {
		sendMessageToDevice('shuttleUnavailable', data);
	});

	socket.on('shuttleDisconnected', function(data) {
		sendMessageToDevice('shuttleDisconnected', data);
	});

    socket.on('disconnect', function(data) {
        fmServer = undefined;
        console.log("fmServer disconnected");
	});
    
});


///////////////////////////////////////////////////// Globlal functions //////////////////////////////////////////////////////////////////////////////


function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === searchTerm) return i;
    }
    return -1;
}

function fmServerConnectionProcess(socket) {
    if (fmServer != undefined) {
        console.log("ERROR, a fmServer is already connected");
    }
    else {
        fmServer = socket;
        console.log("fmServer connected");
    }
}

function sendMessageToDevice(messageName, data) {
	if (data["receiver"] == BROADCAST) {
		for(var i in device) {
			device[i].socket.volatile.emit(messageName, data);
		}
	}
	else {
		// Find client
        var index = arrayObjectIndexOf(device, data["receiver"], 'name');
        if (index != -1) {
            device[index].socket.emit(messageName, data);
            console.log('Server has sent ' + messageName + ' to ' + data["receiver"] +'');
        }
        else {
            console.log("Unknown client "+ data["receiver"] +"");
        }
	}
}