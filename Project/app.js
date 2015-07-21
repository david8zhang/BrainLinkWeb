var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var AWS = require('aws-sdk');
var s3 = new AWS.S3();


app.use(express.static(__dirname + '/bower_components'));

app.get('/', function(req, res, next){
	res.sendFile(__dirname + '/index.html');
})

io.on('connection', function(client){
	console.log('Client connected...');

	client.on('join', function(data){
		console.log(data);
		client.emit('messages', 'Hello from Server');
	})

	client.on('messages', function(data){
		client.emit('broad', data);
		client.broadcast.emit('broad', data);
	})
})

console.log("server listening on port 4200");
server.listen(4200);