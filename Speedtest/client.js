/*
	This code is derived from: speedtest_worker.js by Federico Dossena
	Licensed under the GNU LGPL license version 3,
	Original version:
		-> https://github.com/adolfintel/speedtest/blob/master/speedtest_worker.js
*/

/*************GLOBAL VARIABLES****************/
var sizes={
	oneKB: 1024,
	oneMB: 1048576,
	tenMB: 10485760,
	twentyMB: 20971520,
	fiftyMB: 52428800
};

//TODO: Eliminare questa variabile globale mettendo delle variabili 'testFailed' locali a ciascuna funzione
var speedTestGlobalVariables={
	speedtestFailed: false,
};
/*************END GLOBAL VARIABLES****************/



/*************UTILITY FUNCTIONS****************/
function terminateWorker(){
	var response={
		type: 'end'
	};
	self.postMessage(JSON.stringify(response));
	self.close();
}

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
}

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
/*************END UTILITY FUNCTIONS****************/



/*************Ping test****************/
function pingTest(hostName, times, nextFunction){
	var firstPingDone=false;
	var count=0;
	var totalTime=0;
	var t0=0;
	var ws=new WebSocket('ws://' + hostName);

	self.postMessage(JSON.stringify(
		{
			type: 'measure',
			content: {
				'test_type': 'ping'
			}
		}
	));

	ws.onopen=function(){
		t0=Date.now();
		ws.send('');
	}

	ws.onerror=function(){
		console.log('ERR: test di ping fallito!');
		speedTestGlobalVariables.speedtestFailed=true;
		ws.close();
	}

	ws.onmessage=function(){
		var tf=Date.now();

		if(!firstPingDone){  //escludo il primo ping
			var firstPingValue= tf - t0;
			firstPingDone=true;
			console.log('INFO: Primo ping!');
			console.log('INFO: Il valore del primo ping è ' + firstPingValue);
			console.log('___________________________________________________');
			t0=Date.now();
			ws.send('');
		}

		else{
			count++;
			var latency= tf - t0;
			totalTime+=latency;

			console.log('INFO: Sono stati effettuati ' + count + ' ping');
			console.log('INFO: Il ping è ' + latency + 'ms');
			console.log('INFO: Il tempo TOTALE è ' + totalTime + 'ms');

			if(count===times){

				self.postMessage(JSON.stringify(
					{
						type: 'result',
						content: {
							test_type: 'ping',
							result: latency
						}
					}
				));

				console.log('___________________________________________________');
				console.log('END: Misura terminata!');
				console.log('END: Sono stati effettuati in tutto ' + count + ' misurazioni');
				console.log('END: La media è ' + totalTime/count + 'ms');
				console.log('___________________________________________________');
				console.log('___________________________________________________');
				console.log('___________________________________________________');
				ws.close();
				if(nextFunction!=undefined){
					nextFunction();
				}
			}
			else{
				t0=Date.now();
				ws.send('');
			}
		}

	} //end onmessage

}
/*************End ping test****************/



