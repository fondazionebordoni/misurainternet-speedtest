/*
	This code is derived from: speedtest_worker.js by Federico Dossena
	Licensed under the GNU LGPL license version 3,
	Original version:
		-> https://github.com/adolfintel/speedtest/blob/master/speedtest_worker.js
*/

//TODO include credits from jsscan project (sourceforge)

//TODO Non può essere implementato lato browser (forse con requirejs?) OPPURE module.exports negli altri file -> https://stackoverflow.com/questions/33516906/which-browsers-support-import-and-export-syntax-for-ecmascript-6

/*
import pingCodeWrapper from './pingTest';
import packetLossTest from './packetLossTest';
import downloadTest from './downloadTest';
import uploadTest from './uploadTest';
*/

/*************Global variables****************/
var measureResultsContainer = {
	type: 'speedtest',
	version: '3.0.0',
	server: null,
	start: null,
	stop: null,
	tests: [],
};

var serverPorts = ['60100', '60101', '60102', '60103', '60104', '60105', '60106', '60107', '60108', '60109'];

var useCustomTestServer = true;
var customTestServerIP = ['localhost']; //Put here your custom IP


/************ worker listener **************/
function workerListener() {
	self.onmessage = function(message) {
		if (useCustomTestServer) {
			startSpeedtest(customTestServerIP);
		} else {
			var req = JSON.parse(message.data);
			if (req.request && req.request === 'startMeasure' && req.servers && req.servers.length > 0) {
				startSpeedtest(req.servers);
			}
		}
	};
}
workerListener();
/************END worker listener **********/


/*************Speedtest****************/
function startSpeedtest(arrayOfServers) {
	const m50 = 52428800;	//50MB
	const m1 = 1048576;
	const m5 = 5242880;
	const m10 = 5242880 * 2;
	const m25 = m50 / 2;
	const m20 = m5 * 4;
	const m30 = m10 * 3;
	const m80 = m10 * 8;
	const m100 = m50 * 2;

	measureResultsContainer.start = (new Date()).toISOString();

	//Ping settings
	const timesToPing = 10;
	const pingMaxTimeout = 1000; //ms

	//Packet loss settings
	const lossTestPacketCount = 100;
	//TODO Questi due parametri non vengono considerati da setInterval e setTimeout -> https://stackoverflow.com/questions/18963377/use-variable-as-time-in-setinterval-settimeout
	const lossTestPacketFrequency = 5;	//ms
	const lossTestTimeout = 4500;

	//Download/Upload settings
	const gaugeUpdateInterval = 500;	//ms, frequenza di aggiornamento dei grafici
	const bytesToDownload = m50; //50MB
	const bytesToUpload = m50; //50MB
	const numberOfDownloadStreams = 20;
	const numberOfUploadStreams = 20;
	const downloadTestTimeout = 10000; //ms
	const uploadTestTimeout = 10000; //ms
	const downloadTestThreshold = 0.10;
	const uploadTestThreshold = 0.10;

	//TODO Evitare callback hell con l'uso di Promise/Async-Await (o con Promisify su NodeJS?)
	pingCodeWrapper(arrayOfServers, timesToPing, pingMaxTimeout,
		function() {
			packetLossTest(arrayOfServers, lossTestPacketCount, lossTestPacketFrequency, lossTestTimeout,
				function() {
					downloadTest(measureResultsContainer.server, bytesToDownload, numberOfDownloadStreams, downloadTestTimeout, downloadTestThreshold, gaugeUpdateInterval,
						function() {
							uploadTest(measureResultsContainer.server, bytesToUpload, numberOfUploadStreams, uploadTestTimeout, uploadTestThreshold, gaugeUpdateInterval, terminateWorker);
						}
					);
				}
			);
		}
	);
}
/*************End speedtest****************/


/*************Utility functions****************/
function terminateWorker() {
	measureResultsContainer.stop = (new Date()).toISOString();
	self.postMessage(JSON.stringify(measureResultsContainer));
	self.close();
}

