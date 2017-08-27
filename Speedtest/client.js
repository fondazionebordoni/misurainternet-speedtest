/*************GLOBAL VARIABLES****************/
var sizes={
	oneKB: 1024,
	oneMB: 1048576,
	tenMB: 10485760,
	twentyMB: 20971520,
	fiftyMB: 52428800
};

var pingGlobalVariables={
	n_tot: 4,
	totalTime: 0,
	count: 0,
	firstPing: false
};

var downloadTestGlobalVariables={
	dataLength: sizes.tenMB,
	streams: 6,
	timeout: 10000,
	downloadedBytes: 0,
	count: 0,
	xhrArray: [],
	threshold: 0.10
};

var uploadTestGlobalVariables={
	dataLength: sizes.tenMB,
	streams: 6,
	timeout: 10000,
	uploadedBytes: 0,
	count: 0,
	xhrArray: [],
	threshold: 0.10
};

var speedTestGlobalVariables={
	serverUri: 'http://ec2-35-160-194-81.us-west-2.compute.amazonaws.com:8080',
	testStatus: 0, // 0: not started, 1: ping test, 2: download test, 3: upload test, 4: finished
	speedtestFailed: false
};
/*************END GLOBAL VARIABLES****************/



/*************UTILITY FUNCTIONS****************/
function closeAllConnections(arrayOfXhrs){
	for(var i=0;i<arrayOfXhrs.length; i++){
		arrayOfXhrs[i].onprogress = null;
		arrayOfXhrs[i].onload = null;
		arrayOfXhrs[i].onerror = null;
		arrayOfXhrs[i].upload.onprogress = null;
		arrayOfXhrs[i].upload.onload = null;
		arrayOfXhrs[i].upload.onerror = null
		arrayOfXhrs[i].abort();
		delete (arrayOfXhrs[i]);
	}
	arrayOfXhrs=null;
}

function generateTestData(numberOfMB){
	var array=[];
	var buffer=new ArrayBuffer(1048576);
	var bufferView= new Uint32Array(buffer);
	var limit= Math.pow(2,32);
	for(var i=0; i<bufferView.length; i++){
		bufferView[i]=Math.random() * limit;
	}
	for(var i=0; i<numberOfMB;i++){
		array.push(bufferView);
	}
	var b= new Blob(array);
	return b;
}
/*************END UTILITY FUNCTIONS****************/



/*************PING TEST****************/
function ping(nextFunction){
	var t0;
	var xhr=new XMLHttpRequest();

	xhr.onerror=function(){
		console.log('ERR: test di ping fallito!');
		speedTestGlobalVariables.speedtestFailed=true;
		xhr.abort();
	}

	xhr.onload=function(){
		var tf=Date.now();
		pingGlobalVariables.count++;

		if(pingGlobalVariables.count===1 && pingGlobalVariables.firstPing===false){
			var firstPingValue= tf - t0;
			pingGlobalVariables.firstPing=true;
			pingGlobalVariables.count=0;
			console.log('INFO: Primo ping!');
			console.log('INFO: Il valore del primo ping è ' + firstPingValue);
			console.log('___________________________________________________');
			ping(nextFunction); //escludo il primo ping
		}

		else {
			var latency= tf - t0;
			pingGlobalVariables.totalTime+=latency;

			console.log('INFO: Sono stati effettuati ' + pingGlobalVariables.count + ' ping');
			console.log('INFO: Il ping è ' + latency + 'ms');
			console.log('INFO: Il tempo TOTALE è ' + pingGlobalVariables.totalTime + 'ms');

			if(pingGlobalVariables.count===pingGlobalVariables.n_tot){
				console.log('___________________________________________________');
				console.log('END: Misura terminata!');
				console.log('END: Sono stati effettuati in tutto ' + pingGlobalVariables.count + ' misurazioni');
				console.log('END: La media è ' + pingGlobalVariables.totalTime/pingGlobalVariables.count + 'ms');
				console.log('___________________________________________________');
				console.log('___________________________________________________');
				console.log('___________________________________________________');
				if(nextFunction!=undefined){
					nextFunction();
				}
			}
			else{
				ping(nextFunction);
			}
		}
	} // end onload
	xhr.open('HEAD',speedTestGlobalVariables.serverUri + '?no-cache=' + Math.random());
	t0=Date.now();
	xhr.send();
}
/*************END PING TEST****************/