/*************Download test****************/
function downloadTest(hostName, bytesToDownload, numberOfStreams, timeout, threshold, nextFunction) {
	var testStartTime= new Date();
	var previouslyDownloadedBytes=0;
	var previousDownloadTime=testStartTime;
	var prevInstSpeedInMbs=0;
	var downloadedBytes=0;
	var testDone=false;
	var xhrArray=[];

	self.postMessage(JSON.stringify(
		{
			type: 'measure',
			content: {
				test_type: 'download'
			}
		}
	));

	/*****download stream function*******/
	var downloadStream= function(index,numOfBytes,delay) {
		setTimeout(function(){

			var prevLoadedBytes=0;
			if(testDone){
				return;
			}

			var xhr= new XMLHttpRequest();
			xhrArray[index]=xhr;

			xhrArray[index].onprogress=function(event){
				var loadedBytes= event.loaded - prevLoadedBytes;
				downloadedBytes+=loadedBytes;
				prevLoadedBytes=event.loaded;
			}

			//TODO: mettere nell'onerror tutta la logica per fermare lo speedtest rendendo globali gli interval
			xhrArray[index].onerror=function(event){
				console.log('ERR: Onerror event fired at stream ' + index);
				speedTestGlobalVariables.speedtestFailed=true;
				xhrArray[index].abort();
			}

			xhrArray[index].onload=function(event){
				xhrArray[index].abort();
				downloadStream(index,numOfBytes,0);
			}

			var req={
				request:'download',
				data_length:numOfBytes
			};
			var jsonReq=JSON.stringify(req);
			var url = 'http://' + hostName + '?r=' + Math.random()+ "&data=" + encodeURIComponent(jsonReq);
			xhrArray[index].open('GET',url);
			xhrArray[index].send();
		},delay);
	}
	/*****end download stream function*******/

	for(var i=0;i<numberOfStreams;i++){
		downloadStream(i,bytesToDownload,i*100);
	}

	var firstInterval = setInterval(function () {
		if(speedTestGlobalVariables.speedtestFailed){
			closeAllConnections(xhrArray);
			clearInterval(firstInterval);
			console.log('ERR: Fallito test di download');
			return;
		}

		var tf=Date.now();
		var deltaTime=tf - previousDownloadTime;
		var currentlyDownloadedBytes = downloadedBytes;
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

		if(percentDiff<threshold){
			console.log('___________________________________________________');
			console.log('INFO: Valore percentuale minore della soglia!');
			var measureStartTime = Date.now();
			downloadedBytes = 0;
			clearInterval(firstInterval);

			var secondInterval= setInterval(function(){
				if(speedTestGlobalVariables.speedtestFailed){
					closeAllConnections(xhrArray);
					clearInterval(secondInterval);
					console.log('ERR: Fallito test di download')
					return;
				}

				var time= Date.now();
				var downloadTime= time - measureStartTime;
				var downloadSpeedInMbs=(downloadedBytes*8/1000)/downloadTime;

				self.postMessage(JSON.stringify(
					{
						type: 'tachometer',
						content: {
							value: downloadSpeedInMbs
						}
					}
				));

				console.log('INFO: La velocita di download(Mbs) è pari a ' + downloadSpeedInMbs);

				if( (time - measureStartTime) >= timeout){
					closeAllConnections(xhrArray);
					clearInterval(secondInterval);
					testDone=true;
					var totalTime= (time - testStartTime)/1000.0;

					self.postMessage(JSON.stringify(
						{
							type: 'result',
							content: {
								test_type: 'download',
								result: downloadSpeedInMbs*1000
							}
						}
					));

					console.log('___________________________________________________');
					console.log('END: Tempo scaduto!');
					console.log('END : La misurazione è durata(s) ' + (time - measureStartTime)/1000);
					console.log('END: Per fare questa misurazione ci sono voluti ' + totalTime +' secondi');
					console.log('___________________________________________________');
					console.log('___________________________________________________');
					console.log('___________________________________________________');

					//esegui, se presente, la successiva funzione
					if(nextFunction!=undefined){
						nextFunction();
					}
				}
			},500)
		}
	}, 3000)

}
/*************End download test****************/