function closeAllConnections(arrayOfXhrs) {
	for (var i = 0; i < arrayOfXhrs.length; i++) {
		try {
			arrayOfXhrs[i].onprogress = null;
			arrayOfXhrs[i].onload = null;
			arrayOfXhrs[i].onerror = null;
		} catch (e) {console.log(e);}
		try {
			arrayOfXhrs[i].upload.onprogress = null;
			arrayOfXhrs[i].upload.onload = null;
			arrayOfXhrs[i].upload.onerror = null;
		} catch (e) {console.log(e);}
		try {
			arrayOfXhrs[i].abort();
		} catch (e) {console.log(e);}
		try {
			delete(arrayOfXhrs[i]);
		} catch (e) {console.log(e);}
	}
}

function handleDownloadAndUploadErrors(firstInterval, secondInterval, arrayOfXhrs) {
	closeAllConnections(arrayOfXhrs);
	if (firstInterval) {
		clearInterval(firstInterval);
	}
	if (secondInterval) {
		clearInterval(secondInterval);
	}
}

function generateTestData(numberOfMB) {
	var array = [];
	var buffer = new ArrayBuffer(1048576);
	var bufferView = new Uint32Array(buffer);
	var upperBound = Math.pow(2, 33) - 1;
	for (let i = 0; i < bufferView.length; i++) {
		bufferView[i] = Math.floor(Math.random() * upperBound);
	}
	for (let i = 0; i < numberOfMB; i++) {
		array.push(bufferView);
	}
	var testDataBlob = new Blob(array);
	return testDataBlob;
}
/*************End Utility functions****************/

