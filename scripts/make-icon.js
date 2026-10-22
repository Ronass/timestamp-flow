/**
 * 生成应用图标（纯 Node，无第三方依赖）。
 * 用法：npm run icon
 * 输出：resources/icons/appIcon.png（512x512，RGBA）
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const SIZE = 512;
const SCALE = 4;
const OUTPUT = path.join(__dirname, '..', 'resources', 'icons', 'appIcon.png');

/* ---------- PNG 编码 ---------- */

let crcTable = null;

function crc32(buffer) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c;
    }
  }

  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- 绘制 ---------- */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function roundedRectDistance(px, py, half, radius) {
  const qx = Math.abs(px) - (half - radius);
  const qy = Math.abs(py) - (half - radius);
  return (
    Math.min(Math.max(qx, qy), 0) +
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) -
    radius
  );
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / lengthSq, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function mix(base, color, alpha) {
  return base + (color - base) * alpha;
}

function draw(size) {
  const S = size;
  const buffer = Buffer.alloc(S * S * 4);
  const cx = S / 2;
  const cy = S / 2;

  const plateHalf = S * 0.44;
  const plateRadius = S * 0.19;
  const ringRadius = S * 0.30;
  const ringHalfWidth = S * 0.0155;
  const tickOuter = ringRadius - S * 0.05;
  const tickInner = ringRadius - S * 0.018;
  const handWidth = S * 0.016;
  const centerRadius = S * 0.03;

  const bgTop = { r: 0x1b, g: 0x25, b: 0x34 };
  const bgBottom = { r: 0x09, g: 0x0d, b: 0x13 };
  const accent = { r: 0x5d, g: 0xd0, b: 0xf5 };
  const glow = { r: 0x3a, g: 0x9f, b: 0xc4 };
  const ink = { r: 0xf2, g: 0xf7, b: 0xfd };

  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const px = x + 0.5 - cx;
      const py = y + 0.5 - cy;
      const index = (y * S + x) * 4;

      const plate = roundedRectDistance(px, py, plateHalf, plateRadius);
      if (plate > 0) continue;

      const vertical = y / S;
      let r = mix(bgTop.r, bgBottom.r, vertical);
      let g = mix(bgTop.g, bgBottom.g, vertical);
      let b = mix(bgTop.b, bgBottom.b, vertical);

      // 左上柔光
      const glowDistance = Math.hypot(px + S * 0.12, py + S * 0.16) / (S * 0.55);
      if (glowDistance < 1) {
        const strength = (1 - glowDistance) ** 2 * 0.35;
        r = mix(r, glow.r, strength);
        g = mix(g, glow.g, strength);
        b = mix(b, glow.b, strength);
      }

      // 表盘外环
      const ringDistance = Math.abs(Math.hypot(px, py) - ringRadius);
      if (ringDistance <= ringHalfWidth) {
        const alpha = clamp((ringHalfWidth - ringDistance) / (S * 0.002) + 0.65, 0, 1);
        r = mix(r, accent.r, alpha);
        g = mix(g, accent.g, alpha);
        b = mix(b, accent.b, alpha);
      }

      // 12 个刻度（整点更粗）
      for (let i = 0; i < 12; i += 1) {
        const angle = (i * Math.PI) / 6 - Math.PI / 2;
        const outer = tickOuter;
        const inner = i % 3 === 0 ? tickOuter - S * 0.045 : tickInner;
        const ax = Math.cos(angle) * inner;
        const ay = Math.sin(angle) * inner;
        const bx = Math.cos(angle) * outer;
        const by = Math.sin(angle) * outer;
        const width = i % 3 === 0 ? S * 0.008 : S * 0.005;

        if (segmentDistance(px, py, ax, ay, bx, by) <= width) {
          const alpha = i % 3 === 0 ? 0.85 : 0.45;
          r = mix(r, ink.r, alpha);
          g = mix(g, ink.g, alpha);
          b = mix(b, ink.b, alpha);
        }
      }

      // 时针（10 点）与分针（2 点）
      const hourAngle = (-60 * Math.PI) / 180;
      const minuteAngle = (60 * Math.PI) / 180;
      const hourLength = S * 0.15;
      const minuteLength = S * 0.205;

      const hourDistance = segmentDistance(
        px,
        py,
        Math.sin(hourAngle) * S * 0.02,
        -Math.cos(hourAngle) * S * 0.02,
        Math.sin(hourAngle) * hourLength,
        -Math.cos(hourAngle) * hourLength
      );
      if (hourDistance <= handWidth) {
        const alpha = clamp(handWidth - hourDistance, 0, 1);
        r = mix(r, ink.r, alpha);
        g = mix(g, ink.g, alpha);
        b = mix(b, ink.b, alpha);
      }

      const minuteDistance = segmentDistance(
        px,
        py,
        Math.sin(minuteAngle) * S * 0.02,
        -Math.cos(minuteAngle) * S * 0.02,
        Math.sin(minuteAngle) * minuteLength,
        -Math.cos(minuteAngle) * minuteLength
      );
      if (minuteDistance <= handWidth * 0.85) {
        const alpha = clamp(handWidth * 0.85 - minuteDistance, 0, 1);
        r = mix(r, ink.r, alpha);
        g = mix(g, ink.g, alpha);
        b = mix(b, ink.b, alpha);
      }

      // 表盘中心
      const centerDistance = Math.hypot(px, py);
      if (centerDistance <= centerRadius) {
        const alpha = clamp(centerRadius - centerDistance, 0, 1);
        r = mix(r, accent.r, alpha);
        g = mix(g, accent.g, alpha);
        b = mix(b, accent.b, alpha);
      }

      buffer[index] = Math.round(r);
      buffer[index + 1] = Math.round(g);
      buffer[index + 2] = Math.round(b);
      buffer[index + 3] = 255;
    }
  }

  return buffer;
}

function downsample(source, sourceSize, targetSize) {
  const factor = sourceSize / targetSize;
  const output = Buffer.alloc(targetSize * targetSize * 4);

  for (let y = 0; y < targetSize; y += 1) {
    for (let x = 0; x < targetSize; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < factor; sy += 1) {
        for (let sx = 0; sx < factor; sx += 1) {
          const sourceIndex =
            ((y * factor + sy) * sourceSize + (x * factor + sx)) * 4;
          const alpha = source[sourceIndex + 3] / 255;
          r += source[sourceIndex] * alpha;
          g += source[sourceIndex + 1] * alpha;
          b += source[sourceIndex + 2] * alpha;
          a += alpha;
        }
      }

      const index = (y * targetSize + x) * 4;
      const samples = factor * factor;

      if (a === 0) {
        output[index] = 0;
        output[index + 1] = 0;
        output[index + 2] = 0;
        output[index + 3] = 0;
      } else {
        output[index] = Math.round(r / a);
        output[index + 1] = Math.round(g / a);
        output[index + 2] = Math.round(b / a);
        output[index + 3] = Math.round((a / samples) * 255);
      }
    }
  }

  return output;
}

function main() {
  const sourceSize = SIZE * SCALE;
  const source = draw(sourceSize);
  const scaled = downsample(source, sourceSize, SIZE);
  const png = encodePng(SIZE, SIZE, scaled);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, png);

  console.log(`图标已生成：${path.relative(process.cwd(), OUTPUT)} (${(png.length / 1024).toFixed(1)} KB)`);
}

main();
