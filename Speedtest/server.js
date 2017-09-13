var http = require('http');
var crypto = require('crypto');
var url = require('url');
var WebSocketServer = require('ws').Server;

function generateTestData(bytes){
	return crypto.randomBytes(bytes);
}

var server = http.createServer(function (req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*'); //modificare poi '*' con il sito di misurainternet
	res.setHeader('Connection', 'keep-alive');

	if(req.method==='POST'){
		console.log('Received message POST');
		res.writeHead(200);
		res.end();
	}

	else if(req.method==='GET'){
		console.log('Received message GET');
		var url_parts = url.parse(req.url, true);
		var query = url_parts.query;
		try{
			var reqObj=(JSON.parse(query.data));
			if (reqObj.request && reqObj.request==='download' && reqObj.data_length && reqObj.data_length>0 && Number.isInteger(reqObj.data_length) && reqObj.data_length<=52428800){ //per il momento fisso il limite massimo a 50MB di dati scaricabili
				var data= generateTestData(reqObj.data_length);
				res.writeHead(200);
				res.end(data);
			}
			else{
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

})
server.listen(process.argv[2]);

wss = new WebSocketServer({server: server});
wss.on('connection', function(ws) {
	ws.on('message', function(message) {
		console.log('Received ping message');
		ws.send('');
	});
});