/**************Ping code wrapper*************/
function pingCodeWrapper(arrayOfHostNamesAndPorts, times, maxTimeout, nextFunction) {
	let latencyAvgValue;
	let measureResult;

	/*************Ping multiple servers***************/
	function pingTest(arrayOfHostNamesAndPorts, times, maxTimeout, nextFunction) {
		let currentMeasureResult = [];

		//Inizializza l'array di risultati del test
		for (let i = 0; i < times; i++) {
			let pingObj = {
				type: 'ping',
				start: null,
				byte: 0,
				value: null
			};
			currentMeasureResult.push(pingObj);
		}

		let hostName = arrayOfHostNamesAndPorts[0];
		let hostNameAndPort = hostName + ':' + serverPorts[0];
		let firstPingDone = false;
		let count = 0;
		let totalTime = 0;
		let t0 = 0;
		let timeout;
		let timeoutEventFired = false;
		let ws = new WebSocket('ws://' + hostNameAndPort);

		//Funzione per calcolare il jitter a partire dal valor medio del ping, array dei ping e il numero di ping
		function calculateJitter(pingAvg, pingArray, pingCount) {
			let jitter = 0;

			for (let i = 0; i < pingCount; i++) {
				let diff = (pingArray[i].value - pingAvg);
				jitter += diff * diff;
				//console.log(`Ping #${i+1} ${pingArray[i].value}`);
			}
			jitter /= pingCount;

			return Math.sqrt(jitter);
		}

		//funzione di utilità per gestire errori, timeout oppure la terminazione del test di ping
		function handleErrorsOrTimeoutsOrTestFinished() {
			//Se la connessione websocket non è stata chiusa, viene chiusa [0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED]
			if (ws.readyState < 3) {
				ws.close();
			}

			//ho pingato l'ultimo server della lista di server passata come parametro alla funzione
			if (arrayOfHostNamesAndPorts.length === 1) {
				if (nextFunction && measureResultsContainer.server) {
					measureResultsContainer.tests = measureResultsContainer.tests.concat(measureResult);
					//Messaggio finale con il risultato del test di ping che viene mandato ad App.js, che arriva alla funzione displayResult
					self.postMessage(JSON.stringify({
						type: 'result',
						content: {
							test_type: 'ping',
							//Modificato per inglobare anche il valore del jitter in un solo JSON
							result: {
								ping: latencyAvgValue,
								jitter: calculateJitter(latencyAvgValue, currentMeasureResult, times)
							}
						}
					}));
					nextFunction();
				} else if (!measureResultsContainer.server) {
					self.postMessage(JSON.stringify({
						type: 'error',
						content: 1235
					}));
				}
			}

			//altrimenti, pingo i server restanti
			else {
				arrayOfHostNamesAndPorts.shift(); //rimuovo l'elemento in testa all'array
				pingTest(arrayOfHostNamesAndPorts, times, maxTimeout, nextFunction);
			}

		} //end handleErrorsOrTimeoutsOrTestFinished function


		//altra funzione di utilità per mandare, tramite websocket, delle stringhe vuote
		function sendPingMessage() {
			t0 = Date.now();
			ws.send('');
			//Il valore di ritorno di setTimeout è l'handle associato al timeout stesso, univoco per ogni chiamata di setTimeout
			timeout = setTimeout(function() {
				timeoutEventFired = true;
				handleErrorsOrTimeoutsOrTestFinished();
			}, maxTimeout);
		} // end sendPingMessage

		let websocketConnectionFailedTimeout = setTimeout(function() {
			//Il websocket si trova ancora in stato connecting e non è stata ancora instaurata la connessione
			if (ws.readyState === 0) {
				//Chiamare ws.close() quando non è stata ancora aperta la connessione causa una chiusura del websocket con event code = 1006. 
				//Questa cosa implica la chiamata dell'event handler onclose che a sua volta chiamerà handleErrorsOrTimeoutsOrTestFinished
				ws.close();
			}
		}, 2000);

		ws.onopen = function() {
			clearTimeout(websocketConnectionFailedTimeout);
			sendPingMessage();
		};

		ws.onclose = function(event) {
			if (event.code != 1000) { // chiusura imprevista della connessione websocket
				handleErrorsOrTimeoutsOrTestFinished();
			}
		};

		ws.onmessage = function() {
			if (timeoutEventFired) {
				return;
			}

			let tf = Date.now();

			//Rimuovo il timeout impostato al momento dell'invio del messaggio in websocket,
			//questo perché ho ricevuto il messaggio di risposta prima che scattasse il timeout
			clearTimeout(timeout);

			//Non ho fatto un primo ping, lo escludo per avere una misura più accurata
			if (!firstPingDone) {
				let firstPingValue = tf - t0;
				firstPingDone = true;
				sendPingMessage();
				//Ho fatto il primo ping e la misura del ping inizia da qui
			} else {
				let latency = tf - t0;
				currentMeasureResult[count].start = (new Date(t0)).toISOString();
				currentMeasureResult[count].value = latency;
				count++;
				totalTime += latency;

				//Il server è stato pingato il numero di volte richiesto
				if (count === times) {
					let pingAvgValue = totalTime / count;

					if (!measureResultsContainer.server) { //primo server che viene pingato
						measureResultsContainer.server = hostName;
						latencyAvgValue = pingAvgValue;
						measureResult = currentMeasureResult;
					} else {
						if (latencyAvgValue && pingAvgValue < latencyAvgValue) {
							measureResultsContainer.server = hostName;
							latencyAvgValue = pingAvgValue;
							measureResult = currentMeasureResult;
						}
					}

					//Funzione per gestire il passaggio a un altro server da pingare oppure all'esecuzione della prossima funzione
					handleErrorsOrTimeoutsOrTestFinished();

					//Il test non è finito, il server deve essere ancora pingato
				} else {
					sendPingMessage();
				}
			}
		}; //end onmessage

	} //end pingTest function

	self.postMessage(JSON.stringify({
		type: 'measure',
		content: {
			'test_type': 'ping'
		}
	}));

	pingTest(arrayOfHostNamesAndPorts, times, maxTimeout, nextFunction);
}
/**************End Ping code wrapper*************/

