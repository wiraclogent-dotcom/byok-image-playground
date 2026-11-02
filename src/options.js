// Generation options for OpenAI-style image models (gpt-image-2) + prompt helpers.
// Sizes/qualities per gpt-image-2 docs; 4K is marked experimental by OpenAI (> 2560x1440).

export const SIZES = [
  { value: 'auto', label: 'Auto' },
  { value: '1024x1024', label: '1024×1024 · 1:1' },
  { value: '1536x1024', label: '1536×1024 · 3:2' },
  { value: '1024x1536', label: '1024×1536 · 2:3' },
  { value: '2048x2048', label: '2048×2048 · 1:1 · 2K' },
  { value: '2048x1152', label: '2048×1152 · 16:9 · 2K' },
  { value: '3840x2160', label: '3840×2160 · 16:9 · 4K (eksperimental)', experimental: true },
  { value: '2160x3840', label: '2160×3840 · 9:16 · 4K (eksperimental)', experimental: true },
];

// Cost hints: measured gpt-image-2 output at 1024×1024 ($30 / 1M output tokens).
export const QUALITIES = [
  { value: 'auto', label: 'Auto', hint: 'model memilih sendiri' },
  { value: 'low', label: 'Low', hint: '≈ $0.006 / gambar 1024²' },
  { value: 'medium', label: 'Medium', hint: '≈ $0.05 / gambar 1024²' },
  { value: 'high', label: 'High', hint: '≈ $0.21 / gambar 1024²' },
];

export const FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
];

export const STYLES = [
  { id: 'none', label: 'Tanpa style', suffix: '' },
  {
    id: 'vector',
    label: 'Vector / flat',
    suffix: 'Style: clean flat vector illustration, bold simple shapes, limited flat color palette, crisp hard edges, no gradients or textures.',
  },
  {
    id: 'ink',
    label: 'Hand-drawn / ink',
    suffix: 'Style: hand-drawn ink illustration, confident brush and pen linework, cross-hatching, slightly imperfect organic lines.',
  },
  {
    id: 'retro',
    label: 'Retro print',
    suffix: 'Style: vintage retro screen-print look, limited spot colors, halftone shading, 70s/80s poster feel.',
  },
  {
    id: 'streetwear',
    label: 'Streetwear graphic',
    suffix: 'Style: bold streetwear t-shirt graphic, strong outlines, high contrast, expressive display lettering, print-ready.',
  },
  {
    id: 'sticker',
    label: 'Sticker / cartoon',
    suffix: 'Style: cute cartoon sticker, thick clean outlines, bright cel-shaded colors, simple readable silhouette.',
  },
  {
    id: 'photo',
    label: 'Photorealistic',
    suffix: 'Style: photorealistic, natural lighting, realistic materials and detail, shot on a professional camera.',
  },
];

export function buildPrompt(prompt, { styleId = 'none', chromaKey } = {}) {
  const parts = [String(prompt || '').trim()];
  const style = STYLES.find((s) => s.id === styleId);
  if (style?.suffix) parts.push(style.suffix);
  if (chromaKey?.enabled && chromaKey.color) {
    const c = chromaKey.color.toUpperCase();
    parts.push(
      `Background: place the subject on a solid, flat, uniform ${c} background that fills the whole canvas — no gradients, shadows, texture, floor or vignette on the background. Do not use ${c} or similar colors anywhere in the subject.`
    );
  }
  return parts.filter(Boolean).join('\n\n');
}

export function fileExtension(format) {
  if (format === 'jpeg') return 'jpg';
  if (format === 'webp') return 'webp';
  return 'png';
}
