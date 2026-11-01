// Decodes single-texture Gust G1T files (DXT1/DXT5) to PNG.
// Usage: node tools/g1t.js <in.g1t> <out.png> [size]
const fs = require('fs');
const zlib = require('zlib');

const FORMATS = { 0x59: 'DXT1', 0x5b: 'DXT5' };

/** Parses the first texture of a G1T buffer. Returns { width, height, rgba }. */
function decodeG1t(buf) {
  if (buf.toString('latin1', 0, 4) !== 'GT1G') throw new Error('not a G1T file');
  const tableOffset = buf.readUInt32LE(0x0c);
  const tex = tableOffset + buf.readUInt32LE(tableOffset);
  const format = buf[tex + 1];
  const width = 1 << (buf[tex + 2] & 0x0f);
  const height = 1 << (buf[tex + 2] >> 4);
  const hasExt = buf[tex + 7] & 0x10;
  const data = tex + 8 + (hasExt ? buf.readUInt32LE(tex + 8) : 0);
  if (!FORMATS[format]) throw new Error(`format 0x${format.toString(16)} not supported`);
  return { width, height, rgba: decodeDxt(buf.subarray(data), width, height, FORMATS[format]) };
}

function rgb565(c) {
  return [((c >> 11) & 31) * 255 / 31, ((c >> 5) & 63) * 255 / 63, (c & 31) * 255 / 31].map(Math.round);
}

function decodeDxt(src, width, height, kind) {
  const out = Buffer.alloc(width * height * 4);
  const blockSize = kind === 'DXT1' ? 8 : 16;
  let p = 0;
  for (let by = 0; by < height; by += 4) {
    for (let bx = 0; bx < width; bx += 4, p += blockSize) {
      const alpha = new Array(16).fill(255);
      let c = p;
      if (kind === 'DXT5') {
        const a0 = src[p];
        const a1 = src[p + 1];
        const pal = [a0, a1];
        if (a0 > a1) for (let i = 1; i < 7; i++) pal.push(Math.round(((7 - i) * a0 + i * a1) / 7));
        else {
          for (let i = 1; i < 5; i++) pal.push(Math.round(((5 - i) * a0 + i * a1) / 5));
          pal.push(0, 255);
        }
        let bits = 0n;
        for (let i = 0; i < 6; i++) bits |= BigInt(src[p + 2 + i]) << BigInt(8 * i);
        for (let i = 0; i < 16; i++) alpha[i] = pal[Number((bits >> BigInt(3 * i)) & 7n)];
        c = p + 8;
      }
      const c0 = src.readUInt16LE(c);
      const c1 = src.readUInt16LE(c + 2);
      const k0 = rgb565(c0);
      const k1 = rgb565(c1);
      const colors = [k0, k1];
      if (c0 > c1 || kind === 'DXT5') {
        colors.push(k0.map((v, i) => Math.round((2 * v + k1[i]) / 3)), k0.map((v, i) => Math.round((v + 2 * k1[i]) / 3)));
      } else {
        colors.push(k0.map((v, i) => Math.round((v + k1[i]) / 2)), [0, 0, 0]);
      }
      const idx = src.readUInt32LE(c + 4);
      for (let i = 0; i < 16; i++) {
        const sel = (idx >> (2 * i)) & 3;
        const o = ((by + (i >> 2)) * width + bx + (i & 3)) * 4;
        const [r, g, b] = colors[sel];
        out[o] = r;
        out[o + 1] = g;
        out[o + 2] = b;
        out[o + 3] = kind === 'DXT1' && c0 <= c1 && sel === 3 ? 0 : alpha[i];
      }
    }
  }
  return out;
}

/** Box-filters an RGBA image down by an integer factor. */
function downscale({ width, height, rgba }, size) {
  const f = width / size;
  if (f <= 1) return { width, height, rgba };
  const h = height / f;
  const out = Buffer.alloc(size * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0, 0];
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const o = ((y * f + dy) * width + x * f + dx) * 4;
          const a = rgba[o + 3];
          for (let i = 0; i < 3; i++) sum[i] += rgba[o + i] * a;
          sum[3] += a;
        }
      }
      const o = (y * size + x) * 4;
      for (let i = 0; i < 3; i++) out[o + i] = sum[3] ? Math.round(sum[i] / sum[3]) : 0;
      out[o + 3] = Math.round(sum[3] / (f * f));
    }
  }
  return { width: size, height: h, rgba: out };
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Encodes RGBA pixels as a PNG buffer. */
function encodePng({ width, height, rgba }) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Converts G1T bytes to PNG bytes, scaled to `size` pixels wide when given. */
function g1tToPng(buf, size) {
  const img = decodeG1t(buf);
  return encodePng(size ? downscale(img, size) : img);
}

if (require.main === module) {
  const [input, output, size] = process.argv.slice(2);
  fs.writeFileSync(output, g1tToPng(fs.readFileSync(input), size ? +size : 0));
}
module.exports = { g1tToPng };
