
var host = "192.168.1.180";
var totalBytes = 0;
var startTime;
var go = true;
var serverPorts = ["60100", "60101", "60102", "60103", "60104", "60105", "60106", "60107", "60108", "60109"];
var lastStartTimes = [];
var endTime = null;
var streamsFinished = 0;
var testFinished = false;

var m50 = 52428800;
var m1 = 1048576;
var m5 = 5242880;
var m10 = 5242880*2;
var m25 = m50/2;
var m20 = m5*4;
var m30 = m10*3;
var m80 = m10*8;

var bytesToDownload = m50;
var numberOfStreams = 2;

var downloadStream = function(index, delay, host) {
	setTimeout(function() {
		var req = {
			request:'download',
			data_length: bytesToDownload
		};

		var jsonReq = JSON.stringify(req);
		var url = 'http://' + host + '?r=' + Math.random() + "&data=" + encodeURIComponent(jsonReq);
		
		lastStartTimes[index] = Date.now();
		console.log(index);
		var fetchRequest = new Request(url);
		fetch(fetchRequest).then(function(response) {
			return response.blob();
		}).then(function(blob) {
			if(go) {
				totalBytes += blob.size;
				downloadStream(index, 0, host);
			} else {
				streamsFinished++;
				if(endTime == null) {
					totalBytes += blob.size;
					endTime = Date.now();
				} else {
					var thisStreamDuration = Date.now() - lastStartTimes[index];
					var timeTillEndTime = endTime - lastStartTimes[index];
					
					var bytesToAdd = blob.size*timeTillEndTime/thisStreamDuration/2;
					totalBytes += bytesToAdd;
					console.log(timeTillEndTime.toString() + ' ' +  bytesToAdd.toString()/1024/1024);
					if(streamsFinished == numberOfStreams) {
						testFinished = true;
					}
				}
			}
		});
	}, delay);
}

var j=0;
var k=0;
var downloadHostAndPorts = [];
serverPorts.forEach(function (item, index) {
	downloadHostAndPorts[index] = host + ':' + item;
});

startTime = Date.now();

for(var i=0;i<numberOfStreams;i++){
	if(j<1)
		j++;
	else {
		k++;
		j=1;
	}
	downloadStream(i,i*10,downloadHostAndPorts[k]);
}

var interval = setInterval(function() {
	var time;
	if(endTime == null) {
		time = Date.now();
	} else {
		time = endTime;
	}
	var elapsedTime = time - startTime;
	var speedInMbps = (totalBytes/125)/elapsedTime;
	
	postMessage({'speed': speedInMbps, 'bytes': totalBytes});
	
	if(elapsedTime > 10000) {
		go = false;
	}
	
	if(testFinished) {
		clearInterval(interval);
		close();
	}
}, 200);