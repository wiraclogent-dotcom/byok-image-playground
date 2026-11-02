import { describe, expect, it } from 'vitest';
import { applyChromaKey, hexToRgb } from './chromaKey.js';

const MAGENTA = { r: 255, g: 0, b: 255 };
const px = (...rgba) => new Uint8ClampedArray(rgba);

describe('hexToRgb', () => {
  it('parses #RRGGBB and #RGB', () => {
    expect(hexToRgb('#FF00FF')).toEqual(MAGENTA);
    expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb('nope')).toBeNull();
  });
});

describe('applyChromaKey', () => {
  it('makes key-colored pixels (and near-key noise) fully transparent', () => {
    const data = px(255, 0, 255, 255, 250, 8, 245, 255);
    const stats = applyChromaKey(data, MAGENTA, 25, 15);
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(0);
    expect(stats).toEqual({ cleared: 2, partial: 0 });
  });

  it('leaves pixels far from the key untouched', () => {
    const data = px(0, 0, 0, 255, 250, 200, 40, 255);
    applyChromaKey(data, MAGENTA, 25, 15);
    expect([...data]).toEqual([0, 0, 0, 255, 250, 200, 40, 255]);
  });

  it('gives edge pixels partial alpha and removes the key color spill', () => {
    // 50/50 blend of black subject and magenta background, as found on anti-aliased edges
    const data = px(128, 0, 128, 255);
    const stats = applyChromaKey(data, MAGENTA, 25, 25);
    expect(stats.partial).toBe(1);
    expect(data[3]).toBeGreaterThan(0);
    expect(data[3]).toBeLessThan(255);
    expect(data[0]).toBeLessThan(128); // less magenta than before
    expect(data[2]).toBeLessThan(128);
  });

  it('leaves no key-color tint on edge pixels (no purple fringe)', () => {
    // 2px anti-aliased ring between a black outline and magenta background
    const data = px(138, 10, 138, 255);
    applyChromaKey(data, MAGENTA, 25, 15);
    const [r, g, b, a] = data;
    expect(a).toBeGreaterThan(0);
    expect(Math.abs(r - g)).toBeLessThan(12);
    expect(Math.abs(b - g)).toBeLessThan(12);
  });

  it('keeps non-key hue in edge pixels (yellow subject on magenta stays yellowish)', () => {
    // blend of yellow (250,200,40) and magenta
    const data = px(252, 130, 120, 255);
    applyChromaKey(data, MAGENTA, 25, 25);
    const [r, g, b] = data;
    expect(r).toBeGreaterThan(b); // still warm, not pink
    expect(g).toBeGreaterThan(b);
  });

  it('works for other key colors (green screen)', () => {
    const data = px(0, 255, 0, 255, 255, 0, 255, 255);
    applyChromaKey(data, { r: 0, g: 255, b: 0 }, 25, 15);
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(255);
  });
});