/************** packetLossTest code wrapper*************/
function packetLossTest(arrayOfHostNamesAndPorts, packetsToSend, packetFrequency, maxTimeout, nextFunction) {

	self.postMessage(JSON.stringify({
		type: 'measure',
		content: {
			'test_type': 'packetLoss'
		}
	}));

	lossTest(arrayOfHostNamesAndPorts, packetsToSend, packetFrequency, maxTimeout, nextFunction);

	/*************Ping multiple servers***************/
	function lossTest(arrayOfHostNamesAndPorts, packetsToSend, packetFrequency, maxTimeout, nextFunction) {
		let hostName = arrayOfHostNamesAndPorts[0];
		let hostNameAndPort = hostName + ':' + serverPorts[1];

		let packetsLost = 0;
		let pktSent = 0;
		let pktReceived = 0;
		let timeout;
		let timeoutEventFired = false;
		let testFinished = false;

		let ws = new WebSocket('ws://' + hostNameAndPort);

		let websocketConnectionFailedTimeout = setTimeout(function() {
			//Il websocket si trova ancora in stato connecting e non è stata ancora instaurata la connessione
			if (ws.readyState === 0) {
				//Chiamare ws.close() quando non è stata ancora aperta la connessione causa una chiusura del websocket con event code = 1006. 
				//Questa cosa implica la chiamata dell'event handler onclose che a sua volta chiamerà handleErrorsOrTimeoutsOrTestFinished
				ws.close();
			}
		}, 2000);

		ws.onopen = function() {
			//console.log(this);
			//TODO console.log(packetFrequency);
			//TODO console.log(maxTimeout);
			clearTimeout(websocketConnectionFailedTimeout);
			let interval = setInterval(function() {
				if (pktSent < packetsToSend) {
					pktSent++;
					sendPingMessage();
				} else {
					testFinished = true;
					clearInterval(interval);
				}
			}, 5 /*TODO packetFrequency */);
			let closeDelay = setTimeout(function() {
				handleErrorsOrTimeoutsOrTestFinished();
			}, 4000 /*TODO maxTimeout */);
		};


		ws.onmessage = function() {
			pktReceived++;
		};


		ws.onclose = function(event) {
			if (event.code != 1000) { // chiusura imprevista della connessione websocket
				handleErrorsOrTimeoutsOrTestFinished();
			}
		};


		function sendPingMessage() {
			ws.send('');
		}


		//funzione di utilità per gestire errori, timeout oppure la terminazione del test di ping
		function handleErrorsOrTimeoutsOrTestFinished() {
			if (ws.readyState < 3) { //se la connessione websocket non è stata chiusa
				ws.close();
			}
			//I pacchetti persi durante il test
			packetsLost = packetsToSend - pktReceived;

			//ho pingato l'ultimo server della lista di server passata come parametro alla funzione
			if (arrayOfHostNamesAndPorts.length === 1) {
				if (nextFunction && measureResultsContainer.server) {
					//Messaggio finale con il risultato del test di ping che viene mandato ad App.js, che arriva alla funzione displayResult
					self.postMessage(JSON.stringify({
						type: 'result',
						content: {
							test_type: 'packetLoss',
							result: packetsLost / packetsToSend * 100
						}
					}));
					nextFunction();
				} else if (!measureResultsContainer.server) {
					self.postMessage(JSON.stringify({
						type: 'error',
						content: 1235
					}));
				}

				//altrimenti, pingo i server restanti
			} else {
				arrayOfHostNamesAndPorts.shift(); //rimuovo l'elemento in testa all'array
				lossTest(arrayOfHostNamesAndPorts, packetsToSend, packetFrequency, maxTimeout, nextFunction);
			}
		} //end handleErrorsOrTimeoutsOrTestFinished function

	} //end lossTest function

}
/************** packetLossTest code wrapper*************/

