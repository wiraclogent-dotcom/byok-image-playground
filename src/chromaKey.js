// Browser-side background removal for images generated on a solid key color
// (gpt-image-2 cannot output transparent backgrounds).

const MAX_DIST = Math.sqrt(3 * 255 * 255);
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Mutates RGBA `data` in place.
// tolerance/softness are percentages of the max RGB distance:
//   distance <= tolerance              -> fully transparent
//   tolerance < distance < +softness   -> partial alpha, key color "un-mixed" from the pixel (despill)
export function applyChromaKey(data, key, tolerance = 25, softness = 15) {
  const t0 = (tolerance / 100) * MAX_DIST;
  const t1 = ((tolerance + softness) / 100) * MAX_DIST;
  // Unit vector of the key color's hue (key minus its gray level), used for despill.
  const kGray = (key.r + key.g + key.b) / 3;
  const kLen = Math.hypot(key.r - kGray, key.g - kGray, key.b - kGray) || 1;
  const kx = (key.r - kGray) / kLen;
  const ky = (key.g - kGray) / kLen;
  const kz = (key.b - kGray) / kLen;
  let cleared = 0;
  let partial = 0;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - key.r;
    const dg = data[i + 1] - key.g;
    const db = data[i + 2] - key.b;
    const d = Math.sqrt(dr * dr + dg * dg + db * db);
    if (d <= t0) {
      data[i + 3] = 0;
      cleared++;
    } else if (d < t1) {
      const a = (d - t0) / (t1 - t0);
      // observed = a * subject + (1 - a) * key  =>  subject = (observed - (1 - a) * key) / a
      let r = (data[i] - (1 - a) * key.r) / a;
      let g = (data[i + 1] - (1 - a) * key.g) / a;
      let b = (data[i + 2] - (1 - a) * key.b) / a;
      // Despill: remove whatever key-color hue is left, so edges don't keep a colored fringe.
      const gray = (r + g + b) / 3;
      const spill = (r - gray) * kx + (g - gray) * ky + (b - gray) * kz;
      if (spill > 0) {
        r -= spill * kx;
        g -= spill * ky;
        b -= spill * kz;
      }
      data[i] = clamp(r);
      data[i + 1] = clamp(g);
      data[i + 2] = clamp(b);
      data[i + 3] = Math.round(data[i + 3] * a);
      partial++;
    }
  }
  return { cleared, partial };
}

// Loads an image URL (data: URLs work; cross-origin URLs may be blocked), keys out `hex`,
// returns { src: PNG data URL, clearedRatio }.
export async function removeBackground(src, hex, tolerance) {
  const key = hexToRgb(hex);
  if (!key) throw new Error('Warna kunci tidak valid.');
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    throw new Error('Background tidak bisa dihapus untuk gambar dari URL luar (diblokir browser).');
  }
  const { cleared } = applyChromaKey(imageData.data, key, tolerance);
  ctx.putImageData(imageData, 0, 0);
  return { src: canvas.toDataURL('image/png'), clearedRatio: cleared / (canvas.width * canvas.height) };
}
