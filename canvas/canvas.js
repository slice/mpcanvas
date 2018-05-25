'use strict';

console.info('hewwo! owo');

const status = document.querySelector('#status');

// state
const mouse = { x: 0, y: 0 };
const trail = { x: 0, y: 0 };
let down = false;

// drawing
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// net
const port = 8080;
const ws = new WebSocket(`ws://${window.location.hostname}:${port}`);

function draw(before = trail, after = mouse) {
  ctx.beginPath();
  ctx.moveTo(before.x, before.y);
  ctx.lineTo(after.x, after.y);
  ctx.closePath();
  ctx.stroke();
}

ws.addEventListener('open', () => {
  console.info('ws: open');
});

ws.addEventListener('message', ({ data }) => {
  let packet;

  try {
    packet = JSON.parse(data);
  } catch (error) {
    console.error('failed to parse packet:', error);
    return;
  }

  if (packet.t === 'PEN') {
    console.log(packet);
    const { d: { trail: remoteTrail, mouse: remoteMouse } } = packet;
    draw(remoteTrail, remoteMouse);
  } else if (packet.t === 'CANVAS') {
    for (const { trail: remoteTrail, mouse: remoteMouse } of packet.d) {
      draw(remoteTrail, remoteMouse);
    }
  }
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('ready!');
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'blue';

  ws.addEventListener('error', () => {
    status.innerText = 'error';
    status.style.display = 'inherit';
    console.error('ws: error');
  });

  ws.addEventListener('close', () => {
    status.innerText = 'lost connection';
    status.style.display = 'inherit';
    console.error('ws: close');
  });

  ws.addEventListener('open', () => {
    status.style.display = 'none';
    console.info('ws: open');
  });
});

canvas.addEventListener('mousemove', function mousemove(event) {
  trail.x = mouse.x; trail.y = mouse.y;

  mouse.x = event.pageX - this.offsetLeft;
  mouse.y = event.pageY - this.offsetTop;

  if (down && trail.x !== 0) {
    draw(trail, mouse);

    ws.send(JSON.stringify({
      t: 'PEN',
      d: {
        trail, mouse,
      },
    }));
  }
});

canvas.addEventListener('mousedown', () => {
  down = true;
});

canvas.addEventListener('mouseup', () => {
  down = false;
});

function stretch() {
  const { innerWidth: width, innerHeight: height } = window;
  console.log('size update (%dx%d)', width, height);
  canvas.width = width;
  canvas.height = height;
}

stretch();
window.addEventListener('resize', stretch);