/*************Download test****************/
function downloadTest(host, bytesToDownload, numberOfStreams, timeout, threshold, gaugeUpdateInterval, nextFunction) {
	var testStartTime = Date.now();
	var previouslyDownloadedBytes = 0;
	var previousDownloadTime = testStartTime;
	var prevInstSpeedInMbs = 0;
	var downloadedBytes = 0;
	var testDone = false;
	var xhrArray = [];
	var firstInterval;
	var secondInterval;
	var measureResult = {
		type: 'download',
		start: (new Date(testStartTime)).toISOString(),
		byte: null,
		value: null
	};

	self.postMessage(JSON.stringify({
		type: 'measure',
		content: {
			test_type: 'download'
		}
	}));

	/*****download stream function*******/
	function downloadStream(index, delay, host) {
		setTimeout(function() {

			if (testDone) {
				return;
			}

			var req = {
				request: 'download',
				data_length: bytesToDownload
			};

			var jsonReq = JSON.stringify(req);
			var url = 'http://' + host + '?r=' + Math.random() + '&data=' + encodeURIComponent(jsonReq);

			var prevLoadedBytes = 0;
			var xhr = new XMLHttpRequest();
			xhrArray[index] = xhr;

			xhrArray[index].onprogress = function(event) {
				addBytes(event.loaded);
			};

			xhrArray[index].onerror = function(event) {
				handleDownloadAndUploadErrors(firstInterval, secondInterval, xhrArray);

				self.postMessage(JSON.stringify({
					type: 'error',
					content: 1236
				}));
			};

			xhrArray[index].onload = function(event) {
				xhrArray[index].abort();
				addBytes(event.loaded);
				downloadStream(index, 0, host);
			};

			xhrArray[index].onabort = function(event) {
				addBytes(event.loaded);
			};

			function addBytes(newTotalBytes) {
				var loadedBytes = newTotalBytes <= 0 ? 0 : (newTotalBytes - prevLoadedBytes);
				downloadedBytes += loadedBytes;
				prevLoadedBytes = newTotalBytes;
			}

			xhrArray[index].responseType = 'arraybuffer';
			xhrArray[index].open('GET', url);
			xhrArray[index].send();
		}, delay);
	}
	/*****end download stream function*******/

	var k = 0;
	var downloadHostAndPorts = [];
	serverPorts.forEach(function(item, index) {
		downloadHostAndPorts[index] = host + ':' + item;
	});
	for (var i = 0; i < numberOfStreams; i++) {
		if (k >= downloadHostAndPorts.length)
			k = 0;

		downloadStream(i, i * 100, downloadHostAndPorts[k]);

		k++;
	}

	firstInterval = setInterval(function() {
		var tf = Date.now();
		var deltaTime = tf - previousDownloadTime;
		var currentlyDownloadedBytes = downloadedBytes;
		var deltaByte = currentlyDownloadedBytes - previouslyDownloadedBytes;
		var instSpeedInMbs = (deltaByte * 8 / 1000.0) / deltaTime;
		var percentDiff = Math.abs((instSpeedInMbs - prevInstSpeedInMbs) / instSpeedInMbs); //potrebbe anche essere negativo

		self.postMessage(JSON.stringify({
			type: 'tachometer',
			content: {
				value: instSpeedInMbs,
				message: {
					info: 'Prequalifica in corso. Attendere prego ...'
				}
			}
		}));

		previousDownloadTime = tf;
		previouslyDownloadedBytes = currentlyDownloadedBytes;
		prevInstSpeedInMbs = instSpeedInMbs;

		if (percentDiff < threshold || (tf - testStartTime > 10000)) {
			var testWarning = false;
			if (tf - testStartTime > 10000) {
				if (instSpeedInMbs === 0) {
					handleDownloadAndUploadErrors(firstInterval, secondInterval, xhrArray);

					self.postMessage(JSON.stringify({
						type: 'error',
						content: 1238
					}));
					return;
				}
				testWarning = true;
			}
			var measureStartTime = Date.now();
			downloadedBytes = 0;
			clearInterval(firstInterval);

			secondInterval = setInterval(function() {
				var time = Date.now();
				var downloadTime = time - measureStartTime;
				var downloadedBytesAtThisTime = downloadedBytes;
				var downloadSpeedInMbs = (downloadedBytesAtThisTime * 8 / 1000) / downloadTime;
				if (testWarning) {
					self.postMessage(JSON.stringify({
						type: 'tachometer',
						content: {
							value: downloadSpeedInMbs,
							message: {
								warning: 'La tua connessione non risulta essere particolarmente stabile. Pertanto il risultato del test di download potrebbe non essere del tutto accurato'
							}
						}
					}));
				} else {
					self.postMessage(JSON.stringify({
						type: 'tachometer',
						content: {
							value: downloadSpeedInMbs,
							message: {
								info: 'Misurazione in corso...'
							}
						}
					}));
				}

				if ((time - measureStartTime) >= timeout) {
					closeAllConnections(xhrArray);
					clearInterval(secondInterval);
					testDone = true;
					var totalTime = (time - testStartTime) / 1000.0;
					var measureTime = time - measureStartTime;
					var downloadSpeedInKbs = downloadSpeedInMbs * 1000;
					measureResult.byte = downloadedBytesAtThisTime;
					measureResult.value = measureTime;
					measureResultsContainer.tests.push(measureResult);
					self.postMessage(JSON.stringify({
						type: 'result',
						content: {
							test_type: 'download',
							result: downloadSpeedInKbs
						}
					}));

					//esegui, se presente, la successiva funzione
					if (nextFunction) {
						nextFunction();
					}
				}
			}, 500 /*TODO this.gaugeUpdateInterval*/ );
		}
	}, 3000);

}
/*************End download test****************/

