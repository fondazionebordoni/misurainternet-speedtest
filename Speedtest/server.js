const http = require('http');
const crypto = require('crypto');
const url = require('url');
const events = require('events');
const WebSocketServer = require('ws').Server;
const fs = require('fs');
const {	Readable } = require('stream');

const serverPorts = ['60100', '60101', '60102', '60103', '60104', '60105', '60106', '60107', '60108', '60109'];

let data;
let currentSize = 0;

//
let servers = [];
serverPorts.forEach(function(item, index) {
	servers[index] = http.createServer(serverFunc);
	servers[index].listen(item);
});

let wss = new WebSocketServer({
	server: servers[0]
});
wss.on('connection', function(ws) {
	console.log('wss connected');
	ws.on('message', function(message) {
		console.log('Received ping message');
		ws.send('');
	});
});

//Connessione WebSocket per il calcolo del packet loss, su una porta diversa dal ping (ora 60101, severPorts[1])
let wssPktLoss = new WebSocketServer({
	server: servers[1]
});
//A fini di test voglio perdere un certo numero di pacchetti (prima erano 5)
const packetsToLose = 0;

wssPktLoss.on('connection', function(ws) {
	//Conto quanti paccketti ho ricevuto/risposto
	let packetCount = 0;
	//Conto i pacchetti che ho volutamente perso
	let packetsLost = 0;

	console.log(`WebSocketPacketLoss connected (${calculateCurrentTime()})`);

	ws.on('message', function(message) {
		packetCount++;
		console.log(`(pktLoss) Received ping message #${packetCount}`);

		if (packetCount >= 15 && packetsLost < packetsToLose) {
			console.log(`Packet #${packetCount} lost!`);
			packetsLost++;
		} else {
			ws.send('');
		}
	});
});

function generateTestData(bytes) {
	return crypto.randomBytes(bytes);
}

function getBlob(bytes) {
	if (bytes != currentSize) {
		data = generateTestData(bytes);
		currentSize = bytes;
	}
	return data;
}

function serverFunc(req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*'); //modificare poi '*' con il sito di misurainternet
	res.setHeader('Connection', 'keep-alive');

	let eventEmitter = new events.EventEmitter();
	eventEmitter.on('data', function(buffer) {
		console.log('bytes' + Buffer.byteLength(buffer));
	});

	if (req.method === 'POST') {
		console.log('Received message POST');
		res.writeHead(200);
		res.end();
	} else if (req.method === 'GET') {
		console.log('Received message GET');
		let url_parts = url.parse(req.url, true);

		if (url_parts.pathname === '/index') {
			console.log('index start');
			fs.readFile('index.html', function(err, file) {
				if (err) {
					res.writeHead(404);
					res.end();
				}

				res.writeHead(200, {
					'Content-Type': require('mime').getType('html')
				});
				res.write(file, 'binary');
				res.end();
			});
			console.log('index end');
		} else if (url_parts.pathname === '/download-test-mockup.js') {
			console.log('worker start');
			fs.readFile('download-test-mockup.js', function(err, file) {
				if (err) {
					res.writeHead(404);
					res.end();
				}

				res.writeHead(200, {
					'Content-Type': require('mime').getType('js')
				});
				res.write(file, 'binary');
				res.end();
			});
			console.log('worker end');
		} else if (url_parts.pathname === '/favicon.ico') {
			res.writeHead(200);
			res.end();
		} else {

			let query = url_parts.query;
			try {
				let reqObj = (JSON.parse(query.data));
				if (reqObj.request && reqObj.request === 'download' && reqObj.data_length && reqObj.data_length > 0 && Number.isInteger(reqObj.data_length)) {
					res.writeHead(200, {
						'Content-Description': 'File Transfer',
						'Content-Type': 'application/octet-stream',
						'Content-Transfer-Encoding': 'binary',
						'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0',
						'Pragma': 'no-cache'
					});
					res.end(getBlob(reqObj.data_length));
				} else {
					console.log('Formato JSON non valido');
					console.log(reqObj);
					res.writeHead(404);
					res.end();
				}
			} catch (e) {
				console.log('Errore nel parsing del JSON spedito tramite GET');
				console.log(e);
				res.writeHead(404);
				res.end();
			}
		}
	} else if (req.method === 'OPTIONS') {
		console.log('messaggio ricevuto OPTIONS');
		res.setHeader('Access-Control-Allow-Methods', 'POST');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); //per far funzionare il test di upload con Safari 10.1.1
		res.setHeader('Access-Control-Max-Age', 600); // il client puo inviarmi altre richieste POST per 5 minuti prima di dover nuovamente mandarmi nuovamente una richiesta OPTIONS
		res.writeHead(200);
		res.end();
	} else {
		console.log('Metodo ' + req.method + ' non previsto');
		res.writeHead(404);
		res.end();
	}
}

function calculateCurrentTime() {
	let currentdate = new Date();
	let datetime = 'Last Sync: ' + currentdate.getDate() + '/' +
		(currentdate.getMonth() + 1) + '/' +
		currentdate.getFullYear() + ' @ ' +
		currentdate.getHours() + ':' +
		currentdate.getMinutes() + ':';
	let currSec = currentdate.getSeconds();
	if (currSec < 10)
		datetime = datetime + '0' + currSec;
	else
		datetime = datetime + currSec;

	return datetime;
}
