var express = require('express');
var app = express();

//Socket.io packages
var server = require('http').createServer(app);
var io = require('socket.io')(server);

//AWS packages
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var DOC = require('dynamodb-doc');
AWS.config.update({region: 'us-west-2'});
var docClient = new DOC.DynamoDB();

//Public variable arrays for storing nicknames and trending topics
var nicknames = [];
var trending_topics = new Array();
var hot_topics = [];
var dataArray = [];
var glossary = require("glossary");


app.use(express.static(__dirname + '/bower_components'));

app.get('/', function(req, res, next){
	res.sendFile(__dirname + '/index.html');
})


io.on('connection', function(client){
	console.log('Client connected...');

	client.on('new user', function(data, callback){
		if(nicknames.indexOf(data) != -1){
			callback(false);
		} else {
			callback(true);
			client.nickname = data;
			nicknames.push(client.nickname);
			io.sockets.emit('usernames', nicknames);
		}
	});

	client.on('disconnect', function(data){
		if(!client.nickname)
			return;
		else{
			nicknames.splice(nicknames.indexOf(client.nickname), 1); //removes the user
		}
	})

	client.on('join', function(data){
		console.log(data);
		client.emit('messages', 'Hello from Server');
	})

	client.on('messages', function(data){
		
		var data_array = data.split(":");
		var max = 0;
		var displayed_comments = [];
		var topic = data_array[0];
		var comment = data_array[1];

		//Upload this stuff to the DynamoDB
		var params = {};
		params.TableName = "test-uploads";
		params.Item = {topic: topic, commentID: topic, body: comment};
		docClient.putItem(params, function(err, data){
			if(err){
				console.log(err, err.stack);
			} else {
				console.log(data);
			}
		})


		//Logic for determining trending topics
		if(trending_topics[topic] == null){
			trending_topics[topic] = 1; 
		} else {
			var count = trending_topics[topic];
			count += 1; 
			trending_topics[topic] = count;
		}
		for(var key in trending_topics){
			if(trending_topics[key] >= max){
				max = trending_topics[key];
			}
		}
		for (var key in trending_topics){
			if(trending_topics[key] >= max - 10){
				if(hot_topics.indexOf(key) < 0){
					hot_topics.push(key);
				}
			}
		}
		var trending;


		//TODO: Figure out a way to show more than one top trending topic in the trending topics box
		getData(function(data){
			console.log("test: " + JSON.stringify(data))
			client.emit('broad', {msg: comment, nick: client.nickname, category:topic, hot: JSON.stringify(data)});
			client.broadcast.emit('broad', {msg:comment, nick:client.nickname, category: topic, hot:JSON.stringify(data)});
		})
		
	})
	
	client.on("ideas", function(data){
		var idea_array = data.split(":");
		var topic = idea_array[0];
		var comment = idea_array[1];
		client.emit('ideas', {msg: comment, category:topic})
	})

})

function getDateTime(){
	var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
}

function getData(callback){
		for(i = 0; i < hot_topics.length; i++){
		var getParams = {};
		var trending = "";
		getParams.TableName = "test-uploads";
		getParams.Key = {commentID: hot_topics[i]};
		docClient.getItem(getParams, function(err, data){
			if(err){
				console.log(err, err.stack);
			} else {
				callback(data);
			}
		});
	}
}

console.log("server listening on port 4200");
server.listen(4200);