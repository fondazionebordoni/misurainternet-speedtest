var sizes={
	oneKB: 1024,
	oneMB: 1048576,
	tenMB: 10485760,
	twentyMB: 20971520,
	fiftyMB: 52428800
};

var uploadSettings={
	initialDataLength: sizes.twentyMB,
	streams: 6, //controllare poi
	timeout: 15000,
	status: 0,
	uploadedBytes: 0,
	serverUri: 'http://ec2-35-160-194-81.us-west-2.compute.amazonaws.com:8080',
	count: 0,
	t0: 0,
	xhrArray: [],
	threshold: 0.10
};

//TODO: mettere t0, dentro upload() e mettere una variabile globale object per le informazioni comuni


function closeAllConnections(){
	for(var i=0;i<uploadSettings.xhrArray.length; i++){
		console.log('Closing xhrs from CLOSEALLCONNECTIONS')
		try {
			uploadSettings.xhrArray[i].abort();
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
		if(uploadSettings.status===2){
			return;
		}
		xhr= new XMLHttpRequest();
		uploadSettings.xhrArray[index]=xhr;

		xhr.upload.onprogress=function(event){

			if(uploadSettings.status===2){
				console.log('Closing xhrs from ONPROGRESS')
				try { xhr.abort() } catch (e) {console.log("errore nel forzare l'interruzione della connessione " + index) }
				return;
			}

			var uploadedBytes= event.loaded - prevUploadedBytes;
			uploadSettings.uploadedBytes+=uploadedBytes;
			prevUploadedBytes=event.loaded;
		}

		xhr.upload.onload=function(event){
			uploadSettings.count++;
			if(uploadSettings.status===2){
				console.log('Closing xhrs from ONLOAD')
				try { xhr.abort() } catch (e) {console.log("errore nel forzare l'interruzione della connessione " + index) }
				return;
			}
			else{
				uploadStream(index,bytesToUpload,0);
			}
		}
		var url = uploadSettings.serverUri + '?r=' + Math.random();
		xhr.open('POST',url);
		xhr.send(bytesToUpload);
	},delay);
}


function main() {

	var startingTime= Date.now();
	var previouslyUploadedBytes=0;
	var previousUploadTime=startingTime;
	var previousUploadSpeedInMbs=0;
	var testData=generateTestData(20);
	uploadSettings.status=1;

	for(var i=0;i<uploadSettings.streams;i++){
		uploadStream(i,testData,0);
	}

	var interval = setInterval(function () {

		var tf=Date.now();
		var currentUploadTime=tf - previousUploadTime;

		//ridenominare le variabili
		var currentTotalBytes = uploadSettings.uploadedBytes
		var currentlyUploadedBytes= currentTotalBytes - previouslyUploadedBytes;

		var currentSpeedInMbs= (currentlyUploadedBytes*8/1000.0)/currentUploadTime;
		var percentDiff=Math.abs((currentSpeedInMbs - previousUploadSpeedInMbs)/currentSpeedInMbs); //potrebbe anche essere negativo

		console.log('Numero di byte mandati in precedenza: ' + previouslyUploadedBytes);
		console.log('Numero di byte mandati in questo istante: ' + currentlyUploadedBytes);
		console.log("L'intervallo di tempo attualmente considerato (secondi) per il calcolo della velocita è " + (currentUploadTime/1000.0))
		console.log('La velocita PRECEDENTE(Mbs) era pari a ' + previousUploadSpeedInMbs + ' mentre la velocita attuale(Mbs) è pari a '+ currentSpeedInMbs);
		console.log('percentDiff: ' + percentDiff*100 + '%');

		previousUploadTime=tf;
		previouslyUploadedBytes= currentTotalBytes;
		previousUploadSpeedInMbs=currentSpeedInMbs;

 		if(percentDiff<uploadSettings.threshold){
			console.log('valore minore della soglia!');
			uploadSettings.t0 = Date.now();
			uploadSettings.uploadedBytes = 0;

			clearInterval(interval);

			setTimeout(function(){
				uploadSettings.status=2;
				closeAllConnections();
				console.log('tempo scaduto!');
				console.log(uploadSettings);
				var totalTime= (Date.now() - startingTime)/1000.0;
				console.log('Per fare questa misurazione ci sono voluti ' + totalTime +' secondi');
			},uploadSettings.timeout);

			var secondInterval= setInterval(function(){
				if(uploadSettings.status===2){
					clearInterval(secondInterval);
				}
				var uploadTime=Date.now() - uploadSettings.t0;
				var uploadSpeedInMbs=(uploadSettings.uploadedBytes*8/1000)/uploadTime;
				console.log('Dentro il SECONDO interval la velocita di upload è pari a ' + uploadSpeedInMbs);
			},1000)

		}

	}, 3000)

}

main();