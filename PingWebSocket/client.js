var pingGlobalVariables={
	n_tot: 4,
};

var speedTestGlobalVariables={
	serverName: 'ec2-35-160-194-81.us-west-2.compute.amazonaws.com:8080',
	testStatus: 0, // 0: not started, 1: ping test, 2: download test, 3: upload test, 4: finished
	speedtestFailed: false
}

function ping(nextFunction){
	var count=0;
	var totalTime=0;
	var t0=0;
	var ws=new WebSocket('ws://' + speedTestGlobalVariables.serverName);

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
		count++;
		var latency= tf - t0;
		totalTime+=latency;

		console.log('INFO: Sono stati effettuati ' + count + ' ping');
		console.log('INFO: Il ping è ' + latency + 'ms');
		console.log('INFO: Il tempo TOTALE è ' + totalTime + 'ms');

		if(count===pingGlobalVariables.n_tot){
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
	
}

ping();
