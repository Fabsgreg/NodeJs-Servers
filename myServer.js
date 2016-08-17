/**
 * Created by gregoire frezet on 14/04/2016.
 */
 
require('log-timestamp');

 // Set infinite listeners
require('events').EventEmitter.prototype._maxListeners = 0;

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
				var sql11 = 'INSERT INTO request (start, end, line, duration, distance, phone_number, bluetooth_address, state) VALUES ('+ mysql.escape(data["start"]) +', '+ mysql.escape(data["end"]) +', '+ mysql.escape(data["line"]) +', '+ mysql.escape(data["duration"]) +', '+ mysql.escape(data["distance"]) +', '+ mysql.escape(data["phone_number"]) +', '+ mysql.escape(data["bluetooth_address"]) +',4)';
				databaseRequest(socket, sql11, null);
				socket.emit("journeyRefused");
				return;
			}

			// Save the journey request on Database
			var sql2 = 'INSERT INTO request (start, end, line, duration, distance, phone_number, bluetooth_address, state) VALUES ('+ mysql.escape(data["start"]) +', '+ mysql.escape(data["end"]) +', '+ mysql.escape(data["line"]) +', '+ mysql.escape(data["duration"]) +', '+ mysql.escape(data["distance"]) +', '+ mysql.escape(data["phone_number"]) +', '+ mysql.escape(data["bluetooth_address"]) +','+ mysql.escape(data["state"]) +')';
			connection.query(sql2, function(err, results2, field2){
				if (err) {
					connection.release();
					console.log(err);
					return;
				}
				
				// Retrieve Shuttles, depend on line selected
				var sql3 = 'SELECT * FROM shuttle WHERE line_name = ' + mysql.escape(data["line"]);
				connection.query(sql3, function(err, results3, field3){
					if (err) {
						connection.release();
						console.log(err);
						return;
					}
					
					if (results3.length == 0) {
						 socket.emit("shuttleUnavailable");
						 return;
					}
					
					for (i = 0; i < results3.length; i++) { 
						if (results3[0].state == 1) {
							
							
							var sql4 = 'SELECT station_id FROM station WHERE name = ' + mysql.escape(data["start"]);
							connection.query(sql4, function(err, results4, field4){
								if (err) {
									connection.release();
									console.log(err);
									return;
								}
								
								var sql5 = 'SELECT station_id FROM station WHERE name = ' + mysql.escape(data["end"]);
								connection.query(sql5, function(err, results5, field5){
									connection.release();
									
									if (err) {
										console.log(err);
										return;
									}
									
									var index = arma_names.indexOf(results3[0].name);
									if (index == -1)
									{
										//nameFIFO.push(results3[0].name);
										//dataFIFO.push({ tag: 'journeyAccepted', myData: {startStation: data["start"], endStation: data["end"], id: '' + socket.id + '', phone_number: data["phone_number"], start_id: results4, end_id: results5 }});
									}
									else
									{
										arma_clients[index].send({ tag: 'journeyAccepted', myData: {startStation: data["start"], endStation: data["end"], id: '' + socket.id + '', phone_number: data["phone_number"], bluetooth_address: data["bluetooth_address"], start_id: results4[0], end_id: results5[0] }});
										//arma_clients[index].emit("journeyAccepted",{startStation: data["start"], endStation: data["end"], id: '' + socket.id + '', phone_number: data["phone_number"]});
									}
									socket.emit("journeyAccepted");

									var sql31 = 'UPDATE shuttle SET state = 0 WHERE name = "' + results3[0].name + '"';
									var sql32 = 'UPDATE request SET state = 2, shuttle_name = "' + results3[0].name + '" WHERE request.phone_number = '+ mysql.escape(data["phone_number"]) +' ORDER BY request.date DESC LIMIT 1';
									databaseRequest(null, sql31, null);
									databaseRequest(null, sql32, null);
								});	
							});
						}
						else {
							var sql33 = 'UPDATE request SET state = 6, shuttle_name = "' + results3[0].name + '" WHERE request.phone_number = '+ mysql.escape(data["phone_number"]) +' ORDER BY request.date DESC LIMIT 1';
							databaseRequest(null, sql33, null);
							socket.emit("shuttleUnavailable");
						}
					}	
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

function updateClient(socket, data) {
    
    pool.getConnection(function(err,connection){
        if (err) {
          console.log(err);
          return;
        }   

        console.log('connected as id ' + connection.threadId);
        
		// Find last journey
		var sql1 = 'SELECT * FROM request WHERE request.phone_number = '+ data["phone_number"] +' ORDER BY request.date DESC LIMIT 1';
		connection.query(sql1 ,function(err, results1, field1){
			if (err) {
				console.log(err);
				connection.release();
				return;
			}
							
			if (results1.length == 0) {
				connection.release();
				return;
			}

			// Find client
			var sql2 = 'SELECT * FROM client WHERE phone_number = ' + mysql.escape(data["phone_number"]);	
			connection.query(sql2 ,function(err, results2, field2){
				if (err) {
					console.log(err);
					connection.release();
					return;
				}
				
				if (results2.length == 0) {
					connection.release();
					return;
				}
				
				var duration = results2[0].duration + results1[0].duration;
				var distance = results2[0].distance + results1[0].distance;
				var nbr_travel = results2[0].nbr_travel + 1;
				
				// Update client
				var sql3 = 'UPDATE client SET duration = ' + duration + ', distance = ' + distance + ', nbr_travel = ' +  nbr_travel + ' WHERE phone_number = ' + mysql.escape(data["phone_number"]);
				connection.query(sql3 ,function(err, results3, field3){
					connection.release();
					if (err) {
						console.log(err);
						return;
					}
					socket.emit('journeyCompleted');
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

function journeyAborted(socket, data) {
    
    pool.getConnection(function(err,connection){
        if (err) {
          console.log(err);
          return;
        }   

        console.log('connected as id ' + connection.threadId);
        
		// Find Client
		var sql1 = 'SELECT * FROM client WHERE phone_number = ' + mysql.escape(data["phone_number"]);
		connection.query(sql1 ,function(err, results1, field1){
			if (err) {
				console.log(err);
				connection.release();
				return;
			}
			
			var penalization = results1[0].penalization + 1;
			
			// Update client
			var sql2 = 'UPDATE client SET penalization = ' + penalization + ' WHERE phone_number = ' + mysql.escape(data["phone_number"]);
			connection.query(sql2 ,function(err, results2, field2){
				if (err) {
					console.log(err);
					connection.release();
					return;
				}
				
				// Find Shuttle
				var sql3 = 'SELECT * FROM request WHERE phone_number = '+ mysql.escape(data["phone_number"]) +' ORDER BY request.date DESC LIMIT 1';
				connection.query(sql3 ,function(err, results3, field3){
					if (err) {
						console.log(err);
						connection.release();
						return;
					}
					
					// Update Shuttle
					var sql4 = 'UPDATE shuttle SET state = 1 WHERE name = "' + results3[0].shuttle_name + '"';
					connection.query(sql4 ,function(err, results4, field4){
						if (err) {
							console.log(err);
							connection.release();
							return;
						}
						
						var index = arma_names.indexOf(results3[0].shuttle_name);
						if (index == -1)
						{
							nameFIFO.push(results3[0].shuttle_name);
							dataFIFO.push({ tag: 'journeyAborted', myData: 0});
						}
						else
						{
							arma_clients[index].send({ tag: 'journeyAborted' });
							//arma_clients[index].emit("journeyAborted");
						}
						
						// Update request
						var sql5 = 'UPDATE request SET state = 5 WHERE request.phone_number = '+ mysql.escape(data["phone_number"]) +' ORDER BY request.date DESC LIMIT 1';
						connection.query(sql5 ,function(err, results5, field5){
							connection.release();
							if (err) {
								console.log(err);
								return;
							}
							socket.emit("journeyAborted");
						});
					});
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

////////////////////////////// TEST  //////////////////////////////////////

var io_test = require('socket.io').listen(2000);
io_test.set('heartbeat timeout', 5000);
io_test.set('heartbeat interval', 1000);
console.log("Listening test on port " + 2000);

io_test.on("connection", function(socket){
	
	console.info('New test detected : '+ socket.id);
	
	 socket.on('mess', function(data, ack) {
			if (ack != undefined) {
				ack('ack');
			}
			console.log("received" + data["in"]);
			//socket.send({ tag: 'test' });
			socket.send({ tag: 'test', myData: {test1: 26, test2: 'toto' } });
	});
	
	 socket.on('disconnect', function() {
		 console.log("disconnected");
	 });
	
});

//////////////////////////////////// ARMA ////////////////////////////////////////////////


var arma_port = 3000;
var arma_clients = [];
var arma_names = [];
var dataFIFO = [];
var nameFIFO = [];

var io_arma = require('socket.io').listen(arma_port);
io_arma.set('heartbeat timeout', 5000);
io_arma.set('heartbeat interval', 6000);
console.log("Listening arma on port " + arma_port);

/* Socket.IO events */
io_arma.on("connection", function(socket){
	
    arma_clients.push(socket);
    console.info('New arma detected : '+ socket.id);
    
    socket.on('updateState', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

		if (data["shuttle_state"] == 0) {
			var sql = 'UPDATE shuttle SET state = 0 WHERE name = "' + data["name"] + '"';
			databaseRequest(null, sql, null);
		}
		else {
			var sql = 'UPDATE shuttle SET state = 1 WHERE name = "' + data["name"] + '"';
			databaseRequest(null, sql, null);
		}
	});
	
	// Associate a shuttle name with a socket at each connection
	socket.on('nameUpdate', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

		var index = arma_clients.indexOf(socket);
		arma_names[index] = data["name"];
		
		console.info('New arma connected : id = ' + socket.id + ', name = ' + data["name"] + '');
		
		while(nameFIFO.indexOf(data["name"]) != -1)
		{
			var index = nameFIFO.indexOf(data["name"]);
			arma_clients[index].send(dataFIFO[index]);
			nameFIFO.splice(index, 1);
			dataFIFO.splice(index, 1);
			console.info('Request sent from FIFO stack');
		}
	

    });
	
	// Send its position to all users connected
	socket.on('positionUpdate', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

		for(var client in device_numbers) {
			var index = Object.keys(device_numbers).indexOf(client);
			device_clients[index].volatile.emit('position', data);
		}
		
		//~ for (i = 0; i < device_numbers.length; i++) { 
			//~ //console.log(data);
			//~ device_clients[i].emit('position', data);
		//~ }
    });
	
	// Inform user that the current journey is completed
	socket.on('journeyCompleted', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

		var client = device_clients.find(function findById(_socket) {
			return _socket.id === data["id"];
		});
		var index = arma_clients.indexOf(socket);
		var sql1 = 'UPDATE shuttle SET state = 1 WHERE name = "' + arma_names[index] + '"';
		var sql2 = 'UPDATE request SET state = 3 WHERE request.phone_number = '+ data["phone_number"] +' ORDER BY request.date DESC LIMIT 1';
		databaseRequest(null, sql1, null);
		databaseRequest(null, sql2, null);
		updateClient(client, data)
    });
	
	// When socket disconnects, remove it from the list:
    socket.on('disconnect', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

        var index = arma_clients.indexOf(socket);
        if (index != -1) {
			console.info('Arma disconnected : id = ' + socket.id + ', name = ' + arma_names[index] + '');
			for (i = 0; i < device_clients.length; i++) { 
				device_clients[i].emit('shuttleDisconnected', arma_names[index]);
			}
			var sql = 'UPDATE shuttle SET state = 0 WHERE name = "' + arma_names[index] + '"';
			databaseRequest(null, sql, null);
			arma_clients.splice(index, 1);
			arma_names.splice(index, 1);
        }
    });
	
	// Inform user that a shuttle has arrived
	socket.on('shuttleArrived', function(data, ack) {
		if (ack != undefined) {
			ack('ack');
		}

		var client = device_clients.find(function findById(_socket) {
			return _socket.id === data["id"];
		});
		client.emit("shuttleArrived");
	});
	
});



/////////////////////////////// DEVICES /////////////////////////////////////////////

var device_port = 3001;
var device_clients = [];
var device_numbers = [];
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
	
    device_clients.push(socket);
    console.info('New device detected : '+ socket.id);
	
	// Associate a phone number with a socket at each connection
	socket.on('nameUpdate', function(data) {
		var index = device_clients.indexOf(socket);
		device_numbers[index] = data["phone_number"];
		
		
		//device_numbers.push(data["phone_number"]);
		console.info('New device connected : id = ' + socket.id + ', number = ' + data["phone_number"] + '');
    });
	
	// When socket disconnects, remove it from the list:
  	socket.on('disconnect', function() {
        var index = device_clients.indexOf(socket);
        if (index != -1) {
			console.info('Device disconnected : id = ' + socket.id + ', number = ' + device_numbers[index] + '');
			device_clients.splice(index, 1);
			device_numbers.splice(index, 1);
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
	
	// Handle journey request sent by the user
	socket.on('journeyRequest', function(data) {
		console.log("journeyRequested");
		journeyRequest(socket, data);
	});
	
	// Signing up user on DB
	socket.on('signUpRequest', function(data) {	
		signUpRequest(socket,data);
	});
	
	// Send back an email to the user with its password
	socket.on('passForgotRequest', function(data) {	
		passForgotRequest(socket,data);
	});
	
	// Signing in user on DB
	socket.on('signInRequest', function(data) {	
		signInRequest(socket,data);
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
	
	// Handle journey abort request sent by the user
	socket.on('journeyAborted', function(data) {
		journeyAborted(socket, data);	
	});

});





