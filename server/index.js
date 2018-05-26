'use strict';

const fs = require('fs');

const WebSocket = require('ws');
const {
  port = 8080,
  maxPacketLength = 4096,
  canvasFilename = 'canvas.json',
} = require('../config.json');

let canvas = [];
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

function save() {
  fs.writeFileSync(canvasFilename, JSON.stringify(canvas), 'utf-8');
  console.log('[+] saved canvas to', canvasFilename);
}

setInterval(save, 1000 * 5);

if (fs.existsSync(canvasFilename)) {
  console.log('[*] read existing canvas');
  canvas = JSON.parse(fs.readFileSync(canvasFilename, 'utf-8'));
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
