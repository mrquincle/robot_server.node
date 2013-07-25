var zmq = require('zmq')

var videoSubscriber = zmq.socket('sub')
, videoPublisher = zmq.socket('pub')
var videoPending = 0

var videoBase64Publisher = zmq.socket('pub')

var commandReceiver = zmq.socket('pull')
, commandPublisher = zmq.socket('pub')
var commandPending = 0

var eventReceiver = zmq.socket('pull')
, eventPublisher = zmq.socket('pub')

var timestampDelta = 0

// default port definition
// note: this defines the receiving port, the 
//       sending port is always equal to
//       receiving port + 1
var videoPort 	= 4000
, commandPort   = 4010
, eventPort		= 4020

// check if ports were provided as arguments
process.argv.forEach(function (val, index, array) {
	switch(index) {
	case 2: 
		videoPort = val
		break;
	case 3:
		commandPort = val
		break;
	case 4:
		eventPort = val
		break;
	}
})

// implement format string
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

getTime = function() {
	return new Date().getTime();
}

// Video Handling -------------------------------------------------
videoSubscriber.subscribe('');
videoSubscriber.on('message', function(target, rotation, data) {
	try {
		videoPending++

		console.log('Video received ', videoPending)
		// forward (publish) the received video frame to the subscribed clients
		videoPublisher.send([target, rotation, data]);

		// serverProcessed();

		// encode the video frame as base64 and publish it
		videoBase64Publisher.send([target, rotation, data.toString('base64')]);
	} catch(err) {
		console.log('videoSubscriber', err)
	}

})

videoSubscriber.bind('tcp://*:{0}'.format(Number(videoPort)), function(err) {
	if (err)
		console.log(err)
	else
		console.log('Video Listening on {0}'.format(Number(videoPort)))
})

videoPublisher.bind('tcp://*:{0}'.format(Number(videoPort)+1), function(err) {
	if (err)
		console.log(err)
	else
		console.log('Video Sending on {0}'.format(Number(videoPort)+1))
})

videoBase64Publisher.bind('tcp://*:{0}'.format(Number(videoPort)+2), function(err) {
	if (err)
		console.log(err)
	else
		console.log('Video (Base64) Sending on {0}'.format(Number(videoPort)+2))
})

// Command Handling -------------------------------------------------
commandReceiver.on('message', function(target, data) {
	try {
		commandPending++
		console.log('Command received ', commandPending, ':', target.toString(), data.toString())

		// forward (publish) the received video frame to the subscribed clients
		commandPublisher.send([target, data])

		// serverProcessed();
	} catch(err) {
		console.log('commandReceiver', err)
	}

})

commandReceiver.bind('tcp://*:{0}'.format(Number(commandPort)), function(err) {
	if (err)
		console.log(err)
	else
		console.log('Command Listening on {0}'.format(Number(commandPort)))
})

commandPublisher.bind('tcp://*:{0}'.format(Number(commandPort)+1), function(err) {
	if (err)
		console.log(err)
	else
		console.log('Command Sending on {0}'.format(Number(commandPort)+1))
})

// Event Handling -------------------------------------------------
eventReceiver.on('message', function(event) {
	try {
		// console.log("event", event.toString());

		now = getTime();

		jsonEvent = JSON.parse(event);

		if (jsonEvent.target == 'server') {
			if (jsonEvent.event == 'sync_req') {
				sendEvent(jsonEvent.sender, 'sync_req', now);

				setTimeout(function() {
					sendEvent(jsonEvent.sender, 'sync_rep', getTime());
				}, 100);
			}
		} else {
			eventPublisher.send([event]);
		}
	} catch(err) {
		console.log('eventReceiver', err)
	}

})

// subscribe to everything
eventReceiver.bind('tcp://*:{0}'.format(Number(eventPort)), function(err) {
	if (err)
		console.log(err)
	else
		console.log('Event Listening on {0}'.format(Number(eventPort)))
})

eventPublisher.bind('tcp://*:{0}'.format(Number(eventPort)+1), function(err) {
	if (err)
		console.log(err)
	else
		console.log('Event Sending on {0}'.format(Number(eventPort)+1))
})

sendEvent = function(target, eventName, data) {
	var event = {
		target: target,
		sender: 'server',
		event: eventName,
		data: data
	}
	var eventJson = JSON.stringify(event);
	eventPublisher.send([eventJson]);

	// console.log("event sent", eventJson);
}

serverProcessed = function() {
	var now = getTime();
	var corrected = parseInt(now);

	sendEvent("robot", "serverProcessed", corrected);
}

// Shutdown ------------------------------------------------------------------
process.on('SIGINT', function() {
	console.log('\nclosing')
	videoSubscriber.close()
	videoPublisher.close()
	videoBase64Publisher.close()
	commandReceiver.close()
	commandPublisher.close()
	eventPublisher.close()
	eventReceiver.close()
})