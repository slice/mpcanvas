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

function send(socket, packet) {
  if (socket.readyState !== 1) {
    console.log('[*] dropping packet for', socket, 'not yet ready');
    return;
  }

  socket.send(JSON.stringify(packet));
}

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
      send(client, packet);
    }
  }
}

ws.on('connection', (conn) => {
  console.log('[+] connection');

  send(conn, {
    t: 'CANVAS',
    d: canvas,
  });

  conn.on('close', (code, reason) => {
    console.log('[-] connection (code: %s, reason: %s)', code, reason);
  });

  conn.on('message', (data) => {
    message(conn, data);
  });
});
