var http = require('http');
var crypto = require('crypto');

var server = http.createServer(function (req, res) {
	console.log(req.headers);
	res.setHeader('Access-Control-Allow-Origin', '*');
	if(req.method==='POST'){
		console.log('Received message -post');
		res.writeHead(200);
		res.end();

	}
	else if(req.method==='OPTIONS'){
		console.log('messaggio ricevuto -options')
		res.setHeader('Access-Control-Allow-Methods', 'POST');
		res.setHeader('Access-Control-Max-Age',600);
		res.writeHead(200);
		res.end();
	}
})

server.listen(8080);

