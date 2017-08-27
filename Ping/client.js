var pingGlobalVariables={
	n_tot: 4,
	totalTime: 0,
	count: 0,
	firstPing: false
};

var speedTestGlobalVariables={
	serverUri: 'http://ec2-35-160-194-81.us-west-2.compute.amazonaws.com:8080',
	testStatus: 0, // 0: not started, 1: ping test, 2: download test, 3: upload test, 4: finished
	speedtestFailed: false
}

function ping(){
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
			ping(); //escludo il primo ping
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
			}
			else{
				ping();
			}
		}
	}// end onload

	xhr.open('HEAD',speedTestGlobalVariables.serverUri + '?no-cache=' + Math.random());
	t0=Date.now();
	xhr.send();
}

ping();
