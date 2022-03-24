$(function() {

	$('#payloadP').hide();
	$('#error').hide();




	$('input.payload').click(function() {
		$('#payload').val('');
		$('#payloadP').show();
	});

	$('input.noPayload').click(function() {
		$('#payload').val('');
		$('#payloadP').hide();
	});


	$('button.close').click(function() {
		$('#error').hide();
	});

	$('#setting').click(function() {
		loadLocalStorage('storage');

	});

	$('#respHeaderA').click(function() {
		$('#responseHeaders').modal('show');
	});

	$('#reqHeaderA').click(function() {
		$('#reqestHeaders').modal('show');
	});

	$('a#header-add').click(function() {
		var num = parseInt($('#reqHeadersT>tbody>tr>th:last').text()) + 1;
		var html = '<tr><th scope="row" style="vertical-align: middle;">' + num +
			'</th><td><input type="text" class="form-control header-key" placeholder="Key..."></td><td><input type="text" class="form-control header-value" placeholder="Value..."></td></tr>';
		$('#reqHeadersT>tbody>tr:last').after(html);

	});

	$('a#header-del').click(function() {
		if ($('#reqHeadersT>tbody>tr>th:last').text() !== '1') {
			$('#reqHeadersT>tbody>tr:last').remove();
		}
	});


	$('#submit').click(submit);
	$('button.saveStore').click(function() {
		saveLocalStorage($('#aws_access_key').val(), $('#aws_secret_key').val(), $('#aws_cn_access_key').val(), $('#aws_cn_secret_key').val());
	});

	loadLocalStorage();

});

function parseUrl(url) {
	var parser = document.createElement('a');
	parser.href = url;

	parser.protocol; // => "http:"
	parser.hostname; // => "example.com"
	parser.port; // => "3000"
	parser.pathname; // => "/pathname/"
	parser.search; // => "?search=test"
	parser.hash; // => "#hash"
	parser.host; // => "example.com:3000"

	return parser;
}



function submit() {
	$('#response').val('');

	var endpoint = $('#endpoint').val();
    var url_list = endpoint.split('.')

	var region = url_list[1];
	var service = url_list[0].replace("https://", "");
	if (region === 'amazonaws') {
		region = 'us-east-1'
	}
	var schema = url_list[url_list.length-1]
	var access_key = (schema==='cn') ? $('#cn_access_key').val() : $('#access_key').val();
	var secret_key = (schema==='cn') ? $('#cn_secret_key').val() : $('#secret_key').val();

	var timeStamp = new Date();
	var datestamp = getDateString(timeStamp);
	var amzdate = getTimeString(timeStamp);

	var method = $("input:radio[name=method]:checked").val();
	
	var host = parseUrl($('#endpoint').val()).hostname;


	
	var request_parameters = $('#parameters').val();
	var payload = $('#payload').val();
	var canonical_uri = $('#uri').val();
	var payload_hash = Crypto.SHA256(payload);
	var canonical_querystring = request_parameters;
	var a_signed_headers = ['host', 'x-amz-date'];

	var headerKeyList = $('#reqHeadersT>tbody>tr>td>input.header-key');
	var headerValList = $('#reqHeadersT>tbody>tr>td>input.header-value');
	var headers = {};
	for (var i = 0; i < headerKeyList.length; i++) {
		var key = $(headerKeyList[i]).val();
		var val = $(headerValList[i]).val();
		if (key && val && key !== '' && val !== '') {
			headers[key.toLowerCase()] = val;
			a_signed_headers.push(key.toLowerCase());

		}

	}

	var signed_headers = a_signed_headers.sort().toString().replace(/,/g, ';');

	var canonical_headers = '';
	headers['host'] = host;
	headers['x-amz-date'] = amzdate;
	var headerList = Object.keys(headers).sort();

	for (var a in headerList) {
		canonical_headers = canonical_headers + headerList[a] + ':' + headers[headerList[a]] + '\n';
	}

	var canonical_request = method + '\n' + canonical_uri + '\n' + canonical_querystring + '\n' + canonical_headers + '\n' + signed_headers + '\n' + payload_hash;

	//console.log(canonical_request);
	var algorithm = 'AWS4-HMAC-SHA256';
	var credential_scope = datestamp + '/' + region + '/' + service + '/' + 'aws4_request';
	var string_to_sign = algorithm + '\n' + amzdate + '\n' + credential_scope + '\n' + Crypto.SHA256(canonical_request);

	var keySigned = getSignatureKey(secret_key, datestamp, region, service);

	var signature = Crypto.HMAC(Crypto.SHA256, string_to_sign, keySigned);

	var authorization_header = algorithm + ' ' + 'Credential=' + access_key + '/' + credential_scope + ', ' + 'SignedHeaders=' + signed_headers + ', ' + 'Signature=' + signature;

	// Chrome & JQuery Ajax function not allowed modify the host header and add it auto
	delete headers.host;

	headers['Authorization'] = authorization_header;
	headers['x-amz-content-sha256'] = payload_hash;


	var request_url = endpoint + canonical_uri + ((canonical_querystring === '') ? '' : '?') + canonical_querystring;

	$.ajax({
		method: method,
		url: request_url,
		headers: headers,
		processData: false,
		data: payload,
		timeout: 30000,
		complete: function() {
			$('#progress').modal('hide');
		},
		success: function(data, status, xhr) {

			setOutput(xhr, data);

		},
		error: function(xhr, status, err) {
			$('span.badge').text(xhr.status + ': ' + err);
			$('#error').show();
			if (xhr.responseText)
				setOutput(xhr, xhr.responseText, 'err');
		}
	});
}

