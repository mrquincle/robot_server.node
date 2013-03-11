var zmq = require('zmq')

var videoSubscriber = zmq.socket('pull')
, videoPublisher = zmq.socket('pub')

var videoPending = 0

var commandReceiver = zmq.socket('pull')
, commandPublisher = zmq.socket('pub')

var commandPending = 0

// default port definition
// note: this defines the receiving port, the 
//       sending port is always equal to
//       receiving port + 1
var videoPort 	= 4000
, commandPort   = 4010

// check if ports were provided as arguments
process.argv.forEach(function (val, index, array) {
	switch(index) {
	case 2: 
		videoPort = val
		break;
	case 3:
		commandPort = val
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

// Video Forwarder -------------------------------------------------
// a video message has 4 fields, target, width, height and data
videoSubscriber.on('message', function(target, data) {
	videoPending++
	// console.log('Video received ', videoPending)
	// forward (publish) the received video frame to the subscribed clients
	videoPublisher.send([target, data])
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

// Video Forwarder -------------------------------------------------
// a video message has 4 fields, target, width, height and data
commandReceiver.on('message', function(target, data) {
	commandPending++
	console.log('Command received ', commandPending, ':', target.toString(), data.toString())
	// forward (publish) the received video frame to the subscribed clients
	commandPublisher.send([target, data])
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

// Shutdown ------------------------------------------------------------------
process.on('SIGINT', function() {
	console.log('\nclosing')
	videoSubscriber.close()
	videoPublisher.close()
	commandReceiver.close()
	commandPublisher.close()
})