// var LightServer = require('node-red-contrib-node-lifx');
// var LightServer = require('..');
var mqtt        = require('mqtt');

const LifxClient = require('lifx-lan-client').Client;
const client = new LifxClient();

var config = {
  mqtt: 'mqtt://192.168.202.4:1883',
  server: {
  }
}

var base = 'lifx';

// List of all detected lights
var lightsList = {};

var mqttClient  = mqtt.connect(config.mqtt);

// Wait for connection
mqttClient.on('connect', () => {
  console.log('MQTT-Connect', config);
  // List of all detected lights with topic
  var allLights = [];

  const client = new LifxClient();
  // var server = new LightServer(config.server);

  client.on('light-new', (lightInfo) => {
    console.log('xxx', lightInfo);
    var baseTopic = base + '/' + lightInfo.id;
    if (lightsList.hasOwnProperty(baseTopic))
      return;
    var handle = client.getLightHandler(lightInfo.id);

    // Remember base topic
    lightsList[baseTopic] = handle;

    // Subscribe to topics
    mqttClient.subscribe(baseTopic + '/on');
    mqttClient.subscribe(baseTopic + '/brightness');

    allLights.push({
      name: lightInfo.info.name,
      topic: baseTopic
    });

    // publish list of all detected lights
    mqttClient.publish(base, JSON.stringify(allLights), { retain: true} );
  });
});

// Handle messages
mqttClient.on('message', (topic, message) => {
  console.log('mqtt->', topic, message);
  var pattern = /^(.*)\/(on|brightness)$/;

  // Check that the pattern match
  var match;
  if ((match = pattern.exec(topic)) == null)
    return;

  // Check so we have the light
  if (!lightsList.hasOwnProperty(match[1]))
    return;

  var light = lightsList[match[1]];
  var data = message.toString();

  if (match[2] === 'on') {
    if (!/^(true|false)$/.test(data))
      return;
    light.setLightState({ 'on': (data === 'true') });
  }

  else if (match[2] === 'brightness') {
    if (!/^[0-9]+$/.test(data))
      return;
    light.setLightState({ 'brightness': parseInt(data, 10) })
  }
});
