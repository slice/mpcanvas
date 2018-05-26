'use strict';

const $ = (...args) => document.querySelector(...args);

const dom = {
  status: {
    elem: $('#status'),
    show(message = this.elem.innerText) {
      this.elem.innerText = message;
      this.elem.style.display = 'flex';
    },
    hide() {
      this.elem.style.display = 'none';
    },
  },
  canvas: $('#canvas'),
};

const state = {
  mouse: { x: 0, y: 0 },
  trail: { x: 0, y: 0 },
  down: false,
};

const pen = {
  color: '#000000',
  width: 5,
};

// net
const ws = new WebSocket(`ws://${window.location.hostname}:8080`);

const canvas = {
  ctx: dom.canvas.getContext('2d'),
  history: [], // all pen strokes so far

  draw({ trail: before, mouse: after, color = pen.color, width = pen.width }) {
    this.ctx.lineWidth = (width < 0 || width > 20) ? 20 : width;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = color;

    this.ctx.beginPath();
    this.ctx.moveTo(before.x, before.y);
    this.ctx.lineTo(after.x, after.y);
    this.ctx.closePath();
    this.ctx.stroke();
  },

  drawPens(packets) {
    for (const packet of packets) {
      this.draw(packet);
    }
  },
};

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
    canvas.draw(packet.d);
    canvas.history.push(packet.d);
  } else if (packet.t === 'CANVAS') {
    // draw the existing canvas from server and boot history
    canvas.drawPens(packet.d);
    canvas.history = packet.d;
  }
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('ready!');

  ws.addEventListener('error', () => {
    dom.status.show('error');
    console.error('ws: error');
  });

  ws.addEventListener('close', () => {
    dom.status.show('lost connection');
    console.error('ws: close');
  });

  ws.addEventListener('open', () => {
    dom.status.hide();
    console.info('ws: open');
  });

  $('#color-picker').addEventListener('change', (event) => {
    pen.color = event.target.value;
  });

  $('#width-changer').addEventListener('input', (event) => {
    pen.width = event.target.value;
    const preview = $('#pen-preview');
    const px = `${pen.width}px`;
    preview.style.width = px;
    preview.style.height = px;
    $('#pen-value').innerText = px;
  });
});

dom.canvas.addEventListener('mousemove', function mousemove(event) {
  state.trail.x = state.mouse.x;
  state.trail.y = state.mouse.y;

  state.mouse.x = event.pageX - this.offsetLeft;
  state.mouse.y = event.pageY - this.offsetTop;

  if (state.down && state.trail.x !== 0) {
    // local draw (fake packet)
    canvas.draw({
      trail: state.trail, mouse: state.mouse,
    });

    // send to server
    ws.send(JSON.stringify({
      t: 'PEN',
      d: {
        trail: state.trail,
        mouse: state.mouse,
        color: pen.color,
        width: pen.width,
      },
    }));
  }
});

dom.canvas.addEventListener('mousedown', () => {
  state.down = true;
});

dom.canvas.addEventListener('mouseup', () => {
  state.down = false;
});

function stretch() {
  const { innerWidth: width, innerHeight: height } = window;
  console.log('size update (%dx%d)', width, height);
  dom.canvas.width = width;
  dom.canvas.height = height;
  canvas.drawPens(canvas.history);
}

stretch();
window.addEventListener('resize', stretch);
