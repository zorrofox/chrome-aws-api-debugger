$.ajax({
	method: 'GET',
	url: 'http://docs.aws.amazon.com/general/latest/gr/rande.html',
	success: function(data, status, xhr) {
		var endpointList = [];
		var regionList = [];

		var listJ = $(data).find('div.table>div.table-contents>table>tbody');
		for (var i = 0; i < listJ.length; i++) {
			var trList = $(listJ[i]).find('tr');
			for (var j = 0; j < trList.length; j++) {
				var tdList = $(trList[j]).find('td');
				var endpoint = {};

				var region = $(tdList[1]).text().replace(/[^a-zA-Z0-9\.:\/-]/g, '');
				var url = $(tdList[2]).text().replace(/[^a-zA-Z0-9\.:\/-]/g, '');
				if (region && url && region.indexOf('s3-website') < 0 && region.indexOf('mturk') < 0 && region.indexOf('HTTPS') < 0 && region.indexOf('MQTT') < 0 && region.indexOf('MQTToverWebSocket') < 0) {
					if (!regionList.includes(region))
						regionList.push(region);
					endpoint.region = region;
					endpoint.url = url;
					endpointList.push(endpoint);
				}
			}

		}

		console.log(endpointList);
		console.log(regionList);
	},
	error: function(xhr) {
		console.log('error!');
		console.log(xhr);

	}
});