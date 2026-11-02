import { TextureFormat } from './enums.js';
import { encodePng, type RgbaImage } from './png.js';

type Rgb = [number, number, number];

const FORMAT_BY_CODE = new Map<number, TextureFormat>([
  [0x59, TextureFormat.Dxt1],
  [0x5b, TextureFormat.Dxt5],
]);

function at<T>(list: readonly T[], index: number): T {
  const value = list[index];
  if (value === undefined) throw new Error(`index ${index} is out of range`);
  return value;
}

/**
 * Decodes the first texture of a G1T file.
 * @param buf - the G1T file content
 * @returns the size and the RGBA pixels of the texture
 * @throws {Error} when the buffer is not a G1T file, or its format is not DXT1 or DXT5
 * @sideEffects none
 */
export function decodeG1t(buf: Buffer): RgbaImage {
  if (buf.toString('latin1', 0, 4) !== 'GT1G') throw new Error('not a G1T file');
  const tableOffset = buf.readUInt32LE(0x0c);
  const tex = tableOffset + buf.readUInt32LE(tableOffset);
  const code = buf.readUInt8(tex + 1);
  const dims = buf.readUInt8(tex + 2);
  const width = 1 << (dims & 0x0f);
  const height = 1 << (dims >> 4);
  const hasExt = buf.readUInt8(tex + 7) & 0x10;
  const data = tex + 8 + (hasExt ? buf.readUInt32LE(tex + 8) : 0);
  const format = FORMAT_BY_CODE.get(code);
  if (!format) throw new Error(`format 0x${code.toString(16)} not supported`);
  return { width, height, rgba: decodeDxt(buf.subarray(data), width, height, format) };
}

function rgb565(c: number): Rgb {
  return [Math.round((((c >> 11) & 31) * 255) / 31), Math.round((((c >> 5) & 63) * 255) / 63), Math.round(((c & 31) * 255) / 31)];
}

function mix(a: Rgb, b: Rgb, wa: number, wb: number): Rgb {
  const channel = (i: number): number => Math.round((wa * at(a, i) + wb * at(b, i)) / (wa + wb));
  return [channel(0), channel(1), channel(2)];
}

function alphaPalette(a0: number, a1: number): number[] {
  const pal = [a0, a1];
  if (a0 > a1) {
    for (let i = 1; i < 7; i++) pal.push(Math.round(((7 - i) * a0 + i * a1) / 7));
  } else {
    for (let i = 1; i < 5; i++) pal.push(Math.round(((5 - i) * a0 + i * a1) / 5));
    pal.push(0, 255);
  }
  return pal;
}

/**
 * Decodes DXT1 or DXT5 block-compressed pixels to RGBA.
 * @param src - the compressed blocks, row by row of 4 × 4 pixel blocks
 * @param width - the texture width in pixels, a multiple of 4
 * @param height - the texture height in pixels, a multiple of 4
 * @param format - the block compression
 * @returns the RGBA pixels, 4 bytes per pixel
 * @sideEffects none
 */
export function decodeDxt(src: Buffer, width: number, height: number, format: TextureFormat): Buffer {
  const out = Buffer.alloc(width * height * 4);
  const isDxt5 = format === TextureFormat.Dxt5;
  const blockSize = isDxt5 ? 16 : 8;
  let p = 0;
  for (let by = 0; by < height; by += 4) {
    for (let bx = 0; bx < width; bx += 4, p += blockSize) {
      const alpha: number[] = new Array<number>(16).fill(255);
      let c = p;
      if (isDxt5) {
        const pal = alphaPalette(src.readUInt8(p), src.readUInt8(p + 1));
        let bits = 0n;
        for (let i = 0; i < 6; i++) bits |= BigInt(src.readUInt8(p + 2 + i)) << BigInt(8 * i);
        for (let i = 0; i < 16; i++) alpha[i] = at(pal, Number((bits >> BigInt(3 * i)) & 7n));
        c = p + 8;
      }
      const c0 = src.readUInt16LE(c);
      const c1 = src.readUInt16LE(c + 2);
      const k0 = rgb565(c0);
      const k1 = rgb565(c1);
      const fourColors = c0 > c1 || isDxt5;
      const colors: Rgb[] = fourColors ? [k0, k1, mix(k0, k1, 2, 1), mix(k0, k1, 1, 2)] : [k0, k1, mix(k0, k1, 1, 1), [0, 0, 0]];
      const idx = src.readUInt32LE(c + 4);
      for (let i = 0; i < 16; i++) {
        const sel = (idx >> (2 * i)) & 3;
        const o = ((by + (i >> 2)) * width + bx + (i & 3)) * 4;
        const [r, g, b] = at(colors, sel);
        out[o] = r;
        out[o + 1] = g;
        out[o + 2] = b;
        out[o + 3] = !isDxt5 && c0 <= c1 && sel === 3 ? 0 : at(alpha, i);
      }
    }
  }
  return out;
}

function downscale({ width, height, rgba }: RgbaImage, size: number): RgbaImage {
  const f = width / size;
  if (f <= 1) return { width, height, rgba };
  const h = height / f;
  const out = Buffer.alloc(size * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < size; x++) {
      // Colors are weighted by alpha, so transparent pixels do not tint the result.
      const sum = [0, 0, 0];
      let alphaSum = 0;
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const o = ((y * f + dy) * width + x * f + dx) * 4;
          const a = rgba.readUInt8(o + 3);
          for (let i = 0; i < 3; i++) sum[i] = at(sum, i) + rgba.readUInt8(o + i) * a;
          alphaSum += a;
        }
      }
      const o = (y * size + x) * 4;
      for (let i = 0; i < 3; i++) out[o + i] = alphaSum ? Math.round(at(sum, i) / alphaSum) : 0;
      out[o + 3] = Math.round(alphaSum / (f * f));
    }
  }
  return { width: size, height: h, rgba: out };
}

/**
 * Converts the first texture of a G1T file to a PNG file.
 * @param buf - the G1T file content
 * @param size - the PNG width in pixels, an integer divisor of the texture width; 0 keeps the texture size
 * @returns the PNG file content
 * @throws {Error} when the buffer is not a G1T file, or its format is not supported
 * @sideEffects none
 */
export function g1tToPng(buf: Buffer, size: number): Buffer {
  const img = decodeG1t(buf);
  return encodePng(size ? downscale(img, size) : img);
}
