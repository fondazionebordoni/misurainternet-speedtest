function handleClick(){
	$("select").attr("disabled","true");
	$("input").attr("disabled","true");
	$("button").attr("disabled","true");
	var testType=document.getElementById("testType").value;
	var hostName=document.getElementById("hostName").value;
	var worker=new Worker('/client.js');
	var request;
	if(testType==='Ping'){
		var numOfPings=Number(document.getElementById("numOfPings").value);
		request={type: 'ping', numOfPings: numOfPings};
	}

	else if(testType==='Download' || testType==='Upload'){
		var numOfMB=Number(document.getElementById("numOfMB").value);
		var numOfStreams=Number(document.getElementById("numOfStreams").value);

		if(testType==='Download'){
			request={type: 'download', numOfMB: numOfMB, numOfStreams: numOfStreams};
		}
		else{ //upload test
			request={type: 'upload', numOfMB: numOfMB, numOfStreams: numOfStreams};
		}
	}

	//altrimenti fai il test completo con le impostazioni di default
	else{
		request={type: 'speedtest'};
	}

	worker.onmessage=function(message){
		var response=JSON.parse(message.data);

		//se il test è finito ripristina la form come era prima
		if(response.status==='finished'){
			$("select").removeAttr("disabled");
			$("input").removeAttr("disabled");
			$("button").removeAttr("disabled");
		}
	}
	worker.postMessage(JSON.stringify(request));
}
