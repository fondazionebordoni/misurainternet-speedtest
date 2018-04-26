var http = require('http');
var crypto = require('crypto');
var url = require('url');
var events = require('events');
var WebSocketServer = require('ws').Server;
var fs = require('fs');

function generateTestData(bytes){
	return crypto.randomBytes(bytes);
}

var m50 = 52428800;
var m1 = 1048576;
var m5 = 5242880;
var m10 = 5242880*2;
var m25 = m50/2;
var m20 = m5*4
var m30 = m10*3;
var m80 = m10*8;
var data80 = generateTestData(m80);
var data50 = generateTestData(m50);
var data30 = generateTestData(m30);
var data25 = generateTestData(m25);
var data20 = generateTestData(m20);
var data10 = generateTestData(m10);
var data5 = generateTestData(m5);
var data1 = generateTestData(m1);

function getBlob(bytes) {
	if(bytes === m80)
		return data80;
	if(bytes === m50)
		return data50;
	if(bytes === m30)
		return data30;
	if(bytes === m25)
		return data25;
	if(bytes === m20)
		return data20;
	if(bytes === m10)
		return data10;
	if(bytes === m5)
		return data5;
	if(bytes === m1)
		return data1;
}

var serverFunc = function (req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*'); //modificare poi '*' con il sito di misurainternet
	res.setHeader('Connection', 'keep-alive');
	
	var eventEmitter = new events.EventEmitter();
	eventEmitter.on('data', function(buffer) {
		console.log('bytes' + Buffer.byteLength(buffer));
	});

	if(req.method==='POST'){
		console.log('Received message POST');
		
		var bytesReceived = 0;
		req.on('data', function(data) {
			bytesReceived += data.byteLength;
		});
		req.on('end', function() {
			var responseBody = JSON.stringify(
			{
				bytes: bytesReceived.toString()
			});
			res.writeHead(200);
			res.end(responseBody);
		});
	}

	else if(req.method==='GET'){
		console.log('Received message GET');
		var url_parts = url.parse(req.url, true);

		if(url_parts.pathname === '/index') {
			console.log('index start');
			fs.readFile('index.html', function(err, file) {
				if(err) {
					res.writeHead(404);
					res.end();
				}
					
				res.writeHead(200, { "Content-Type": require('mime').getType('html') });
				res.write(file, 'binary');
				res.end();
			});
			console.log('index end');
		}
		else if(url_parts.pathname === '/download-test-mockup.js') {
			console.log('worker start');
			fs.readFile('download-test-mockup.js', function(err, file) {
				if(err) {
					res.writeHead(404);
					res.end();
				}
					
				res.writeHead(200, { "Content-Type": require('mime').getType('js') });
				res.write(file, 'binary');
				res.end();
			});
			console.log('worker end');
		}
		else if(url_parts.pathname === '/favicon.ico') {
			res.writeHead(200);
			res.end();
		}
		else {
		
			var query = url_parts.query;
			try{
				var reqObj=(JSON.parse(query.data));
				if (reqObj.request && reqObj.request==='download' && reqObj.data_length && reqObj.data_length>0 && Number.isInteger(reqObj.data_length)){
					res.writeHead(200);
					res.end(getBlob(reqObj.data_length));
				}
				else {
					console.log('Formato JSON non valido');
					console.log(reqObj);
					res.writeHead(404);
					res.end();
				}
			}
			catch(e){
				console.log('Errore nel parsing del JSON spedito tramite GET');
				console.log(e);
				res.writeHead(404);
				res.end();
			}
		}
	}

	else if(req.method==='OPTIONS'){
		console.log('messaggio ricevuto OPTIONS')
		res.setHeader('Access-Control-Allow-Methods', 'POST');
		res.setHeader('Access-Control-Allow-Headers','Content-Type'); //per far funzionare il test di upload con Safari 10.1.1
		res.setHeader('Access-Control-Max-Age',600); // il client puo inviarmi altre richieste POST per 5 minuti prima di dover nuovamente mandarmi nuovamente una richiesta OPTIONS
		res.writeHead(200);
		res.end();
	}
	else{
		console.log('Metodo ' +  req.method + ' non previsto');
		res.writeHead(404);
		res.end();
	}

}

var server01 = http.createServer(serverFunc);
var server02 = http.createServer(serverFunc);
var server03 = http.createServer(serverFunc);
var server04 = http.createServer(serverFunc);
var server05 = http.createServer(serverFunc);
var server06 = http.createServer(serverFunc);
var server07 = http.createServer(serverFunc);
var server08 = http.createServer(serverFunc);
var server09 = http.createServer(serverFunc);
var server10 = http.createServer(serverFunc);
server01.listen(60100);
server02.listen(60101);
server03.listen(60102);
server04.listen(60103);
server05.listen(60104);
server06.listen(60105);
server07.listen(60106);
server08.listen(60107);
server09.listen(60108);
server10.listen(60109);

wss = new WebSocketServer({server: server01});
wss.on('connection', function(ws) {
	ws.on('message', function(message) {
		console.log('Received ping message');
		ws.send('');
	});
});
