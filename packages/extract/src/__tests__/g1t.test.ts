import { describe, expect, it } from 'vitest';
import { decodeDxt, TextureFormat } from '../g1t.js';

function pixel(rgba: Buffer, index: number): number[] {
  return [...rgba.subarray(index * 4, index * 4 + 4)];
}

describe('decodeDxt', () => {
  it('decodes a DXT5 block: 4 color selectors and the 8-step alpha ramp', () => {
    const block = Buffer.from([
      // alpha endpoints 255 and 0 (a0 > a1: 8 steps), indices 0, 1, 7 for the first 3 pixels
      0xff, 0x00, 0xc8, 0x01, 0x00, 0x00, 0x00, 0x00,
      // colors: red 0xF800 and blue 0x001F, selectors 0, 1, 2, 3 for the first 4 pixels
      0x00, 0xf8, 0x1f, 0x00, 0xe4, 0x00, 0x00, 0x00,
    ]);

    const rgba = decodeDxt(block, 4, 4, TextureFormat.Dxt5);

    expect(pixel(rgba, 0)).toEqual([255, 0, 0, 255]);
    expect(pixel(rgba, 1)).toEqual([0, 0, 255, 0]);
    expect(pixel(rgba, 2)).toEqual([170, 0, 85, 36]);
    expect(pixel(rgba, 3)).toEqual([85, 0, 170, 255]);
    expect(pixel(rgba, 15)).toEqual([255, 0, 0, 255]);
  });

  it('decodes a DXT1 block in 3-color mode: selector 3 is transparent black', () => {
    const block = Buffer.from([0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);

    const rgba = decodeDxt(block, 4, 4, TextureFormat.Dxt1);

    expect(pixel(rgba, 0)).toEqual([0, 0, 0, 0]);
  });

  it('decodes a DXT1 block in 4-color mode: opaque pixels, and the blend of both endpoints', () => {
    // c0 = white > c1 = black; selector 2 for pixel 2, selector 0 for the others
    const block = Buffer.from([0xff, 0xff, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00]);

    const rgba = decodeDxt(block, 4, 4, TextureFormat.Dxt1);

    expect(pixel(rgba, 0)).toEqual([255, 255, 255, 255]);
    expect(pixel(rgba, 2)).toEqual([170, 170, 170, 255]);
  });
});
