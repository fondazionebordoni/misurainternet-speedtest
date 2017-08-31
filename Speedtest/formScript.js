function handleClick(){
	$("select").attr("disabled","true");
	$("input").attr("disabled","true");
	$("button").attr("disabled","true");

	var testType=document.getElementById("testType").value;
	var hostName=document.getElementById("hostName").value;
	var numOfMB=Number(document.getElementById("numOfMB").value);
	var numOfStreams=Number(document.getElementById("numOfStreams").value);
	var numOfPings=Number(document.getElementById("numOfPings").value);
	var worker=new Worker('/client.js');
	var request;
	
	if(testType==='Ping'){
		request={type: 'ping', numOfPings: numOfPings, hostName: hostName};
	}

	else if(testType==='Download' || testType==='Upload'){

		if(testType==='Download'){
			request={type: 'download', numOfMB: numOfMB, numOfStreams: numOfStreams, hostName: hostName};
		}
		else{ //upload test
			request={type: 'upload', numOfMB: numOfMB, numOfStreams: numOfStreams, hostName: hostName};
		}
	}

	//altrimenti fai il test completo (uso lo stesso numero di byte e di connessioni per i test di upload e download)
	else{
		request={type: 'speedtest', numOfPings: numOfPings, numOfMB: numOfMB, numOfStreams: numOfStreams, hostName: hostName};
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
