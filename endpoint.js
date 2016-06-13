$.ajax({
		method: 'GET',
		url: 'http://docs.aws.amazon.com/general/latest/gr/rande.html',
		success: function(data, status, xhr) {
			var endpointList =[];
			var listJ = $(data).find('div#rande>div.section>div.informaltable>div>table>tbody');
			for (var i=0; i<listJ.length; i++){
				var trList = $(listJ[i]).find('tr');
				for (var j=0; j<trList.length; j++){
					var tdList = $(trList[j]).find('td');
					var endpoint={};
					endpoint.region=$(tdList[1]).text().replace(/[^a-zA-Z0-9\.:\/-]/g,'');
					endpoint.url=$(tdList[2]).text().replace(/[^a-zA-Z0-9\.:\/-]/g,'');
					endpointList.push(endpoint);
				}

			}

			console.log(endpointList);
		},
		error: function(xhr) {
			console.log('error!');
			console.log(xhr);

		}
	});