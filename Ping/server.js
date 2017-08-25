var http = require('http');
var crypto = require('crypto');

var server = http.createServer(function (req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	if(req.method==='HEAD'){
		console.log('Received message HEAD');
		res.writeHead(200);
		res.end();

	}
})

server.listen(8080);

