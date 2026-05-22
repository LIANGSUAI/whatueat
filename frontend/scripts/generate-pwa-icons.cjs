const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const VIEWBOX = 1024;
const SCALE = 3;
const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function mixColor(from, to, t) {
  return [
    mix(from[0], to[0], t),
    mix(from[1], to[1], t),
    mix(from[2], to[2], t),
    mix(from[3] ?? 255, to[3] ?? 255, t)
  ];
}

function blend(buffer, index, color) {
  const alpha = (color[3] ?? 255) / 255;
  const inv = 1 - alpha;
  buffer[index] = Math.round(color[0] * alpha + buffer[index] * inv);
  buffer[index + 1] = Math.round(color[1] * alpha + buffer[index + 1] * inv);
  buffer[index + 2] = Math.round(color[2] * alpha + buffer[index + 2] * inv);
  buffer[index + 3] = Math.round(255 * alpha + buffer[index + 3] * inv);
}

function ellipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function rotatedEllipse(x, y, cx, cy, rx, ry, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - cx;
  const dy = y - cy;
  const nx = dx * cos + dy * sin;
  const ny = -dx * sin + dy * cos;
  return (nx * nx) / (rx * rx) + (ny * ny) / (ry * ry) <= 1;
}

function roundedRect(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) {
    return false;
  }
  const px = clamp(x, left + radius, right - radius);
  const py = clamp(y, top + radius, bottom - radius);
  const dx = x - px;
  const dy = y - py;
  return dx * dx + dy * dy <= radius * radius;
}

function capsule(x, y, ax, ay, bx, by, radius) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : clamp(((x - ax) * dx + (y - ay) * dy) / lenSq, 0, 1);
  const px = ax + dx * t;
  const py = ay + dy * t;
  const ox = x - px;
  const oy = y - py;
  return ox * ox + oy * oy <= radius * radius;
}

function polygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

function heart(x, y, cx, cy, size) {
  const nx = (x - cx) / size;
  const ny = -(y - cy) / size;
  const a = nx * nx + ny * ny - 1;
  return a * a * a - nx * nx * ny * ny * ny <= 0;
}

function drawShape(canvas, bounds, test, fill) {
  const [left, top, right, bottom] = bounds;
  const minX = clamp(Math.floor((left / VIEWBOX) * canvas.size), 0, canvas.size - 1);
  const maxX = clamp(Math.ceil((right / VIEWBOX) * canvas.size), 0, canvas.size - 1);
  const minY = clamp(Math.floor((top / VIEWBOX) * canvas.size), 0, canvas.size - 1);
  const maxY = clamp(Math.ceil((bottom / VIEWBOX) * canvas.size), 0, canvas.size - 1);

  for (let y = minY; y <= maxY; y += 1) {
    const viewY = ((y + 0.5) / canvas.size) * VIEWBOX;
    for (let x = minX; x <= maxX; x += 1) {
      const viewX = ((x + 0.5) / canvas.size) * VIEWBOX;
      if (!test(viewX, viewY)) {
        continue;
      }

      const index = (y * canvas.size + x) * 4;
      blend(canvas.buffer, index, typeof fill === 'function' ? fill(viewX, viewY) : fill);
    }
  }
}

function createCanvas(size) {
  const canvas = {
    size: size * SCALE,
    buffer: Buffer.alloc(size * SCALE * size * SCALE * 4)
  };

  for (let y = 0; y < canvas.size; y += 1) {
    const viewY = ((y + 0.5) / canvas.size) * VIEWBOX;
    for (let x = 0; x < canvas.size; x += 1) {
      const viewX = ((x + 0.5) / canvas.size) * VIEWBOX;
      const index = (y * canvas.size + x) * 4;
      const base = [255, 253, 247, 255];
      const dx = viewX - 512;
      const dy = viewY - 512;
      const distance = Math.sqrt(dx * dx + dy * dy);

      let color = base;
      if (distance < 468) {
        const t = clamp(distance / 468, 0, 1);
        color = mixColor([255, 221, 37, 255], [255, 172, 0, 255], t);
        if (viewY > 670) {
          color = mixColor(color, [255, 128, 18, 255], clamp((viewY - 670) / 300, 0, 0.32));
        }
      }

      canvas.buffer[index] = color[0];
      canvas.buffer[index + 1] = color[1];
      canvas.buffer[index + 2] = color[2];
      canvas.buffer[index + 3] = color[3];
    }
  }

  return canvas;
}

