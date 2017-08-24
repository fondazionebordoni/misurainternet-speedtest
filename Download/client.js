var sizes={
	oneKB: 1024,
	oneMB: 1048576,
	tenMB: 10485760,
	twentyMB: 20971520,
	fiftyMB: 52428800
};

var downloadSettings={
	initialDataLength: sizes.tenMB,
	streams: 5, //per chrome
	timeout: 15000,
	status: 0,
	downloadedBytes: 0,
	serverUri: 'http://192.168.88.45:8080',
	count: 0,
	t0: 0,
	xhrArray: [],
	threshold: 0.10
};

function closeAllConnections(){
	for(var i=0;i<downloadSettings.xhrArray.length; i++){
		try {
			downloadSettings.xhrArray[i].abort();
		}
		catch(e){}
	}
}

function downloadStream(index,numOfBytes,delay) {
	setTimeout( function(){

		var prevLoadedBytes=0;
		if(downloadSettings.status===2){
			return;
		}
		xhr= new XMLHttpRequest();
		downloadSettings.xhrArray[index]=xhr;

		xhr.onprogress=function(event){

			if(downloadSettings.status===2){
				try { xhr.abort() } catch (e) { }
				return;
			}

			var loadedBytes= event.loaded - prevLoadedBytes;
			downloadSettings.downloadedBytes+=loadedBytes;
			prevLoadedBytes=event.loaded;
		}

		xhr.onload=function(event){
			downloadSettings.count++;
			if(downloadSettings.status===2){
				try { xhr.abort() } catch (e) { }
				return;
			}
			else{
				downloadStream(index,numOfBytes,0);
			}
		}

		var req={request:'download',data_length:numOfBytes};
		var jsonReq=JSON.stringify(req);
		var url = downloadSettings.serverUri + '?r=' + Math.random()+ "&data=" + encodeURIComponent(jsonReq);
		xhr.open('GET',url);
		xhr.send();
	},delay);
}


function main() {

	downloadSettings.t0= Date.now();
	var previouslyDownloadedBytes=0;
	var previousDownloadTime=downloadSettings.t0;
	var previousDownloadSpeedInMbs=0;
	downloadSettings.status=1;

	for(var i=0;i<downloadSettings.streams;i++){
		downloadStream(i,downloadSettings.initialDataLength,0);
	}

	var interval = setInterval(function () {

		var tf=Date.now();
		var currentDownloadTime=tf - previousDownloadTime;
		var currentTotalBytes = downloadSettings.downloadedBytes
		var currentlyDownloadedBytes= currentTotalBytes - previouslyDownloadedBytes;

		var currentSpeedInMbs= (currentlyDownloadedBytes *8/1000.0)/currentDownloadTime;
		var percentDiff=Math.abs((currentSpeedInMbs - previousDownloadSpeedInMbs)/currentSpeedInMbs); //potrebbe anche essere negativo

		console.log('Numero di byte caricati in precedenza: ' + previouslyDownloadedBytes);
		console.log('Numero di byte caricati in questo istante: ' + currentlyDownloadedBytes);
		console.log("L'intervallo di tempo attualmente considerato (secondi) per il calcolo della velocita è " + (currentDownloadTime/1000.0))
		console.log('La velocita PRECEDENTE(Mbs) era pari a ' + previousDownloadSpeedInMbs + ' mentre la velocita attuale(Mbs) è pari a '+ currentSpeedInMbs);
		console.log('percentDiff: ' + percentDiff*100);

		previousDownloadTime=tf;
		previouslyDownloadedBytes= currentTotalBytes;
		previousDownloadSpeedInMbs=currentSpeedInMbs;

 		if(percentDiff<downloadSettings.threshold){
			console.log('valore minore della soglia!');
			downloadSettings.t0 = Date.now();
			downloadSettings.downloadedBytes = 0;

			clearInterval(interval);

			setTimeout(function(){
				downloadSettings.status=2;
				closeAllConnections();
				console.log('tempo scaduto!');
				console.log(downloadSettings);
				var totalTime= (Date.now() - downloadSettings.t0)/1000.0;
				console.log('Per fare questa misurazione ci sono voluti ' + totalTime +' secondi');
			},downloadSettings.timeout);

			var secondInterval= setInterval(function(){
				if(downloadSettings.status===2){
					clearInterval(secondInterval);
				}
				var downloadTime=Date.now() - downloadSettings.t0;
				var downloadSpeedInMbs=(downloadSettings.downloadedBytes*8/1000)/downloadTime;
				console.log('Dentro il SECONDO interval la velocita di download è pari a ' + downloadSpeedInMbs);
			},1000)

		}

	}, 3000)

}

main();
//mettere previousDownloadedBytes e modificare lo start del cronometro