/*************Upload test****************/
function uploadTest(hostName, bytesToUpload, numberOfStreams, timeout, threshold, nextFunction) {
	var testStartTime= Date.now();
	var previouslyUploadedBytes=0;
	var previousUploadTime=testStartTime;
	var prevInstSpeedInMbs=0;
	var testData=generateTestData(bytesToUpload/(Math.pow(1024,2)));
	var uploadedBytes=0;
	var testDone=false;
	var xhrArray=[];

	self.postMessage(JSON.stringify(
		{
			type: 'measure',
			content: {
				test_type: 'upload'
			}
		}
	));

	/***************upload stream*************/
	function uploadStream(index,dataToUpload,delay) {
		setTimeout(function(){

			var prevUploadedBytes=0;
			if(testDone){
				return;
			}

			var xhr= new XMLHttpRequest();
			xhrArray[index]=xhr;

			xhrArray[index].upload.onprogress=function(event){
				var loadedBytes= event.loaded - prevUploadedBytes;
				uploadedBytes+=loadedBytes;
				prevUploadedBytes=event.loaded;
			}

			//TODO: mettere nell'onerror tutta la logica per fermare lo speedtest rendendo globali gli interval
			xhrArray[index].onerror=function(event){
				console.log('ERR: Onerror event fired at stream ' + index);
				speedTestGlobalVariables.speedtestFailed=true;
				xhrArray[index].abort();
			}

			xhrArray[index].upload.onload=function(event){
				xhrArray[index].abort();
				uploadStream(index,dataToUpload,0);
			}

			var url = 'http://' + hostName + '?r=' + Math.random();
			xhrArray[index].open('POST',url);
			xhrArray[index].send(dataToUpload);
		},delay);
	}
	/***************end upload stream *************/

	for(var i=0;i<numberOfStreams;i++){
		uploadStream(i,testData,i*100);
	}

	var firstInterval = setInterval(function () {

		if(speedTestGlobalVariables.speedtestFailed){
			closeAllConnections(xhrArray);
			clearInterval(firstInterval);
			console.log('ERR: Fallito test di upload');
			return;
		}

		var tf=Date.now();
		var deltaTime=tf - previousUploadTime;
		var currentlyUploadedBytes = uploadedBytes;
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

		if(percentDiff<threshold){
			console.log('___________________________________________________');
			console.log('INFO: Valore percentuale minore della soglia!');
			var measureStartTime = Date.now();
			uploadedBytes = 0;
			clearInterval(firstInterval);

			var secondInterval= setInterval(function(){
				if(speedTestGlobalVariables.speedtestFailed){
					closeAllConnections(xhrArray);
					clearInterval(secondInterval);
					console.log('ERR: Fallito test di upload')
					return;
				}

				var time= Date.now();
				var uploadTime=time - measureStartTime;
				var uploadSpeedInMbs=(uploadedBytes*8/1000)/uploadTime;

				self.postMessage(JSON.stringify(
					{
						type: 'tachometer',
						content: {
							value: uploadSpeedInMbs
						}
					}
				));

				console.log('INFO: La velocita di upload(Mbs) è pari a ' + uploadSpeedInMbs);

				if( (time - measureStartTime) >= timeout){
					closeAllConnections(xhrArray);
					clearInterval(secondInterval);
					testDone=true;
					var totalTime= (time - testStartTime)/1000.0;

					self.postMessage(JSON.stringify(
						{
							type: 'result',
							content: {
								test_type: 'upload',
								result: uploadSpeedInMbs*1000
							}
						}
					));

					console.log('___________________________________________________');
					console.log('END: Tempo scaduto!');
					console.log('END : La misurazione è durata(s) ' + (time - measureStartTime)/1000);
					console.log('END: Per fare questa misurazione ci sono voluti ' + totalTime +' secondi');
					console.log('___________________________________________________');
					console.log('___________________________________________________');
					console.log('___________________________________________________');
					if(nextFunction){
						nextFunction();
					}
				}
			},500)
		}
	}, 3000)

}
/*************End upload test****************/

/*************Speedtest****************/
function startSpeedtest(numOfPings, numOfMB, numOfStreams, hostName){
	var timesToPing=4;
	var serverNameAndPort='ec2-34-210-59-77.us-west-2.compute.amazonaws.com:8080';
	var bytesToDownload=sizes.twentyMB;
	var bytesToUpload=sizes.twentyMB;
	var numberOfDownloadStreams=6;
	var numberOfUploadStreams=6;
	var downloadTestTimeout=10000;
	var uploadTestTimeout=10000;
	var downloadTestThreshold=0.10;
	var uploadTestThreshold=0.10;

	if(hostName){
		serverNameAndPort=hostName;
	}
	if(numOfPings){
		timesToPing=numOfPings;
	}
	if(numOfMB){
		bytesToDownload=numOfMB*1048576;
		bytesToUpload=numOfMB*1048576;
	}
	if(numOfStreams){
		numberOfDownloadStreams=numOfStreams;
		numberOfUploadStreams=numOfStreams;
	}

	console.log('INFO: timesToPing è pari a  ' + timesToPing);
	console.log('INFO: numberOfDownloadStreams è pari a  ' + numberOfDownloadStreams);
	console.log('INFO: bytesToDownload è pari a  ' + bytesToDownload);
	console.log('INFO: numberOfUploadStreams è pari a  ' + numberOfUploadStreams);
	console.log('INFO: bytesToUpload è pari a  ' + bytesToUpload);
	console.log('INFO: Inizia lo speedtest!');

	pingTest(serverNameAndPort,timesToPing,function(){
		downloadTest(serverNameAndPort,bytesToDownload,numberOfDownloadStreams,downloadTestTimeout,downloadTestThreshold,
			function(){
				uploadTest(serverNameAndPort,bytesToUpload,numberOfUploadStreams,uploadTestTimeout,uploadTestThreshold,terminateWorker);
			}
		)
	});
}
/*************End speedtest****************/



/************ worker listener **************/
function workerListener(){
	self.onmessage=function(message){
		var req=JSON.parse(message.data);
		if(req.request && req.request==='startMeasure'){
			startSpeedtest();
		}
	}
}
workerListener();
/************END worker listener **********/