/*************DOWNLOAD TEST****************/
function downloadStream(index,numOfBytes,delay) {
	setTimeout(function(){

		var prevLoadedBytes=0;
		if(speedTestGlobalVariables.testStatus!==2){
			return;
		}

		var xhr= new XMLHttpRequest();
		downloadTestGlobalVariables.xhrArray[index]=xhr;

		downloadTestGlobalVariables.xhrArray[index].onprogress=function(event){
			var loadedBytes= event.loaded - prevLoadedBytes;
			downloadTestGlobalVariables.downloadedBytes+=loadedBytes;
			prevLoadedBytes=event.loaded;
		}

		//TODO: mettere nell'onerror tutta la logica per fermare lo speedtest rendendo globali gli interval
		downloadTestGlobalVariables.xhrArray[index].onerror=function(event){
			console.log('ERR: Onerror event fired at stream ' + index);
			speedTestGlobalVariables.speedtestFailed=true;
			downloadTestGlobalVariables.xhrArray[index].abort();
		}

		downloadTestGlobalVariables.xhrArray[index].onload=function(event){
			downloadTestGlobalVariables.count++;
			downloadTestGlobalVariables.xhrArray[index].abort();
			downloadStream(index,numOfBytes,0);
		}

		var req={request:'download',data_length:numOfBytes};
		var jsonReq=JSON.stringify(req);
		var url = speedTestGlobalVariables.serverUri + '?r=' + Math.random()+ "&data=" + encodeURIComponent(jsonReq);
		downloadTestGlobalVariables.xhrArray[index].open('GET',url);
		downloadTestGlobalVariables.xhrArray[index].send();
	},delay);
}


function downloadTest(nextFunction) {
	var testStartTime= Date.now();
	var previouslyDownloadedBytes=0;
	var previousDownloadTime=testStartTime;
	var prevInstSpeedInMbs=0;

	for(var i=0;i<downloadTestGlobalVariables.streams;i++){
		downloadStream(i,downloadTestGlobalVariables.dataLength,0);
	}

	var firstInterval = setInterval(function () {
		if(speedTestGlobalVariables.speedtestFailed){
			closeAllConnections(downloadTestGlobalVariables.xhrArray);
			clearInterval(firstInterval);
			console.log('ERR: Fallito test di download')
			return;
		}

		var tf=Date.now();
		var deltaTime=tf - previousDownloadTime;
		var currentlyDownloadedBytes = downloadTestGlobalVariables.downloadedBytes
		var deltaByte= currentlyDownloadedBytes - previouslyDownloadedBytes;
		var instSpeedInMbs= (deltaByte *8/1000.0)/deltaTime;
		var percentDiff=Math.abs((instSpeedInMbs - prevInstSpeedInMbs)/instSpeedInMbs); //potrebbe anche essere negativo

		console.log('INFO: Numero di byte caricati in precedenza: ' + previouslyDownloadedBytes);
		console.log('INFO: Numero di byte caricati in questo istante: ' + currentlyDownloadedBytes);
		console.log("INFO: L'intervallo di tempo considerato(s) per la misura: " + (deltaTime/1000.0));
		console.log('INFO: Velocita PRECEDENTE(Mbs): ' + prevInstSpeedInMbs);
		console.log('INFO: Velocita ATTUALE(Mbs): '+ instSpeedInMbs);
		console.log('INFO: Differenza percentuale: ' + percentDiff*100 + '%');

		previousDownloadTime=tf;
		previouslyDownloadedBytes= currentlyDownloadedBytes;
		prevInstSpeedInMbs=instSpeedInMbs;

		if(percentDiff<downloadTestGlobalVariables.threshold){
			console.log('___________________________________________________');
			console.log('INFO: Valore percentuale minore della soglia!');
			var measureStartTime = Date.now();
			downloadTestGlobalVariables.downloadedBytes = 0;
			clearInterval(firstInterval);

			var secondInterval= setInterval(function(){
				if(speedTestGlobalVariables.speedtestFailed){
					closeAllConnections(downloadTestGlobalVariables.xhrArray);
					clearInterval(secondInterval);
					console.log('ERR: Fallito test di download')
					return;
				}

				var time= Date.now();
				var downloadTime= time - measureStartTime;
				var downloadSpeedInMbs=(downloadTestGlobalVariables.downloadedBytes*8/1000)/downloadTime;

				console.log('INFO: La velocita di download(Mbs) è pari a ' + downloadSpeedInMbs);

				if( (time - measureStartTime) >= downloadTestGlobalVariables.timeout){
					closeAllConnections(downloadTestGlobalVariables.xhrArray);
					clearInterval(secondInterval);
					var totalTime= (time - testStartTime)/1000.0;
					console.log('___________________________________________________');
					console.log('END: Tempo scaduto!');
					console.log('END : La misurazione è durata(s) ' + (time - measureStartTime)/1000);
					console.log(downloadTestGlobalVariables);
					console.log('END: Per fare questa misurazione ci sono voluti ' + totalTime +' secondi');
					console.log('___________________________________________________');
					console.log('___________________________________________________');
					console.log('___________________________________________________');
					if(nextFunction!=undefined){
						nextFunction();
					}
				}
			},1000)
		}
	}, 3000)

}
/*************END DOWNLOAD TEST****************/



