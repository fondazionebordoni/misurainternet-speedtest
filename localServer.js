var express = require('express');
 
var server = express();
server.use(express.static(__dirname + '/Speedtest'));
 
var port = 8088;
server.listen(port);