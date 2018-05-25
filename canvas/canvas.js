'use strict';

console.info('hewwo! owo');

const status = document.querySelector('#status');

// state
const mouse = { x: 0, y: 0 };
const trail = { x: 0, y: 0 };
let down = false;

// drawing
let color = '#000000';
let history = [];
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// net
const port = 8080;
const ws = new WebSocket(`ws://${window.location.hostname}:${port}`);

function draw({ trail: before, mouse: after, color: penColor = color, width: penWidth = 5 }) {
  ctx.lineWidth = (penWidth < 0 || penWidth > 5) ? 5 : penWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = penColor;

  ctx.beginPath();
  ctx.moveTo(before.x, before.y);
  ctx.lineTo(after.x, after.y);
  ctx.closePath();
  ctx.stroke();
}

function draws(packets) {
  for (const packet of packets) {
    draw(packet);
  }
}

ws.addEventListener('message', ({ data }) => {
  let packet;

  try {
    packet = JSON.parse(data);
  } catch (error) {
    console.error('failed to parse packet:', error);
    return;
  }

  if (packet.t === 'PEN') {
    // draw onto the canvas
    draw(packet.d);
    history.push(packet.d);
  } else if (packet.t === 'CANVAS') {
    // draw the existing canvas from server and boot history
    draws(packet.d);
    history = packet.d;
  }
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('ready!');

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

  document.querySelector('#color-picker').addEventListener('change', (event) => {
    color = event.target.value;
  });
});

canvas.addEventListener('mousemove', function mousemove(event) {
  trail.x = mouse.x; trail.y = mouse.y;

  mouse.x = event.pageX - this.offsetLeft;
  mouse.y = event.pageY - this.offsetTop;

  if (down && trail.x !== 0) {
    // local draw (fake packet)
    draw({
      trail, mouse,
    });

    // send to server
    ws.send(JSON.stringify({
      t: 'PEN',
      d: {
        trail, mouse, color,
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
  draws(history);
}

stretch();
window.addEventListener('resize', stretch);