/*************UPLOAD TEST****************/
function uploadStream(index,bytesToUpload,delay) {
	setTimeout(function(){

		var prevUploadedBytes=0;
		if(speedTestGlobalVariables.testStatus!=3){
			return;
		}

		var xhr= new XMLHttpRequest();
		uploadTestGlobalVariables.xhrArray[index]=xhr;

		uploadTestGlobalVariables.xhrArray[index].upload.onprogress=function(event){
			var uploadedBytes= event.loaded - prevUploadedBytes;
			uploadTestGlobalVariables.uploadedBytes+=uploadedBytes;
			prevUploadedBytes=event.loaded;
		}

		//TODO: mettere nell'onerror tutta la logica per fermare lo speedtest rendendo globali gli interval
		uploadTestGlobalVariables.xhrArray[index].onerror=function(event){
			console.log('ERR: Onerror event fired at stream ' + index);
			speedTestGlobalVariables.speedtestFailed=true;
			uploadTestGlobalVariables.xhrArray[index].abort();
		}

		uploadTestGlobalVariables.xhrArray[index].upload.onload=function(event){
			uploadTestGlobalVariables.count++;
			uploadTestGlobalVariables.xhrArray[index].abort();
			uploadStream(index,bytesToUpload,0);
		}

		var url = speedTestGlobalVariables.serverUri + '?r=' + Math.random();
		uploadTestGlobalVariables.xhrArray[index].open('POST',url);
		uploadTestGlobalVariables.xhrArray[index].send(bytesToUpload);
	},delay);
}


function uploadTest(nextFunction) {
	var testStartTime= Date.now();
	var previouslyUploadedBytes=0;
	var previousUploadTime=testStartTime;
	var prevInstSpeedInMbs=0;
	var testData=generateTestData(uploadTestGlobalVariables.dataLength/(Math.pow(1024,2)));

	for(var i=0;i<uploadTestGlobalVariables.streams;i++){
		uploadStream(i,testData,0);
	}

	var firstInterval = setInterval(function () {

		if(speedTestGlobalVariables.speedtestFailed){
			closeAllConnections(uploadTestGlobalVariables.xhrArray);
			clearInterval(firstInterval);
			console.log('ERR: Fallito test di upload')
			return;
		}

		var tf=Date.now();
		var deltaTime=tf - previousUploadTime;
		var currentlyUploadedBytes = uploadTestGlobalVariables.uploadedBytes
		var deltaByte= currentlyUploadedBytes - previouslyUploadedBytes;
		var instSpeedInMbs= (deltaByte*8/1000.0)/deltaTime;
		var percentDiff=Math.abs((instSpeedInMbs - prevInstSpeedInMbs)/instSpeedInMbs); //potrebbe anche essere negativo

		console.log('INFO: Numero di byte inviati in precedenza: ' + previouslyUploadedBytes);
		console.log('INFO: Numero di byte inviati in questo istante: ' + currentlyUploadedBytes);
		console.log("INFO: L'intervallo di tempo considerato(s) per la misura: " + (deltaTime/1000.0));
		console.log('INFO: Velocita PRECEDENTE(Mbs): ' + prevInstSpeedInMbs);
		console.log('INFO: Velocita ATTUALE(Mbs): '+ instSpeedInMbs);
		console.log('INFO: Differenza percentuale: ' + percentDiff*100 + '%');

		previousUploadTime=tf;
		previouslyUploadedBytes= currentlyUploadedBytes;
		prevInstSpeedInMbs=instSpeedInMbs;

		if(percentDiff<uploadTestGlobalVariables.threshold){
			console.log('___________________________________________________');
			console.log('INFO: Valore percentuale minore della soglia!');
			var measureStartTime = Date.now();
			uploadTestGlobalVariables.uploadedBytes = 0;
			clearInterval(firstInterval);

			var secondInterval= setInterval(function(){
				if(speedTestGlobalVariables.speedtestFailed){
					closeAllConnections(uploadTestGlobalVariables.xhrArray);
					clearInterval(secondInterval);
					console.log('ERR: Fallito test di upload')
					return;
				}

				var time= Date.now();
				var uploadTime=time - measureStartTime;
				var uploadSpeedInMbs=(uploadTestGlobalVariables.uploadedBytes*8/1000)/uploadTime;

				console.log('INFO: La velocita di upload(Mbs) è pari a ' + uploadSpeedInMbs);

				if( (time - measureStartTime) >= uploadTestGlobalVariables.timeout){
					closeAllConnections(uploadTestGlobalVariables.xhrArray);
					clearInterval(secondInterval);
					var totalTime= (time - testStartTime)/1000.0;
					console.log('___________________________________________________');
					console.log('END: Tempo scaduto!');
					console.log('END : La misurazione è durata(s) ' + (time - measureStartTime)/1000);
					console.log(uploadTestGlobalVariables);
					console.log('END: Per fare questa misurazione ci sono voluti ' + totalTime +' secondi');
					console.log('___________________________________________________');
					console.log('___________________________________________________');
					console.log('___________________________________________________');
					if(nextFunction!=undefined){
						nextFunction();
					}
				}
			},1000)
		}
	}, 3000)

}
/*************END UPLOAD TEST****************/



/*************SPEEDTEST****************/
function startSpeedtest(){
	console.log('INFO: Inizia lo speedtest!');
	(function(){
		speedTestGlobalVariables.testStatus=1;
		ping(
			function(){
				speedTestGlobalVariables.testStatus=2;
				downloadTest(
					function(){
						speedTestGlobalVariables.testStatus=3;
						uploadTest(
							function(){
								speedTestGlobalVariables.testStatus=4;
							})
					})
			})
	})();
}
/*************END SPEEDTEST****************/
