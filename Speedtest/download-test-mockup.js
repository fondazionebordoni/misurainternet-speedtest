
var hostIP = "192.168.1.180";
var totalBytes = 0;
var startTime;
var testDone = false;
var serverPorts = ["60100", "60101", "60102", "60103", "60104", "60105", "60106", "60107", "60108", "60109"];
var xhrArray = [];
var endTime = null;

var m50 = 52428800;
var m1 = 1048576;
var m5 = 5242880;
var m10 = 5242880*2;
var m25 = m50/2;
var m20 = m5*4;
var m30 = m10*3;
var m80 = m10*8;

var bytesToDownload = m20;
var bytesToUpload = m50;
var numberOfStreams = 10;
var testData=generateTestData(bytesToUpload/(Math.pow(1024,2)));

function generateTestData(numberOfMB){
	var array=[];
	var buffer=new ArrayBuffer(1048576);
	var bufferView= new Uint32Array(buffer);
	var upperBound= Math.pow(2,33) - 1;
	for(var i=0; i<bufferView.length; i++){
		bufferView[i]=Math.floor(Math.random() * upperBound);
	}
	for(var i=0; i<numberOfMB;i++){
		array.push(bufferView);
	}
	var testDataBlob= new Blob(array);
	return testDataBlob;
}

var loadStream = function(index, delay, host) {
	setTimeout(function() {
		if(testDone){
			xhrArray[index].abort();
			return;
		}

			var url = 'http://' + host + '?r=' + Math.random();
			
			var prevLoadedBytes=0;
			var xhr = new XMLHttpRequest();
			xhrArray[index]=xhr;

			xhrArray[index].upload.onprogress=function(event){
				addBytes(event.loaded);
			};

			xhrArray[index].onerror=function(event){
				handleDownloadAndUploadErrors(firstInterval,secondInterval,xhrArray);

				self.postMessage(JSON.stringify(
					{
						type: 'error',
						content: 1237
					}
				));
			};
	
			xhrArray[index].upload.onload=function(event){
				xhrArray[index].abort();
				addBytes(event.loaded);
				loadStream(index,0,host);
			};
			
			xhrArray[index].upload.onabort=function(event){
				addBytes(event.loaded);
			};
		
			function addBytes(newTotalBytes) {
				var loadedBytes = newTotalBytes <= 0 ? 0 : (newTotalBytes - prevLoadedBytes);
				totalBytes += loadedBytes;
				prevLoadedBytes = newTotalBytes;
			}

			xhrArray[index].open('POST',url);
			xhrArray[index].send(testData);
	}, delay);
}

var k=0;
var downloadHostAndPorts = [];
serverPorts.forEach(function (item, index) {
	downloadHostAndPorts[index] = hostIP + ':' + item;
});

startTime = Date.now();

for(var i=0;i<numberOfStreams;i++){
	if(k >= downloadHostAndPorts.length)
			k = 0;
	
	loadStream(i,i*100,downloadHostAndPorts[k]);
	
	k++;
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
		console.log('end');
		testDone = true;
		clearInterval(interval);
		close();
	}
}, 200);