var Discordie = require("discordie");
var client = new Discordie();

var lame = require('lame');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('Discord.config'))
var audioList = {};



client.connect({
  // replace this sample token
  token: config.DiscordToken
});

client.Dispatcher.on("GATEWAY_READY", e => {
  console.log("Connected as: " + client.User.username);
  reloadAudio();
});

client.Dispatcher.on("MESSAGE_CREATE", e => {
	console.log("e.message.content: " + e.message.content);

	if(e.message.content.indexOf("!parrot ") == 0) {
		e.message.channel.sendMessage(e.message.content.replace("parrot ", ""));
	}
	if(e.message.content == "!ping") {
		e.message.channel.sendMessage("pong");
	}
	if(e.message.content == "!vleave") {
		vleave(e.message);
	}
	if(e.message.content.indexOf("!vjoin ") == 0) {
		vjoin(e.message);
	}
	if(e.message.content.indexOf("!play") == 0) {
		play(e.message);
	}
	if(e.message.content == "!audiolist"){
		audiolist(e.message);
	}

});

function vjoin(message){
	const targetChannel = message.content.replace("!vjoin ", "");
		message.channel.sendMessage("Joining Channel: "+ targetChannel);

		message.channel.guild.voiceChannels
		.forEach(channel => {
			if(channel.name.toLowerCase().indexOf(targetChannel) >= 0)
				channel.join();
		});
}

function vleave(message){
	var c = message.channel;
  console.log("Leaving vchannel");
	client.Channels
	.filter(channel => channel.type == "voice")
	.forEach(channel => {
		if(channel.joined)
			channel.leave();
	});
}

var stopPlaying = false;
function play(message) {
	stopPlaying = false;
	if(!client.VoiceConnections.length) {
		return message.reply("Not connected to any channel");
	}

	var playCommand = message.content.replace("!play ", "").toLowerCase();
	console.log("PlayCommand: "+ playCommand);
	var file = audioList[playCommand];

	if(file == undefined)
	{
		message.reply("Audio Clip " + playCommand + " Not Found")
	}

	var mp3decoder = new lame.Decoder();
	mp3decoder.on('format', decode);
	fs.createReadStream("AudioClips/" + file).pipe(mp3decoder);

	function decode(pcmfmt) {
		// note: discordie encoder does resampling if rate != 48000
		var options = {
			frameDuration: 60,
			sampleRate: pcmfmt.sampleRate,
			channels: pcmfmt.channels,
			float: false
		};

		const frameDuration = 60;

		var readSize =
			pcmfmt.sampleRate / 1000 *
			options.frameDuration *
			pcmfmt.bitDepth / 8 *
			pcmfmt.channels;

		mp3decoder.once('readable', function() {
			if(!client.VoiceConnections.length) {
				return console.log("Voice not connected");
			}

			var voiceConnection = client.VoiceConnections[0].voiceConnection;

			// one encoder per voice connection
			var encoder = voiceConnection.getEncoder(options);

			const needBuffer = () => encoder.onNeedBuffer();
			encoder.onNeedBuffer = function() {
				var chunk = mp3decoder.read(readSize);
				if (stopPlaying) return;

				// delay the packet if no data buffered
				if (!chunk) return setTimeout(needBuffer, options.frameDuration);

				var sampleCount = readSize / pcmfmt.channels / (pcmfmt.bitDepth / 8);
				encoder.enqueue(chunk, sampleCount);
			};

			needBuffer();
		});
	}
}

function reloadAudio(message){
	audioList = {};
	fs.readdir("AudioClips/",function(err, files){
		if (err) {
			return console.error(err);
		}
		files.forEach( function (file){
			var command = file.toLowerCase().replace(".mp3","");
			audioList[command] = file;
		});
	});
}

function audiolist(message){

	var reply = "Avalable Audio Commands: \n"

	var keys = Object.keys(audioList);

	keys.forEach(key => {
		reply += "  - " + key + "\n";
	})
	message.channel.sendMessage(reply);
	console.log(audioList);
}
