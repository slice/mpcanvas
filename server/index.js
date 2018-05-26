'use strict';

const WebSocket = require('ws');
const {
  port = 8080,
  maxPacketLength = 4096,
} = require('../config.json');

const canvas = [];
const ws = new WebSocket.Server({
  port,
});

function message(conn, data) {
  let packet;

  if (data.length > maxPacketLength) {
    // don't bother.
    return;
  }

  try {
    packet = JSON.parse(data);
  } catch (error) {
    console.error('[-] failed to parse json packet:', error);
    return; // bail
  }

  console.log('[*]', packet);

  if (packet.t === 'PEN') {
    canvas.push(packet.d);

    for (const client of ws.clients) {
      client.send(JSON.stringify(packet));
    }
  }
}

ws.on('connection', (conn) => {
  console.log('[+] connection');

  conn.send(JSON.stringify({
    t: 'CANVAS',
    d: canvas,
  }));

  conn.on('close', () => {
    console.log('[-] connection');
  });

  conn.on('message', (data) => {
    message(conn, data);
  });
});
