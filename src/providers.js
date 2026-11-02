// Provider presets + two API "styles":
//  - "openrouter": image generation via /chat/completions with `modalities`
//  - "openai":     image generation via /images/generations (OpenAI-compatible)
// Adding another OpenAI-compatible gateway = adding one entry here.

import { extractUsage } from './usage.js';

// SemutSSH image model prices (USD per 1M tokens) from https://semutssh.com/docs/ai/models/
const SEMUT_IMAGE_PRICE = { input: 5, output: 0 };

export const PROVIDERS = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    style: 'openrouter',
    keyHint: 'sk-or-...',
  },
  semutssh: {
    id: 'semutssh',
    name: 'SemutSSH',
    baseUrl: 'https://ai.semutssh.com',
    style: 'openai',
    keyHint: 'sk-semut-...',
    usageUrl: 'https://app.semutssh.com',
    defaultPrices: {
      'gpt-image-2': SEMUT_IMAGE_PRICE,
      'gpt-image-2.5-flare': SEMUT_IMAGE_PRICE,
      'gpt-image-2.5-sunburst': SEMUT_IMAGE_PRICE,
    },
  },
  custom: {
    id: 'custom',
    name: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    style: 'openai',
    keyHint: 'sk-...',
  },
};

// Aspect ratio -> OpenAI `size`
export const RATIOS = {
  '1:1': '1024x1024',
  '3:2': '1536x1024',
  '2:3': '1024x1536',
};

const IMAGE_ID_PATTERN = /image|dall-?e|imagen|flux|diffusion|sdxl|seedream|riverflow/i;

export function errorMessage(status, data) {
  const raw =
    data?.error?.message ||
    data?.message ||
    (typeof data?.error === 'string' ? data.error : '') ||
    data?.raw ||
    '';
  // Keep provider errors whole (they often name the fix); only cap huge bodies like HTML pages.
  const msg = String(raw).slice(0, 1500);
  return `HTTP ${status}${msg ? `: ${msg}` : ''}`;
}

async function request(baseUrl, apiKey, path, { method = 'GET', body } = {}) {
  if (!baseUrl) throw new Error('Base URL belum diisi.');
  const url = baseUrl.replace(/\/+$/, '') + path;
  const headers = { Authorization: `Bearer ${apiKey}` };
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Gagal menghubungi provider — cek base URL atau CORS.');
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) throw new Error(errorMessage(res.status, data));
  return data;
}

// OpenRouter pricing is USD per token (strings) -> USD per 1M tokens
function perMillion(pricing) {
  if (!pricing || (pricing.prompt == null && pricing.completion == null)) return null;
  const conv = (v) => Number((Number(v || 0) * 1e6).toPrecision(6));
  return { input: conv(pricing.prompt), output: conv(pricing.completion) };
}

// Normalize a /models response into [{ id, name, isImage, textOutput, price }]
export function parseModels(data) {
  const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return list
    .filter((m) => m && m.id)
    .map((m) => {
      const out = m.architecture?.output_modalities;
      const hasModalities = Array.isArray(out);
      return {
        id: m.id,
        name: m.name || m.id,
        isImage: hasModalities ? out.includes('image') : IMAGE_ID_PATTERN.test(m.id),
        textOutput: hasModalities ? out.includes('text') : true,
        price: perMillion(m.pricing),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

// Returns { models, info } or throws with a readable message.
export async function testConnection(provider, baseUrl, apiKey) {
  if (!apiKey) throw new Error('API key belum diisi.');

  if (provider.style === 'openrouter') {
    const key = await request(baseUrl, apiKey, '/key');
    const models = parseModels(await request(baseUrl, apiKey, '/models?output_modalities=image'));
    const k = key?.data || {};
    const usage = typeof k.usage === 'number' ? ` · terpakai $${k.usage.toFixed(4)}` : '';
    const limit = k.limit == null ? '' : ` / limit $${k.limit}`;
    return { models, info: `${k.label || 'Key valid'}${usage}${limit}` };
  }

  const models = parseModels(await request(baseUrl, apiKey, '/models'));
  return { models, info: 'Key valid' };
}

// Extract image URLs (data: or https:) from a provider response.
export function extractImages(style, data) {
  if (style === 'openrouter') {
    const msg = data?.choices?.[0]?.message;
    return (msg?.images || []).map((img) => img?.image_url?.url || img?.url).filter(Boolean);
  }
  const fmt = data?.output_format || 'png';
  return (data?.data || [])
    .map((d) => (d?.b64_json ? `data:image/${fmt};base64,${d.b64_json}` : d?.url))
    .filter(Boolean);
}

// Returns { images: string[], usage: {...} | null } or throws.
export async function generateImage(provider, baseUrl, apiKey, { model, prompt, ratio, textOutput = true }) {
  if (!apiKey) throw new Error('API key belum diisi.');
  if (!model) throw new Error('Model belum dipilih.');

  let data;
  if (provider.style === 'openrouter') {
    data = await request(baseUrl, apiKey, '/chat/completions', {
      method: 'POST',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        modalities: textOutput ? ['image', 'text'] : ['image'],
        image_config: { aspect_ratio: ratio },
        usage: { include: true }, // ask OpenRouter to return token counts + cost
      },
    });
  } else {
    data = await request(baseUrl, apiKey, '/images/generations', {
      method: 'POST',
      body: { model, prompt, size: RATIOS[ratio] || RATIOS['1:1'], n: 1 },
    });
  }

  const images = extractImages(provider.style, data);
  if (images.length === 0) {
    const text = data?.choices?.[0]?.message?.content;
    throw new Error(
      `Model tidak mengembalikan gambar.${text ? ` Respons: ${String(text).slice(0, 200)}` : ''}`
    );
  }
  return { images, usage: extractUsage(data) };
}
