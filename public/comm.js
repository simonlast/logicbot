
var socket = io.connect(window.location.href);

var Comm = {};

socket.on('dropwords', function(msg){
	console.log("rec_dropwords: " + msg.words);
	pjs.dropWords(msg.words);
});

socket.on('floatwords', function(msg){
	console.log("rec_floatwords: " + msg.words);
	pjs.floatWords(msg.words);
});

Comm.dropWords = function(words){
	socket.emit('dropwords', {'words': words});
};

Comm.floatWords = function(words){
	socket.emit('floatwords', {'words': words});
};

setTimeout(function(){
	pjs.setup();
},500);