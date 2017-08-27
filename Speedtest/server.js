var http = require('http');
var crypto = require('crypto');
var url = require('url');

function generateTestData(bytes){
	return crypto.randomBytes(bytes);
}

var server = http.createServer(function (req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Connection', 'keep-alive');

	if(req.method==='HEAD' || req.method==='POST'){
		if(req.method==='HEAD'){
			console.log('Received message HEAD');

		}
		else{
			console.log('Received message POST');

		}
		res.writeHead(200);
		res.end();
	}

	else if(req.method==='GET'){
		console.log('Received message GET');
		var url_parts = url.parse(req.url, true);
		var query = url_parts.query;
		var reqObj=(JSON.parse(query.data));
		if (reqObj.request==='download' && reqObj.data_length){
			res.setHeader('Access-Control-Allow-Origin', '*');
			var data= generateTestData(reqObj.data_length);
			res.writeHead(200);
			res.end(data);
		}
	}

	else if(req.method==='OPTIONS'){
		console.log('messaggio ricevuto OPTIONS')
		res.setHeader('Access-Control-Allow-Methods', 'POST');
		res.setHeader('Access-Control-Max-Age',600);
		res.writeHead(200);
		res.end();
	}

})

server.listen(8080);