function drawIcon(canvas) {
  drawShape(canvas, [206, 840, 818, 970], (x, y) => ellipse(x, y, 512, 908, 310, 52), [226, 117, 3, 74]);

  const leafShape = (x, y) =>
    ellipse(x, y, 292, 366, 104, 112) ||
    ellipse(x, y, 215, 452, 92, 88) ||
    ellipse(x, y, 348, 450, 116, 106) ||
    ellipse(x, y, 268, 530, 118, 88) ||
    ellipse(x, y, 414, 504, 88, 82);
  drawShape(canvas, [136, 254, 520, 606], leafShape, (x, y) => {
    const t = clamp((x + y - 440) / 400, 0, 1);
    return mixColor([74, 194, 21, 255], [37, 142, 17, 255], t);
  });
  drawShape(canvas, [236, 340, 408, 548], (x, y) => capsule(x, y, 318, 522, 270, 360, 13), [181, 224, 72, 214]);
  drawShape(canvas, [248, 396, 404, 540], (x, y) => capsule(x, y, 330, 510, 248, 432, 12), [181, 224, 72, 214]);
  drawShape(canvas, [292, 384, 430, 540], (x, y) => capsule(x, y, 330, 510, 390, 424, 12), [181, 224, 72, 214]);

  const riceShape = (x, y) =>
    ellipse(x, y, 462, 394, 64, 70) ||
    ellipse(x, y, 540, 360, 78, 78) ||
    ellipse(x, y, 622, 410, 68, 70) ||
    ellipse(x, y, 508, 478, 126, 102) ||
    ellipse(x, y, 648, 488, 118, 88) ||
    roundedRect(x, y, 384, 410, 716, 580, 76);
  drawShape(canvas, [368, 272, 760, 594], riceShape, [255, 255, 248, 255]);
  [
    [488, 432, 15],
    [572, 384, 14],
    [622, 468, 15],
    [540, 512, 13]
  ].forEach(([cx, cy, radius]) => {
    drawShape(canvas, [cx - radius, cy - radius, cx + radius, cy + radius], (x, y) => ellipse(x, y, cx, cy, radius, radius), [245, 223, 184, 180]);
  });

  drawShape(canvas, [520, 190, 982, 710], (x, y) => rotatedEllipse(x, y, 730, 456, 154, 244, 0.72), [89, 45, 22, 230]);
  drawShape(canvas, [556, 232, 944, 680], (x, y) => rotatedEllipse(x, y, 734, 456, 121, 214, 0.72), (x, y) => {
    const t = clamp((x - 610) / 260, 0, 1);
    return mixColor([255, 139, 38, 255], [255, 99, 18, 255], t);
  });
  [
    [666, 338, 832, 434, 12],
    [650, 402, 820, 506, 12],
    [634, 468, 776, 562, 12]
  ].forEach(([ax, ay, bx, by, radius]) => {
    drawShape(
      canvas,
      [Math.min(ax, bx) - 28, Math.min(ay, by) - 28, Math.max(ax, bx) + 28, Math.max(ay, by) + 28],
      (x, y) => capsule(x, y, ax, ay, bx, by, radius) && rotatedEllipse(x, y, 734, 456, 121, 214, 0.72),
      [255, 184, 83, 205]
    );
  });

  drawShape(canvas, [250, 426, 548, 624], (x, y) => rotatedEllipse(x, y, 400, 524, 150, 96, 0.08), [221, 169, 74, 205]);
  drawShape(canvas, [268, 438, 528, 612], (x, y) => rotatedEllipse(x, y, 400, 524, 128, 78, 0.08), [255, 255, 249, 255]);
  drawShape(canvas, [338, 466, 456, 582], (x, y) => ellipse(x, y, 396, 524, 58, 58), [255, 205, 18, 255]);

  const bodyOuter = [
    [152, 500],
    [872, 500],
    [854, 618],
    [803, 780],
    [686, 884],
    [642, 915],
    [382, 915],
    [338, 884],
    [221, 780],
    [170, 618]
  ];
  const bodyInner = [
    [184, 532],
    [840, 532],
    [821, 620],
    [776, 758],
    [662, 850],
    [624, 876],
    [400, 876],
    [362, 850],
    [248, 758],
    [203, 620]
  ];
  drawShape(canvas, [140, 488, 884, 928], (x, y) => polygon(x, y, bodyOuter), [104, 47, 16, 255]);
  drawShape(canvas, [180, 524, 844, 884], (x, y) => polygon(x, y, bodyInner), [255, 254, 247, 255]);

  drawShape(canvas, [346, 812, 678, 934], (x, y) => roundedRect(x, y, 348, 812, 676, 928, 48), [104, 47, 16, 255]);
  drawShape(canvas, [380, 802, 644, 890], (x, y) => roundedRect(x, y, 382, 802, 642, 884, 36), [255, 252, 241, 255]);

  drawShape(
    canvas,
    [146, 448, 878, 596],
    (x, y) => ellipse(x, y, 512, 514, 392, 78) && !ellipse(x, y, 512, 505, 362, 48) && y > 472,
    [104, 47, 16, 255]
  );
  drawShape(
    canvas,
    [178, 474, 846, 572],
    (x, y) => ellipse(x, y, 512, 514, 360, 50) && y > 512,
    [255, 252, 239, 255]
  );

  drawShape(canvas, [320, 630, 420, 766], (x, y) => ellipse(x, y, 370, 692, 31, 53), [105, 45, 12, 255]);
  drawShape(canvas, [616, 626, 756, 744], (x, y) => capsule(x, y, 638, 696, 676, 666, 18) || capsule(x, y, 676, 666, 724, 696, 18), [105, 45, 12, 255]);
  drawShape(canvas, [470, 672, 584, 790], (x, y) => ellipse(x, y, 527, 726, 58, 67) && y > 684, [105, 45, 12, 255]);
  drawShape(canvas, [484, 726, 572, 794], (x, y) => ellipse(x, y, 528, 764, 43, 28), [255, 121, 103, 245]);
  drawShape(canvas, [300, 706, 432, 808], (x, y) => ellipse(x, y, 366, 756, 58, 42), [255, 129, 105, 218]);
  drawShape(canvas, [654, 710, 786, 812], (x, y) => ellipse(x, y, 720, 760, 58, 42), [255, 129, 105, 218]);

  drawShape(canvas, [466, 76, 674, 284], (x, y) => heart(x, y, 570, 176, 82), [255, 255, 255, 245]);
  drawShape(canvas, [762, 190, 900, 326], (x, y) => capsule(x, y, 778, 218, 858, 292, 18), [255, 255, 255, 232]);
}

