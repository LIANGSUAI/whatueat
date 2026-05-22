const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

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

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function insideRoundedRect(x, y, size, inset, radius) {
  const left = inset;
  const top = inset;
  const right = size - inset;
  const bottom = size - inset;
  const px = Math.min(Math.max(x, left + radius), right - radius);
  const py = Math.min(Math.max(y, top + radius), bottom - radius);
  const dx = x - px;
  const dy = y - py;
  return x >= left && x <= right && y >= top && y <= bottom && dx * dx + dy * dy <= radius * radius;
}

function outerFlame(nx, ny) {
  const lower = Math.pow(nx / 0.34, 2) + Math.pow((ny - 0.12) / 0.52, 2) < 1;
  const shoulder = Math.pow((nx + 0.08) / 0.28, 2) + Math.pow((ny + 0.15) / 0.34, 2) < 1;
  const tip = Math.abs(nx + 0.03) < 0.15 + (ny + 0.68) * 0.36 && ny > -0.72 && ny < -0.08;
  return lower || shoulder || tip;
}

function innerFlame(nx, ny) {
  const lower = Math.pow((nx + 0.03) / 0.22, 2) + Math.pow((ny - 0.2) / 0.35, 2) < 1;
  const tip = Math.abs(nx + 0.02) < 0.09 + (ny + 0.35) * 0.22 && ny > -0.44 && ny < 0.1;
  return lower || tip;
}

function render(size, maskable = false) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const inset = maskable ? 0 : Math.round(size * 0.08);
  const radius = maskable ? 0 : Math.round(size * 0.22);
  const cx = size / 2;
  const cy = size / 2;
  const flameScale = maskable ? size * 0.58 : size * 0.72;

  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const p = row + 1 + x * 4;
      const t = (x + y) / (size * 2);
      let r = mix(255, 238, t);
      let g = mix(246, 247, t);
      let b = mix(232, 242, t);
      let a = 255;

      if (!maskable && !insideRoundedRect(x, y, size, inset, radius)) {
        a = 0;
      } else {
        const card = insideRoundedRect(x, y, size, inset + size * 0.03, radius * 0.85);
        if (card) {
          r = mix(r, 255, 0.42);
          g = mix(g, 255, 0.42);
          b = mix(b, 255, 0.42);
        }
      }

      const nx = (x - cx) / flameScale;
      const ny = (y - cy) / flameScale;
      if (a && outerFlame(nx, ny)) {
        const ft = Math.max(0, Math.min(1, (ny + 0.72) / 1.28));
        r = mix(244, 255, ft);
        g = mix(122, 209, ft);
        b = mix(56, 17, ft);
      }
      if (a && innerFlame(nx, ny)) {
        r = 252;
        g = 250;
        b = 242;
      }

      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
      raw[p + 3] = a;
    }
  }

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
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

fs.writeFileSync(path.join(outDir, 'icon-192.png'), render(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), render(512));
fs.writeFileSync(path.join(outDir, 'maskable-512.png'), render(512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), render(180));