/*************Upload test****************/
function uploadTest(host, bytesToUpload, numberOfStreams, timeout, threshold, gaugeUpdateInterval, nextFunction) {
	var testStartTime = Date.now();
	var previouslyUploadedBytes = 0;
	var previousUploadTime = testStartTime;
	var prevInstSpeedInMbs = 0;
	var testData = generateTestData(bytesToUpload / (Math.pow(1024, 2)));
	var uploadedBytes = 0;
	var testDone = false;
	var xhrArray = [];
	var firstInterval;
	var secondInterval;
	var measureResult = {
		type: 'upload',
		start: (new Date(testStartTime)).toISOString(),
		byte: null,
		value: null
	};

	self.postMessage(JSON.stringify({
		type: 'measure',
		content: {
			test_type: 'upload'
		}
	}));

	/***************upload stream*************/
	function uploadStream(index, delay, host) {
		setTimeout(function() {

			if (testDone) {
				return;
			}

			var url = 'http://' + host + '?r=' + Math.random();
			var url2 = 'http://192.168.1.180:60100' + '?r=' + Math.random();

			var prevLoadedBytes = 0;
			var xhr = new XMLHttpRequest();
			xhrArray[index] = xhr;

			xhrArray[index].upload.onprogress = function(event) {
				addBytes(event.loaded);
			};

			xhrArray[index].onerror = function(event) {
				handleDownloadAndUploadErrors(firstInterval, secondInterval, xhrArray);

				self.postMessage(JSON.stringify({
					type: 'error',
					content: 1237
				}));
			};

			xhrArray[index].upload.onload = function(event) {
				xhrArray[index].abort();
				addBytes(event.loaded);
				uploadStream(index, 0, host);
			};

			xhrArray[index].upload.onabort = function(event) {
				addBytes(event.loaded);
			};

			function addBytes(newTotalBytes) {
				var loadedBytes = newTotalBytes <= 0 ? 0 : (newTotalBytes - prevLoadedBytes);
				uploadedBytes += loadedBytes;
				prevLoadedBytes = newTotalBytes;
			}

			xhrArray[index].open('POST', url);
			//xhrArray[index].setRequestHeader('Content-Encoding', 'identity');
			xhrArray[index].send(testData);
		}, delay);
	}
	/***************end upload stream *************/

	var k = 0;
	var uploadHostAndPorts = [];
	serverPorts.forEach(function(item, index) {
		uploadHostAndPorts[index] = host + ':' + item;
	});
	for (var i = 0; i < numberOfStreams; i++) {
		if (k >= uploadHostAndPorts.length)
			k = 0;

		uploadStream(i, i * 100, uploadHostAndPorts[k]);

		k++;
	}

	firstInterval = setInterval(function() {
		var tf = Date.now();
		var deltaTime = tf - previousUploadTime;
		var currentlyUploadedBytes = uploadedBytes;
		var deltaByte = currentlyUploadedBytes - previouslyUploadedBytes;
		var instSpeedInMbs = (deltaByte * 8 / 1000.0) / deltaTime;
		var percentDiff = Math.abs((instSpeedInMbs - prevInstSpeedInMbs) / instSpeedInMbs); //potrebbe anche essere negativo

		self.postMessage(JSON.stringify({
			type: 'tachometer',
			content: {
				value: instSpeedInMbs,
				message: {
					info: 'Prequalifica in corso. Attendere prego...'
				}
			}
		}));

		previousUploadTime = tf;
		previouslyUploadedBytes = currentlyUploadedBytes;
		prevInstSpeedInMbs = instSpeedInMbs;

		if (percentDiff < threshold || (tf - testStartTime >= 10000)) {
			var testWarning = false;

			if (tf - testStartTime >= 10000) {
				if (instSpeedInMbs === 0) {
					handleDownloadAndUploadErrors(firstInterval, secondInterval, xhrArray);

					self.postMessage(JSON.stringify({
						type: 'error',
						content: 1238
					}));
					return;
				}
				testWarning = true;
			}
			var measureStartTime = Date.now();
			uploadedBytes = 0;
			clearInterval(firstInterval);

			secondInterval = setInterval(function() {
				var time = Date.now();
				var uploadTime = time - measureStartTime;
				var uploadedBytesAtThisTime = uploadedBytes;
				var uploadSpeedInMbs = (uploadedBytesAtThisTime * 8 / 1000) / uploadTime;

				if (testWarning) {
					self.postMessage(JSON.stringify({
						type: 'tachometer',
						content: {
							value: uploadSpeedInMbs,
							message: {
								warning: 'La tua connessione non risulta essere particolarmente stabile. Pertanto il risultato del test di upload potrebbe non essere del tutto accurato'
							}
						}
					}));
				} else {
					self.postMessage(JSON.stringify({
						type: 'tachometer',
						content: {
							value: uploadSpeedInMbs,
							message: {
								info: 'Misurazione in corso...'
							}
						}
					}));
				}

				if ((time - measureStartTime) >= timeout) {
					closeAllConnections(xhrArray);
					clearInterval(secondInterval);
					testDone = true;
					var measureTime = time - measureStartTime;
					var totalTime = (time - testStartTime) / 1000.0;
					var uploadSpeedInKbs = uploadSpeedInMbs * 1000;
					measureResult.byte = uploadedBytesAtThisTime;
					measureResult.value = measureTime;
					measureResultsContainer.tests.push(measureResult);

					self.postMessage(JSON.stringify({
						type: 'result',
						content: {
							test_type: 'upload',
							result: uploadSpeedInKbs
						}
					}));

					if (nextFunction) {
						nextFunction();
					}
				}
			}, 500 /*TODO this.gaugeUpdateInterval*/ );
		}
	}, 3000);

}
/*************End upload test****************/