var http = require('http');
var crypto = require('crypto');
var url = require('url');
var events = require('events');
var WebSocketServer = require('ws').Server;
var fs = require('fs');
const { Readable } = require('stream');

var serverPorts = ["60100", "60101", "60102", "60103", "60104", "60105", "60106", "60107", "60108", "60109"];

function generateTestData(bytes){
	return crypto.randomBytes(bytes);
}

var data;
var currentSize = 0;

function getBlob(bytes) {
	if(bytes != currentSize) {
		data = generateTestData(bytes);
		currentSize = bytes;
	}
	return data;
}

var serverFunc = function (req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*'); //modificare poi '*' con il sito di misurainternet
	res.setHeader('Connection', 'keep-alive');
	
	var eventEmitter = new events.EventEmitter();
	eventEmitter.on('data', function(buffer) {
		console.log('bytes' + Buffer.byteLength(buffer));
	});

	if(req.method==='POST'){
		console.log('Received message: POST');
		res.writeHead(200);
		res.end();
	}

	else if(req.method==='GET'){
		console.log('Received message: GET');
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
					res.writeHead(200, {
						'Content-Description': 'File Transfer',
						'Content-Type': 'application/octet-stream',
						'Content-Transfer-Encoding': 'binary',
						'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
						'Pragma': 'no-cache'
					});
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
		console.log('Received message: OPTIONS')
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


var servers = [];
serverPorts.forEach(function (item, index) {
	servers[index] = http.createServer(serverFunc);
	servers[index].listen(item);
});

wss = new WebSocketServer({server: servers[0]});
wss.on('connection', function(ws) {
	ws.on('message', function(message) {
		console.log('Received message: PING');
		ws.send('');
	});
});