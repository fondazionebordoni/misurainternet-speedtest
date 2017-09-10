/*
	This code is derived from: speedtest_worker.js by Federico Dossena
	Licensed under the GNU LGPL license version 3,
	Original version:
		-> https://github.com/adolfintel/speedtest/blob/master/speedtest_worker.js
*/

/*************Global variables****************/
//TODO: Eliminare in fase di produzione la variabile globale sizes
var sizes={
	oneKB: 1024,
	oneMB: 1048576,
	tenMB: 10485760,
	twentyMB: 20971520,
	fiftyMB: 52428800
};

var speedTestGlobalVariables={
	type: 'speedtest',
	version: '3.0.0',
	server: null,
	start: null,
	stop: null,
	tests: [],
};

/*************Utility functions****************/
function terminateWorker(){
	speedTestGlobalVariables.stop= (new Date()).toISOString();
	self.postMessage(JSON.stringify(speedTestGlobalVariables));
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


/**************Ping code wrapper*************/
function pingCodeWrapper(arrayOfHostNames, times, maxTimeout, nextFunction){
	var measureResult={
		type: 'ping',
		start: null,
		byte: 0,
		value: [],
		avgValue: null // è ridondante però forse rende più comprensibile il codice del ping
	};

	/*************Ping multiple servers (beta)***************/
	function pingTest(arrayOfHostNames, times, maxTimeout, nextFunction){
		var hostName=arrayOfHostNames[0];
		console.log('INFO: Il server attualmente pingato è ' + hostName);
		var startISOTime;
		var firstPingDone=false;
		var count=0;
		var totalTime=0;
		var t0=0;
		var timeout;
		var timeoutEventFired=false;
		var ws=new WebSocket('ws://' + hostName);

		//funzione di utilità per gestire errori, timeout oppure la terminazione del test di ping
		var handleErrorsOrTimeoutsOrTestFinished= function(){
			ws.close();
			if(arrayOfHostNames.length===1){ //ho pingato l'ultimo server della lista di server passata come parametro alla funzione
				if(nextFunction && speedTestGlobalVariables.server){
					speedTestGlobalVariables.tests.push(measureResult);
					console.log(speedTestGlobalVariables);
					self.postMessage(JSON.stringify(
						{
							type: 'result',
							content: {
								test_type: 'ping',
								result: measureResult.avgValue
							}
						}
					));

					nextFunction();
				}
				else if(!speedTestGlobalVariables.server){
					//Nessun server mi ha risposto e quindi non eseguo la prossima funziona e mando un messaggio di errore all'interfaccia. (TODO)
					console.log('ERR: Impossibile pingare i server passati come parametro');

					self.postMessage(JSON.stringify(
						{
							type: 'error',
							content: 1235
						}
					));
				}
			}

			//altrimenti, pingo i server restanti
			else{
				arrayOfHostNames.shift(); //rimuovo l'elemento in testa all'array
				console.log(arrayOfHostNames);
				console.log(times);
				console.log(nextFunction);
				pingTest(arrayOfHostNames, times, maxTimeout, nextFunction);
			}

		} //end handleErrorsOrTimeoutsOrTestFinished function


		//altra funzione di utilità per mandare, tramite websocket, delle stringe vuote
		var sendPingMessage= function(){
			t0=Date.now();
			if(!firstPingDone){ //devo ancora inviare il primo ping
				startISOTime= (new Date(t0)).toISOString();
			}
			ws.send('');
			timeout=setTimeout(function(){
				timeoutEventFired=true;
				console.log('Timeout event fired!')
				handleErrorsOrTimeoutsOrTestFinished();
			},maxTimeout);
		}// end sendPingMessage

		ws.onopen=function(){
			sendPingMessage();
		}

		ws.onerror=function(){
			console.log('ERR: test di ping fallito per ws.onerror!');
			handleErrorsOrTimeoutsOrTestFinished();
		}

		ws.onmessage=function(){
			if(timeoutEventFired){
				return;
			}

			var tf=Date.now();
			clearTimeout(timeout);  //rimuovo il timeout che avevo impostato al momento dell'invio del messaggio in websocket dato che ho ricevuto il messaggio di risposta prima che scattasse il timeout

			if(!firstPingDone){  //escludo il primo ping
				var firstPingValue= tf - t0;
				firstPingDone=true;
				console.log('INFO: Primo ping!');
				console.log('INFO: Il valore del primo ping è ' + firstPingValue);
				console.log('___________________________________________________');
				sendPingMessage();
			}

			else{
				var latency= tf - t0;
				measureResult.value[count]=latency;
				count++;
				totalTime+=latency;

				console.log('INFO: Sono stati effettuati ' + count + ' ping');
				console.log('INFO: Il ping è ' + latency + 'ms');
				console.log('INFO: Il tempo TOTALE è ' + totalTime + 'ms');

				if(count===times){
					var pingAvgValue=totalTime/count;
					console.log('___________________________________________________');
					console.log('END: Misura terminata!');
					console.log('END: Sono stati effettuati in tutto ' + count + ' misurazioni');
					console.log('END: La media è ' + pingAvgValue + 'ms');
					console.log('___________________________________________________');
					console.log('___________________________________________________');
					console.log('___________________________________________________');

					if(speedTestGlobalVariables.server===null && measureResult.avgValue===null){ //primo server che viene pingato
						console.log('INFO: Primo server ad essere pingato!');
						speedTestGlobalVariables.server=hostName;
						measureResult.avgValue=pingAvgValue;
						measureResult.start=startISOTime;
						console.log('INFO: speedTestGlobalVariables.server è ' + speedTestGlobalVariables.server);
						console.log('INFO: measureResult.avgValue è ' + measureResult.avgValue);
						console.log('INFO: measureResult.start è ' + measureResult.start);

					}
					else{
						if(measureResult.avgValue && pingAvgValue<measureResult.avgValue){
							console.log('INFO: Il valore di ping calcolato è inferiore a quello attuale!');
							speedTestGlobalVariables.server=hostName;
							measureResult.avgValue=pingAvgValue;
							measureResult.start=startISOTime;
							console.log('INFO: speedTestGlobalVariables.server è ' + speedTestGlobalVariables.server);
							console.log('INFO: measureResult.avgValue è ' + measureResult.avgValue);
							console.log('INFO: measureResult.start è ' + measureResult.start);
						}
						//TODO: Eliminare poi il ramo else
						else{
							console.log('INFO: Il valore di ping calcolato è maggiore rispetto a quello salvato nella variabile globale');
						}
					}

					//Funzione per gestire il passaggio a un altro server da pingare oppure all'esecuzione della prossima funzione
					handleErrorsOrTimeoutsOrTestFinished();
				}

				else{ //non ho finito il test, devo pingare ancora il server in questione
					sendPingMessage();
				}
			}

		} //end onmessage

	}//end pingTest function

	self.postMessage(JSON.stringify(
		{
			type: 'measure',
			content: {
				'test_type': 'ping'
			}
		}
	));

	pingTest(arrayOfHostNames, times, maxTimeout, nextFunction);
}
/**************End Ping code wrapper*************/


/*************Download test****************/
function downloadTest(hostName, bytesToDownload, numberOfStreams, timeout, threshold, nextFunction) {
	var testStartTime= Date.now();
	var previouslyDownloadedBytes=0;
	var previousDownloadTime=testStartTime;
	var prevInstSpeedInMbs=0;
	var downloadedBytes=0;
	var testDone=false;
	var xhrArray=[];
	var firstInterval;
	var secondInterval;
	var measureResult= {
		type: 'download',
		start: (new Date(testStartTime)).toISOString(),
		byte: null,
		value: null
	};

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

			xhrArray[index].onerror=function(event){
				console.log('ERR: Onerror event fired at stream ' + index);
				closeAllConnections(xhrArray);
				if(firstInterval){
					clearInterval(firstInterval);
				}
				if(secondInterval){
					clearInterval(secondInterval);
				}

				console.log('ERR: Fallito test di download');

				self.postMessage(JSON.stringify(
					{
						type: 'error',
						content: 1236
					}
				));
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

	firstInterval = setInterval(function () {
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

		self.postMessage(JSON.stringify(
			{
				type: 'prequalification',
				content: {
					value: instSpeedInMbs
				}
			}
		));

		previousDownloadTime=tf;
		previouslyDownloadedBytes= currentlyDownloadedBytes;
		prevInstSpeedInMbs=instSpeedInMbs;

		if(percentDiff<threshold){
			console.log('___________________________________________________');
			console.log('INFO: Valore percentuale minore della soglia!');
			var measureStartTime = Date.now();
			downloadedBytes = 0;
			clearInterval(firstInterval);

			secondInterval= setInterval(function(){
				var time= Date.now();
				var downloadTime= time - measureStartTime;
				var downloadedBytesAtThisTime=downloadedBytes;
				var downloadSpeedInMbs=(downloadedBytesAtThisTime*8/1000)/downloadTime;

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
					measureResult.byte=downloadedBytesAtThisTime;
					measureResult.value=downloadSpeedInMbs*1000;
					speedTestGlobalVariables.tests.push(measureResult);
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
					if(nextFunction){
						nextFunction();
					}
				}
			},200)
		}
	}, 2000)

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
	var firstInterval;
	var secondInterval;
	var measureResult={
		type: 'upload',
		start: (new Date(testStartTime)).toISOString(),
		byte: null,
		value: null
	};

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
				closeAllConnections(xhrArray);
				if(firstInterval){
					clearInterval(firstInterval);
				}
				if(secondInterval){
					clearInterval(secondInterval);
				}

				console.log('ERR: Fallito test di upload');

				self.postMessage(JSON.stringify(
					{
						type: 'error',
						content: 1237
					}
				));
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

	firstInterval = setInterval(function () {
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

		self.postMessage(JSON.stringify(
			{
				type: 'prequalification',
				content: {
					value: instSpeedInMbs
				}
			}
		));

		previousUploadTime=tf;
		previouslyUploadedBytes= currentlyUploadedBytes;
		prevInstSpeedInMbs=instSpeedInMbs;

		if(percentDiff<threshold){
			console.log('___________________________________________________');
			console.log('INFO: Valore percentuale minore della soglia!');
			var measureStartTime = Date.now();
			uploadedBytes = 0;
			clearInterval(firstInterval);

			secondInterval= setInterval(function(){
				var time= Date.now();
				var uploadTime=time - measureStartTime;
				var uploadedBytesAtThisTime=uploadedBytes;
				var uploadSpeedInMbs=(uploadedBytesAtThisTime*8/1000)/uploadTime;

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
					measureResult.byte=uploadedBytesAtThisTime;
					measureResult.value=uploadSpeedInMbs*1000;
					speedTestGlobalVariables.tests.push(measureResult);
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
			},200)
		}
	}, 2000)

}
/*************End upload test****************/

/*************Speedtest****************/
function startSpeedtest(arrayOfServers, numOfPings, numOfMB, numOfStreams){
	speedTestGlobalVariables.start= (new Date()).toISOString();
	var timesToPing=4;
	var pingMaxTimeout=1000; //ms
	var bytesToDownload=sizes.fiftyMB;
	var bytesToUpload=sizes.fiftyMB;
	var numberOfDownloadStreams=6;
	var numberOfUploadStreams=6;
	var downloadTestTimeout=10000; //ms
	var uploadTestTimeout=10000; //ms
	var downloadTestThreshold=0.10;
	var uploadTestThreshold=0.10;

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

	pingCodeWrapper(arrayOfServers, timesToPing, pingMaxTimeout,
		function(){
			downloadTest(speedTestGlobalVariables.server,bytesToDownload,numberOfDownloadStreams,downloadTestTimeout,downloadTestThreshold,
				function(){
					uploadTest(speedTestGlobalVariables.server,bytesToUpload,numberOfUploadStreams,uploadTestTimeout,uploadTestThreshold,terminateWorker);
				}
			)
		}
	);
}
/*************End speedtest****************/



/************ worker listener **************/
function workerListener(){
	self.onmessage=function(message){
		var req=JSON.parse(message.data);
		if(req.request && req.request==='startMeasure' && req.servers && req.servers.length>0){
			startSpeedtest(req.servers);
		}
	}
}
workerListener();
/************END worker listener **********/
