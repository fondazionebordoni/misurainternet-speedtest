var http = require('http');
var crypto = require('crypto');
var url = require('url');

function generateGarbageData(bytes){
	return crypto.randomBytes(bytes);
}

var server = http.createServer(function (req, res) {
	if(req.method==='GET'){
		var url_parts = url.parse(req.url, true);
		var query = url_parts.query;
		var reqObj=(JSON.parse(query.data));
		if (reqObj.request==='download' && reqObj.data_length){
			res.setHeader('Access-Control-Allow-Origin', '*');
			var data= generateGarbageData(reqObj.data_length);
			res.writeHead(200);
			res.end(data);
		}
	}
})

server.listen(8080);

