import { describe, expect, it } from 'vitest';
import { QUALITIES, SIZES, STYLES, buildPrompt, fileExtension } from './options.js';

describe('option lists', () => {
  it('offers gpt-image-2 sizes with auto first and 4K marked experimental', () => {
    expect(SIZES[0].value).toBe('auto');
    expect(SIZES.map((s) => s.value)).toEqual([
      'auto',
      '1024x1024',
      '1536x1024',
      '1024x1536',
      '2048x2048',
      '2048x1152',
      '3840x2160',
      '2160x3840',
    ]);
    expect(SIZES.filter((s) => s.experimental).map((s) => s.value)).toEqual(['3840x2160', '2160x3840']);
  });

  it('offers auto/low/medium/high quality', () => {
    expect(QUALITIES.map((q) => q.value)).toEqual(['auto', 'low', 'medium', 'high']);
  });

  it('has a no-style option first', () => {
    expect(STYLES[0]).toMatchObject({ id: 'none', suffix: '' });
  });
});

describe('buildPrompt', () => {
  it('returns the trimmed prompt when nothing is added', () => {
    expect(buildPrompt('  kucing  ', { styleId: 'none' })).toBe('kucing');
  });

  it('appends the style suffix', () => {
    const vector = STYLES.find((s) => s.id === 'vector');
    expect(buildPrompt('kucing', { styleId: 'vector' })).toBe(`kucing\n\n${vector.suffix}`);
  });

  it('appends a solid background instruction for chroma key, naming the color', () => {
    const p = buildPrompt('kucing', { styleId: 'none', chromaKey: { enabled: true, color: '#FF00FF' } });
    expect(p.startsWith('kucing\n\n')).toBe(true);
    expect(p).toMatch(/solid, flat, uniform #FF00FF background/);
    expect(p).toMatch(/do not use #FF00FF/i);
  });

  it('combines style then background, and ignores unknown styles', () => {
    const p = buildPrompt('kucing', { styleId: 'sticker', chromaKey: { enabled: true, color: '#00FF00' } });
    const sticker = STYLES.find((s) => s.id === 'sticker');
    expect(p.indexOf(sticker.suffix)).toBeGreaterThan(0);
    expect(p.indexOf('#00FF00')).toBeGreaterThan(p.indexOf(sticker.suffix));
    expect(buildPrompt('kucing', { styleId: 'nope' })).toBe('kucing');
  });
});

describe('fileExtension', () => {
  it('maps output formats to file extensions', () => {
    expect(fileExtension('png')).toBe('png');
    expect(fileExtension('jpeg')).toBe('jpg');
    expect(fileExtension('webp')).toBe('webp');
    expect(fileExtension(undefined)).toBe('png');
  });
});
