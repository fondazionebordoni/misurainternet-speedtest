var sizes={
	oneKB: 1024,
	oneMB: 1048576,
	tenMB: 10485760,
	twentyMB: 20971520,
	fiftyMB: 52428800
};

var downloadTestGlobalVariables={
	dataLength: sizes.tenMB,
	streams: 5,
	timeout: 10000,
	downloadedBytes: 0,
	count: 0,
	xhrArray: [],
	threshold: 0.10
};

var speedTestSharedVariables={
	serverUri: 'http://ec2-35-160-194-81.us-west-2.compute.amazonaws.com:8080',
	testStatus: 0 // 0: not started, 1: ping test, 2: download test, 3: upload test, 4: finished
}

function closeAllConnections(){
	for(var i=0;i<downloadTestGlobalVariables.xhrArray.length; i++){
		try {
			downloadTestGlobalVariables.xhrArray[i].abort();
		}
		catch(e){}
	}
}

function downloadStream(index,numOfBytes,delay) {
	setTimeout( function(){
		var prevLoadedBytes=0;
		if(speedTestSharedVariables.testStatus!==2){
			return;
		}
		xhr= new XMLHttpRequest();
		downloadTestGlobalVariables.xhrArray[index]=xhr;

		xhr.onprogress=function(event){

			if(speedTestSharedVariables.testStatus!==2){
				try { xhr.abort() } catch (e) { }
				return;
			}

			var loadedBytes= event.loaded - prevLoadedBytes;
			downloadTestGlobalVariables.downloadedBytes+=loadedBytes;
			prevLoadedBytes=event.loaded;
		}

		xhr.onload=function(event){
			downloadTestGlobalVariables.count++;
			downloadStream(index,numOfBytes,0);
		}

		var req={request:'download',data_length:numOfBytes};
		var jsonReq=JSON.stringify(req);
		var url = speedTestSharedVariables.serverUri + '?r=' + Math.random()+ "&data=" + encodeURIComponent(jsonReq);
		xhr.open('GET',url);
		xhr.send();
	},delay);
}


function downloadTest() {

	var testStartTime= Date.now();
	var previouslyDownloadedBytes=0;
	var previousDownloadTime=testStartTime;
	var prevInstSpeedInMbs=0;
	speedTestSharedVariables.testStatus=2;

	for(var i=0;i<downloadTestGlobalVariables.streams;i++){
		downloadStream(i,downloadTestGlobalVariables.dataLength,0);
	}

	var firstInterval = setInterval(function () {
		var tf=Date.now();
		var deltaTime=tf - previousDownloadTime;
		var currentlyDownloadedBytes = downloadTestGlobalVariables.downloadedBytes
		var deltaByte= currentlyDownloadedBytes - previouslyDownloadedBytes;
		var instSpeedInMbs= (deltaByte *8/1000.0)/deltaTime;
		var percentDiff=Math.abs((instSpeedInMbs - prevInstSpeedInMbs)/instSpeedInMbs); //potrebbe anche essere negativo

		console.log('Numero di byte caricati in precedenza: ' + previouslyDownloadedBytes);
		console.log('Numero di byte caricati in questo istante: ' + currentlyDownloadedBytes);
		console.log("L'intervallo di tempo attualmente considerato (secondi) per il calcolo della velocita è " + (deltaTime/1000.0))
		console.log('La velocita PRECEDENTE(Mbs) era pari a ' + prevInstSpeedInMbs + ' mentre la velocita attuale(Mbs) è pari a '+ instSpeedInMbs);
		console.log('percentDiff: ' + percentDiff*100 + '%');

		previousDownloadTime=tf;
		previouslyDownloadedBytes= currentlyDownloadedBytes;
		prevInstSpeedInMbs=instSpeedInMbs;

		if(percentDiff<downloadTestGlobalVariables.threshold){
			console.log('valore minore della soglia!');
			var measureStartTime = Date.now();
			downloadTestGlobalVariables.downloadedBytes = 0;
			clearInterval(firstInterval);

			var secondInterval= setInterval(function(){
				var time= Date.now();
				var downloadTime= time - measureStartTime;
				var downloadSpeedInMbs=(downloadTestGlobalVariables.downloadedBytes*8/1000)/downloadTime;

				console.log('Dentro il SECONDO interval la velocita di download è pari a ' + downloadSpeedInMbs);

				if( (time - measureStartTime) >= downloadTestGlobalVariables.timeout){
					closeAllConnections();
					clearInterval(secondInterval);
					speedTestSharedVariables.testStatus=3; //TODO togliere questa istruzione quando mettero tutti i test nello stesso file
					var totalTime= (time - testStartTime)/1000.0;

					console.log((time - measureStartTime)/1000);
					console.log('tempo scaduto!');
					console.log(downloadTestGlobalVariables);
					console.log('Per fare questa misurazione ci sono voluti ' + totalTime +' secondi');
				}
			},1000)
		}
	}, 3000)

}

downloadTest();
