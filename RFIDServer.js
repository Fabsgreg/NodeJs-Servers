/**
 * Created by gregoire frezet on 28/04/2016.
 * 
 */
 
 require('log-timestamp');
 
 // Set infinite listeners
require('events').EventEmitter.prototype._maxListeners = 0;

///////////////////////////////// MySQL DB ///////////////////////////////////

var mysql     =    require('mysql');
var pool      =    mysql.createPool({
    connectionLimit : 100, //important
    host     : 'localhost',
    user     : 'root',
    password : 'root',
    database : 'navyauser',
    debug    :  false
});

function createUserRequest(socket, data) {
    
    pool.getConnection(function(err,connection){
        if (err) {
          console.log(err);
          return;
        }   

        console.log('connected as id ' + connection.threadId);
        
		var sql1 = 'SELECT * FROM user WHERE (first_name = "' + data["first_name"] + '") AND (last_name = "' + data["last_name"] + '")';
        connection.query(sql1 ,function(err, results1, field1){   
			if (err) {
				connection.release();
				console.log(err);
				return;
			}
			
			if (results1.length == 0) {
				var sql2 = 'SELECT * FROM user WHERE UID = "' + data["UID"] + '"';
				connection.query(sql2 ,function(err, results2, field2){
					
					if (err) {
						connection.release();
						console.log(err);
						return;
					}   
					
					if (results2.length == 0) {
						var sql3 = 'INSERT INTO user (first_name, last_name, access_level, UID) VALUES ("' + data["first_name"] + '", "' + data["last_name"] + '", ' + data["access_level"] + ', "' + data["UID"] + '")';
						connection.query(sql3 ,function(err, results3, field3){
					
							connection.release();
							if (err) {
								console.log(err);
								return;
							} 
							
							socket.emit("userCreated");
						});
					}
					else {
						connection.release();
						socket.emit("tagError", results2);
					}	
				});
			}
            else {
				connection.release();
				socket.emit("userError", results1);
            }
        });

        connection.on('error', function(err) {      
            console.log(err);
            return;     
        });
  });
}


function findUserRequest(socket, data) {
    
    pool.getConnection(function(err,connection){
        if (err) {
          console.log(err);
          return;
        }   

        console.log('connected as id ' + connection.threadId);
        
		var sql = 'SELECT * FROM user WHERE UID = "' + data["UID"] +'"';
        connection.query(sql ,function(err, results1, field1){ 
		
			if (err) {
				connection.release();
				console.log(err);
				return;
			}

			if (results1.length != 0) {
				var sql2 = 'INSERT INTO request (first_name, last_name, shuttle_name) VALUES ("' + results1[0].first_name + '", "' + results1[0].last_name + '", "' + data["shuttle_name"] + '")';
				connection.query(sql2 ,function(err, results2, field2){
					
					connection.release();					
					if (err) {
						console.log(err);
						return;
					}
					//socket.send({ tag: 'userFound' });
					socket.send({ tag: 'userFound', myData: results1[0] });
				});
			}
			else {
				connection.release();
				socket.send({ tag: 'userUnknown' });
			}
        });

        connection.on('error', function(err) {      
            console.log(err);
            return;     
        });
  });
}


function listUsersRequest(socket) {
    
    pool.getConnection(function(err,connection){
        if (err) {
          console.log(err);
          return;
        }   

        console.log('connected as id ' + connection.threadId);
        
		var sql = 'SELECT * FROM user';
        connection.query(sql ,function(err, results1, field1){ 
			connection.release();
			if (err) {
				console.log(err);
				return;
			}

			socket.emit("userList",results1);
		});
			
        connection.on('error', function(err) {      
            console.log(err);
            return;     
        });
  });
}

function deleteUserRequest(socket, data) {
    
    pool.getConnection(function(err,connection){
        if (err) {
          console.log(err);
          return;
        }   

        console.log('connected as id ' + connection.threadId);
        
		var sql = 'DELETE FROM user WHERE (first_name = "' + data["first_name"] + '") AND (last_name = "' + data["last_name"] + '") AND (UID = "' + data["UID"] + '") AND (access_level = "' + data["access_level"] + '")';
		connection.query(sql ,function(err, results1, field1){ 
			connection.release();
			if (err) {
				console.log(err);
				return;
			}
		});
			
        connection.on('error', function(err) {      
            console.log(err);
            return;     
        });
  });
}

//////////////////////////////////// Clients ////////////////////////////////////////////////


var port = 3002;

var io_client = require('socket.io').listen(port);
console.log("Listening clients on port " + port);

/* Socket.IO events */
io_client.on("connection", function(socket){
	
	console.log("Connected as" + socket.id);
	
	socket.on('createUser', function(data) {
		createUserRequest(socket, data);
	});
	
	socket.on('findUser', function(data) {
		console.log('requested');
		findUserRequest(socket, data);
	});
	
	socket.on('listUsers', function() {
		listUsersRequest(socket);
	});
	
	socket.on('deleteUser', function(data) {
		deleteUserRequest(socket, data);
	});
	
    socket.on('disconnect', function() {
		console.log(socket.id + " is now disconnected");
	});
		
});









