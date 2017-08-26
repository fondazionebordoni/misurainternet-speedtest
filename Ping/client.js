var pingGlobalVariables={
	n_tot: 4,
	totalTime: 0,
	serverUri: 'http://ec2-35-160-194-81.us-west-2.compute.amazonaws.com:8080',
	count: 0,
	t0: 0,
	firstPing: false
};

function ping(){
	var xhr=new XMLHttpRequest();
	xhr.onload=function(){
		var tf=Date.now();
		pingGlobalVariables.count++;
		console.log(pingGlobalVariables.count);

		if(pingGlobalVariables.count===1 && pingGlobalVariables.firstPing===false){
			var firstPingValue=Date.now() - pingGlobalVariables.t0;
			pingGlobalVariables.firstPing=true;
			pingGlobalVariables.count=0;
			console.log('Primo ping!');
			console.log('Il valore del primo ping è ' + firstPingValue)
			ping(); //escludo il primo ping
		}

		else {
			var latency= tf - pingGlobalVariables.t0;
			pingGlobalVariables.totalTime+=latency;

			console.log('Sono stati effettuati ' + pingGlobalVariables.count + ' ping');
			console.log('Il ping è ' + latency);
			console.log('Il tempo TOTALE è ' + pingGlobalVariables.totalTime);

			if(pingGlobalVariables.count===pingGlobalVariables.n_tot){
				console.log('Misura terminata!');
				console.log('Sono stati effettuati in tutto ' + pingGlobalVariables.count + ' misurazioni');
				console.log('La media è ' + pingGlobalVariables.totalTime/pingGlobalVariables.count);
				return;
			}
			else{
				ping();
			}
		}
	}// end onload

	xhr.open('HEAD',pingGlobalVariables.serverUri + '?no-cache=' + Math.random());
	pingGlobalVariables.t0=Date.now();
	xhr.send();
}

ping();