function downsample(canvas, size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);

  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SCALE; sy += 1) {
        for (let sx = 0; sx < SCALE; sx += 1) {
          const source = (((y * SCALE + sy) * canvas.size + x * SCALE + sx) * 4);
          r += canvas.buffer[source];
          g += canvas.buffer[source + 1];
          b += canvas.buffer[source + 2];
          a += canvas.buffer[source + 3];
        }
      }
      const target = row + 1 + x * 4;
      const samples = SCALE * SCALE;
      raw[target] = Math.round(r / samples);
      raw[target + 1] = Math.round(g / samples);
      raw[target + 2] = Math.round(b / samples);
      raw[target + 3] = Math.round(a / samples);
    }
  }

  return raw;
}

function renderPng(size) {
  const canvas = createCanvas(size);
  drawIcon(canvas);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(downsample(canvas, size), { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function svgIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="42%" cy="34%" r="64%">
      <stop offset="0" stop-color="#ffdf25"/>
      <stop offset="0.68" stop-color="#ffc400"/>
      <stop offset="1" stop-color="#ff9512"/>
    </radialGradient>
    <linearGradient id="leaf" x1="210" y1="300" x2="460" y2="560" gradientUnits="userSpaceOnUse">
      <stop stop-color="#50c81c"/>
      <stop offset="1" stop-color="#278f12"/>
    </linearGradient>
    <linearGradient id="salmon" x1="620" y1="340" x2="846" y2="565" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ff9126"/>
      <stop offset="1" stop-color="#ff6412"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="#fffdf7"/>
  <circle cx="512" cy="512" r="468" fill="url(#bg)"/>
  <ellipse cx="512" cy="908" rx="310" ry="52" fill="#e27503" opacity=".3"/>
  <path fill="url(#leaf)" d="M292 254c61 0 105 48 108 109 45-12 97 24 101 76 62 6 82 95 28 129-40 25-126 20-188 17-89-5-168-33-173-106-4-48 22-84 61-101-16-65 12-124 63-124Z"/>
  <path fill="none" stroke="#b5e048" stroke-width="24" stroke-linecap="round" d="M318 522 270 360M330 510 248 432M330 510l60-86"/>
  <path fill="#fffff8" d="M462 324c34 0 61 25 64 58 15-49 88-61 120-17 16 22 19 45 12 64 58-20 118 20 118 82 0 57-49 83-96 83H405c-67 0-92-84-42-122 7-5 14-9 22-12-2-7-3-14-3-21 0-63 39-115 80-115Z"/>
  <g fill="#f5dfb8" opacity=".72">
    <circle cx="488" cy="432" r="15"/>
    <circle cx="572" cy="384" r="14"/>
    <circle cx="622" cy="468" r="15"/>
    <circle cx="540" cy="512" r="13"/>
  </g>
  <ellipse cx="730" cy="456" rx="154" ry="244" transform="rotate(41 730 456)" fill="#592d16" opacity=".9"/>
  <ellipse cx="734" cy="456" rx="121" ry="214" transform="rotate(41 734 456)" fill="url(#salmon)"/>
  <g fill="none" stroke="#ffb853" stroke-width="24" stroke-linecap="round" opacity=".82">
    <path d="M666 338c54 24 112 58 166 96"/>
    <path d="M650 402c59 28 119 65 170 104"/>
    <path d="M634 468c52 25 101 58 142 94"/>
  </g>
  <ellipse cx="400" cy="524" rx="150" ry="96" transform="rotate(5 400 524)" fill="#dda94a" opacity=".82"/>
  <ellipse cx="400" cy="524" rx="128" ry="78" transform="rotate(5 400 524)" fill="#fffff9"/>
  <circle cx="396" cy="524" r="58" fill="#ffcd12"/>
  <path fill="#682f10" d="M152 500h720c-12 175-77 306-186 384-25 18-47 31-67 31H405c-20 0-42-13-67-31-109-78-174-209-186-384Z"/>
  <path fill="#fffef7" d="M184 532h656c-20 139-72 247-178 318-18 12-31 26-38 26H400c-7 0-20-14-38-26-106-71-158-179-178-318Z"/>
  <rect x="348" y="812" width="328" height="116" rx="48" fill="#682f10"/>
  <rect x="382" y="802" width="260" height="82" rx="36" fill="#fffcf1"/>
  <path d="M126 512c72 48 705 50 772 0" fill="none" stroke="#682f10" stroke-width="36" stroke-linecap="round"/>
  <path d="M176 526c92 31 581 34 672 0" fill="none" stroke="#fffcef" stroke-width="26" stroke-linecap="round"/>
  <ellipse cx="370" cy="692" rx="31" ry="53" fill="#692d0c"/>
  <path d="M638 696c20-24 58-35 86 0" fill="none" stroke="#692d0c" stroke-width="36" stroke-linecap="round"/>
  <path d="M475 690c19 61 87 62 106 0 5 39-18 83-53 83s-58-44-53-83Z" fill="#692d0c"/>
  <ellipse cx="528" cy="764" rx="43" ry="28" fill="#ff7967" opacity=".96"/>
  <ellipse cx="366" cy="756" rx="58" ry="42" fill="#ff8169" opacity=".85"/>
  <ellipse cx="720" cy="760" rx="58" ry="42" fill="#ff8169" opacity=".85"/>
  <path fill="#fff" opacity=".96" d="M570 82c43 0 77 34 78 76 27-34 80-35 111-4 34 34 34 88 0 122-38 38-103 61-171 76-32-61-59-125-59-179 0-50 35-91 41-91Z"/>
  <path d="M778 218c31 20 58 45 80 74" fill="none" stroke="#fff" stroke-width="36" stroke-linecap="round" opacity=".9"/>
</svg>
`;
}

fs.writeFileSync(path.join(outDir, 'icon-192.png'), renderPng(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), renderPng(512));
fs.writeFileSync(path.join(outDir, 'maskable-512.png'), renderPng(512));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), renderPng(180));
fs.writeFileSync(path.join(outDir, 'favicon.svg'), svgIcon());
