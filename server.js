/*
	Server used for the development phases of the MIST Web project
	If you want to use it locally:
	- open the file: misurainternet-ui/public/speedtest.js
	- set the variable "useCustomTestServer" to "true"
	- modify the variable "customTestServerIP" with you custom IP
*/

var http = require('http');
var WebSocketServer = require('ws').Server;

var	server = http.createServer();
var serverPort = "60100"

server.listen(serverPort);

/* Incoming websocket ping */
wss = new WebSocketServer({ server });
count = 1;
wss.on('connection', function (ws) {
	ws.on('message', function () {
		console.log('PING number: ' + count);
		ws.send('');
		count++;
	});
});
/* End websocket */