function setOutput(xhr, data, err) {
	var headers = xhr.getAllResponseHeaders().split('\n');

	var contentType = xhr.getResponseHeader('Content-Type');

	if (contentType)
		contentType = contentType.split(';')[0];
	var html = '';
	for (var i = 0; i < headers.length; i++)
		if (headers[i] !== '')
			html = html + '<li class="list-group-item">' + headers[i] + '</li>';
	$('#respHeaderList').html(html);
	if (contentType) {
		if (contentType.toLowerCase().indexOf('xml') >= 0)
			if (!err)
				$('#response').val(formatXml(new XMLSerializer().serializeToString(data.documentElement)));
			else
				$('#response').val(formatXml(data));
		else if (contentType.toLowerCase().indexOf('json') >= 0) {
			if (typeof data === 'string')
				data = JSON.parse(data);
			$('#response').val(JSON.stringify(data, null, 4));
		} else {
			chrome.fileSystem.chooseEntry({
				type: 'saveFile',
				suggestedName: 'reponse.data',
				acceptsAllTypes: true
			}, function(writableFileEntry) {
				writableFileEntry.createWriter(function(writer) {
					var truncated = false;
					writer.onwriteend = function(e) {
						$('#response').val('Download complete!');
					};
					writer.onerror = function(e) {
						console.log('Export failed: ' + e.toString());
					};
					writer.write(new Blob([data], {
						type: contentType
					}));
				});
			});
		}
	} else {
		$('#response').val(data);
	}

}

function getSignatureKey(key, dateStamp, regionName, serviceName) {

	var kDate = Crypto.HMAC(Crypto.SHA256, dateStamp, "AWS4" + key, {
		asBytes: true
	})
	var kRegion = Crypto.HMAC(Crypto.SHA256, regionName, kDate, {
		asBytes: true
	});
	var kService = Crypto.HMAC(Crypto.SHA256, serviceName, kRegion, {
		asBytes: true
	});
	var kSigning = Crypto.HMAC(Crypto.SHA256, "aws4_request", kService, {
		asBytes: true
	});

	return kSigning;
}

function formatString(s) {
	return s < 10 ? ('0' + String(s)) : String(s);
}

function getDateString(d) {
	var y = d.getUTCFullYear();
	var m = d.getUTCMonth() + 1;
	var dt = d.getUTCDate();
	return String(y) + formatString(m) + formatString(dt);
}

function getTimeString(d) {
	var h = d.getUTCHours();
	var m = d.getUTCMinutes();
	var s = d.getUTCSeconds();
	return getDateString(d) + 'T' + formatString(h) + formatString(m) + formatString(s) + 'Z';
}

function toHexString(byteArray) {
	return byteArray.map(function(byte) {
		return ('0' + (byte & 0xFF).toString(16)).slice(-2);
	}).join('')
}

function loadLocalStorage(setting) {

	chrome.storage.sync.get({
		aws_access_key: '',
		aws_secret_key: '',
		aws_cn_access_key: '',
		aws_cn_secret_key: ''
	}, function(store) {

		$('#access_key').val(store.aws_access_key);
		$('#secret_key').val(store.aws_secret_key);
		$('#cn_access_key').val(store.aws_cn_access_key);
		$('#cn_secret_key').val(store.aws_cn_secret_key);
		$('#aws_access_key').val(store.aws_access_key);
		$('#aws_secret_key').val(store.aws_secret_key);
		$('#aws_cn_access_key').val(store.aws_cn_access_key);
		$('#aws_cn_secret_key').val(store.aws_cn_secret_key);


		if (store.aws_access_key === '' || store.aws_secret_key === '' || setting) {
			$('#saveKey').modal('show');
		} else {
			$('#saveKey').modal('hide');
		}
	});

}

function saveLocalStorage(access_key, secret_key, cn_access_key, cn_secret_key) {

	chrome.storage.sync.set({
			'aws_access_key': access_key,
			'aws_secret_key': secret_key,
			'aws_cn_access_key': cn_access_key,
			'aws_cn_secret_key': cn_secret_key
		},
		function() {
			$('#access_key').val(access_key);
			$('#secret_key').val(secret_key);
			$('#cn_access_key').val(cn_access_key);
			$('#cn_secret_key').val(cn_secret_key);
			$('#saveKey').modal('hide');
		});
}

function formatXml(xml) {
	var formatted = '';
	var reg = /(>)(<)(\/*)/g;
	xml = xml.replace(reg, '$1\r\n$2$3');
	var pad = 0;
	jQuery.each(xml.split('\r\n'), function(index, node) {
		var indent = 0;
		if (node.match(/.+<\/\w[^>]*>$/)) {
			indent = 0;
		} else if (node.match(/^<\/\w/)) {
			if (pad != 0) {
				pad -= 1;
			}
		} else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
			indent = 1;
		} else {
			indent = 0;
		}

		var padding = '';
		for (var i = 0; i < pad; i++) {
			padding += '  ';
		}

		formatted += padding + node + '\r\n';
		pad += indent;
	});

	return formatted;
}