var sizes={
	oneKB: 1024,
	oneMB: 1048576,
	tenMB: 10485760,
	twentyMB: 20971520,
	fiftyMB: 52428800
};

var uploadTestGlobalVariables={
	dataLength: sizes.tenMB,
	streams: 10,
	timeout: 10000,
	uploadedBytes: 0,
	count: 0,
	xhrArray: [],
	threshold: 0.10
};


//TODO: togliere il timeout e riflettere sulla necessita di manterene il controllo sullo status nell'onprogress
var speedTestSharedVariables={
	serverUri: 'http://ec2-35-160-194-81.us-west-2.compute.amazonaws.com:8080',
	testStatus: 0 // 0: not started, 1: ping test, 2: download test, 3: upload test, 4: finished
}

function closeAllConnections(){
	for(var i=0;i<uploadTestGlobalVariables.xhrArray.length; i++){
		console.log('Closing xhrs from CLOSEALLCONNECTIONS')
		try {
			uploadTestGlobalVariables.xhrArray[i].abort();
		}
		catch(e){
			console.log("errore in closeAllConnections nel forzare l'interruzione della connessione " + i);
		}
	}
}

function generateTestData(numberOfMB){
	var array=[];
	var buffer=new ArrayBuffer(1048576);
	console.log(buffer);
	var bufferView= new Uint32Array(buffer);
	console.log(bufferView);
	var limit= Math.pow(2,32);
	for(var i=0; i<bufferView.length; i++){
		bufferView[i]=Math.random() * limit;
	}
	for(var i=0; i<numberOfMB;i++){
		array.push(bufferView);
	}
	var b= new Blob(array);
	console.log(b.size);
	return b;
}

function uploadStream(index,bytesToUpload,delay) {
	setTimeout( function(){

		var prevUploadedBytes=0;
		if(speedTestSharedVariables.testStatus!=3){
			return;
		}
		xhr= new XMLHttpRequest();
		uploadTestGlobalVariables.xhrArray[index]=xhr;

		xhr.upload.onprogress=function(event){

			if(speedTestSharedVariables.testStatus!=3){
				console.log('Closing xhrs from ONPROGRESS')
				try { xhr.abort() } catch (e) {console.log("errore nel forzare l'interruzione della connessione " + index) }
				return;
			}

			var uploadedBytes= event.loaded - prevUploadedBytes;
			uploadTestGlobalVariables.uploadedBytes+=uploadedBytes;
			prevUploadedBytes=event.loaded;
		}

		xhr.upload.onload=function(event){
			uploadTestGlobalVariables.count++;
			uploadStream(index,bytesToUpload,0);

		}
		var url = speedTestSharedVariables.serverUri + '?r=' + Math.random();
		xhr.open('POST',url);
		xhr.send(bytesToUpload);
	},delay);
}


function uploadTest() {
	var testStartTime= Date.now();
	var previouslyUploadedBytes=0;
	var previousUploadTime=testStartTime;
	var prevInstSpeedInMbs=0;
	var testData=generateTestData(uploadTestGlobalVariables.dataLength/(Math.pow(1024,2)));
	speedTestSharedVariables.testStatus=3;
	for(var i=0;i<uploadTestGlobalVariables.streams;i++){
		uploadStream(i,testData,0);
	}
	var firstInterval = setInterval(function () {
		var tf=Date.now();
		var deltaTime=tf - previousUploadTime;
		var currentlyUploadedBytes = uploadTestGlobalVariables.uploadedBytes
		var deltaByte= currentlyUploadedBytes - previouslyUploadedBytes;
		var instSpeedInMbs= (deltaByte*8/1000.0)/deltaTime;
		var percentDiff=Math.abs((instSpeedInMbs - prevInstSpeedInMbs)/instSpeedInMbs); //potrebbe anche essere negativo

		console.log('Numero di byte mandati in precedenza: ' + previouslyUploadedBytes);
		console.log('Numero di byte mandati in questo istante: ' + currentlyUploadedBytes);
		console.log("L'intervallo di tempo attualmente considerato (secondi) per il calcolo della velocita è " + (deltaTime/1000.0))
		console.log('La velocita PRECEDENTE(Mbs) era pari a ' + prevInstSpeedInMbs + ' mentre la velocita attuale(Mbs) è pari a '+ instSpeedInMbs);
		console.log('percentDiff: ' + percentDiff*100 + '%');

		previousUploadTime=tf;
		previouslyUploadedBytes= currentlyUploadedBytes;
		prevInstSpeedInMbs=instSpeedInMbs;

 		if(percentDiff<uploadTestGlobalVariables.threshold){
			console.log('valore minore della soglia!');

			var measureStartTime = Date.now();
			uploadTestGlobalVariables.uploadedBytes = 0;
			clearInterval(firstInterval);

			var secondInterval= setInterval(function(){
				var time= Date.now();
				var uploadTime=time - measureStartTime;
				var uploadSpeedInMbs=(uploadTestGlobalVariables.uploadedBytes*8/1000)/uploadTime;

				console.log('Dentro il SECONDO interval la velocita di upload è pari a ' + uploadSpeedInMbs);

				if( (time - measureStartTime) >= uploadTestGlobalVariables.timeout){
					closeAllConnections();
					clearInterval(secondInterval);
					speedTestSharedVariables.testStatus=4; //TODO togliere questa istruzione quando mettero tutti i test nello stesso file
					var totalTime= (time - testStartTime)/1000.0;

					console.log((time - measureStartTime)/1000);
					console.log('tempo scaduto!');
					console.log(uploadTestGlobalVariables);
					console.log('Per fare questa misurazione ci sono voluti ' + totalTime +' secondi');
				}
			},1000)
		}
	}, 3000)

}

uploadTest();
