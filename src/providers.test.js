import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  PROVIDERS,
  errorMessage,
  extractImages,
  generateImage,
  parseModels,
  testConnection,
} from './providers.js';

describe('parseModels', () => {
  it('uses OpenRouter output_modalities when present', () => {
    const models = parseModels({
      data: [
        { id: 'google/gemini-image', architecture: { output_modalities: ['image', 'text'] } },
        { id: 'flux/pro', architecture: { output_modalities: ['image'] } },
        { id: 'openai/gpt-chat', architecture: { output_modalities: ['text'] } },
      ],
    });
    expect(models.map((m) => [m.id, m.isImage, m.textOutput])).toEqual([
      ['flux/pro', true, false],
      ['google/gemini-image', true, true],
      ['openai/gpt-chat', false, true],
    ]);
  });

  it('falls back to id heuristics for OpenAI-style lists', () => {
    const models = parseModels({
      data: [{ id: 'gpt-image-2' }, { id: 'claude-sonnet-5' }, { id: 'dall-e-3' }],
    });
    expect(models.filter((m) => m.isImage).map((m) => m.id)).toEqual(['dall-e-3', 'gpt-image-2']);
  });

  it('converts OpenRouter per-token pricing to USD per 1M tokens', () => {
    const [m] = parseModels({
      data: [{ id: 'g/img', architecture: { output_modalities: ['image'] }, pricing: { prompt: '0.0000003', completion: '0.00003' } }],
    });
    expect(m.price).toEqual({ input: 0.3, output: 30 });
    expect(parseModels({ data: [{ id: 'gpt-image-2' }] })[0].price).toBeNull();
  });

  it('returns [] for unexpected shapes', () => {
    expect(parseModels(null)).toEqual([]);
    expect(parseModels({ data: 'nope' })).toEqual([]);
  });
});

describe('extractImages', () => {
  it('reads OpenRouter message.images', () => {
    const data = {
      choices: [{ message: { images: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } }] } }],
    };
    expect(extractImages('openrouter', data)).toEqual(['data:image/png;base64,AAA']);
  });

  it('reads OpenAI b64_json and url', () => {
    const data = { output_format: 'webp', data: [{ b64_json: 'BBB' }, { url: 'https://x/y.png' }] };
    expect(extractImages('openai', data)).toEqual(['data:image/webp;base64,BBB', 'https://x/y.png']);
  });
});

describe('errorMessage', () => {
  it('prefers error.message and only truncates very long bodies', () => {
    expect(errorMessage(401, { error: { message: 'bad key' } })).toBe('HTTP 401: bad key');
    const long = 'x'.repeat(600);
    expect(errorMessage(400, { error: { message: long } })).toBe(`HTTP 400: ${long}`);
    expect(errorMessage(500, { raw: 'x'.repeat(5000) })).toHaveLength('HTTP 500: '.length + 1500);
    expect(errorMessage(404, {})).toBe('HTTP 404');
  });

  it('explains rate limits (429)', () => {
    expect(errorMessage(429, { error: { message: 'Rate limit exceeded.' } })).toBe(
      'HTTP 429: Rate limit exceeded. — Provider sedang membatasi request (rate limit). Tunggu 1–2 menit lalu coba lagi; kalau terus terjadi, hubungi provider.'
    );
  });
});

describe('network calls', () => {
  afterEach(() => vi.unstubAllGlobals());

  const jsonResponse = (status, body, headers = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: async () => JSON.stringify(body),
  });

  it('generateImage error names the model sent and where the provider routed it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(400, { error: { message: 'bad' } }, { 'x-litellm-adaptive-router-model': 'gpt-image-2.5-sunburst' })
      )
    );
    await expect(
      generateImage(PROVIDERS.semutssh, 'https://a', 'k', { model: 'gpt-image-2', prompt: 'p', ratio: '1:1' })
    ).rejects.toThrow('HTTP 400: bad [model dikirim: gpt-image-2 · dirutekan provider ke: gpt-image-2.5-sunburst]');
  });

  it('generateImage error names the model sent when there is no routing header', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(400, { error: { message: 'bad' } })));
    await expect(
      generateImage(PROVIDERS.semutssh, 'https://a', 'k', { model: 'gpt-image-2', prompt: 'p', ratio: '1:1' })
    ).rejects.toThrow('HTTP 400: bad [model dikirim: gpt-image-2]');
  });

  it('generateImage reports routedModel on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(200, { data: [{ url: 'https://x/a.png' }] }, { 'x-litellm-adaptive-router-model': 'gpt-image-2-x' })
      )
    );
    const res = await generateImage(PROVIDERS.semutssh, 'https://a', 'k', { model: 'gpt-image-2', prompt: 'p', ratio: '1:1' });
    expect(res.routedModel).toBe('gpt-image-2-x');
  });

  it('testConnection (openai style) hits /models with Bearer key', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { data: [{ id: 'gpt-image-2' }] }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await testConnection(PROVIDERS.semutssh, 'https://ai.semutssh.com/', 'sk-semut-x');
    expect(fetchMock.mock.calls[0][0]).toBe('https://ai.semutssh.com/models');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-semut-x');
    expect(res.models[0]).toMatchObject({ id: 'gpt-image-2', isImage: true });
  });

  it('testConnection surfaces provider error message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, { error: { message: 'Invalid key' } })));
    await expect(testConnection(PROVIDERS.semutssh, 'https://a', 'k')).rejects.toThrow('HTTP 401: Invalid key');
  });

  it('reports network/CORS failures clearly', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(testConnection(PROVIDERS.custom, 'https://a', 'k')).rejects.toThrow(/CORS/);
  });

  it('generateImage (openai style) posts to /images/generations with size', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { data: [{ b64_json: 'ZZZ' }], usage: { input_tokens: 5, output_tokens: 100, total_tokens: 105 } })
    );
    vi.stubGlobal('fetch', fetchMock);
    const { images, usage } = await generateImage(PROVIDERS.semutssh, 'https://ai.semutssh.com', 'k', {
      model: 'gpt-image-2',
      prompt: 'cat',
      ratio: '3:2',
    });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://ai.semutssh.com/images/generations');
    expect(JSON.parse(opts.body)).toEqual({ model: 'gpt-image-2', prompt: 'cat', size: '1536x1024', n: 1 });
    expect(images).toEqual(['data:image/png;base64,ZZZ']);
    expect(usage).toMatchObject({ inputTokens: 5, outputTokens: 100, totalTokens: 105, cost: null });
  });

  it('generateImage returns usage: null when provider omits it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { data: [{ url: 'https://x/a.png' }] })));
    const res = await generateImage(PROVIDERS.semutssh, 'https://a', 'k', { model: 'm', prompt: 'p', ratio: '1:1' });
    expect(res).toEqual({ images: ['https://x/a.png'], usage: null, routedModel: null });
  });

  it('generateImage (openrouter) uses chat/completions with modalities', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,Q' } }] } }],
        usage: { prompt_tokens: 8, completion_tokens: 1290, total_tokens: 1298, cost: 0.039 },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const { usage } = await generateImage(PROVIDERS.openrouter, PROVIDERS.openrouter.baseUrl, 'k', {
      model: 'flux/pro',
      prompt: 'dog',
      ratio: '1:1',
      textOutput: false,
    });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(JSON.parse(opts.body)).toMatchObject({
      model: 'flux/pro',
      modalities: ['image'],
      image_config: { aspect_ratio: '1:1' },
      usage: { include: true },
    });
    expect(usage).toMatchObject({ totalTokens: 1298, cost: 0.039 });
  });

  it('generateImage throws when no image is returned', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { choices: [{ message: { content: 'sorry' } }] })));
    await expect(
      generateImage(PROVIDERS.openrouter, PROVIDERS.openrouter.baseUrl, 'k', { model: 'm', prompt: 'p', ratio: '1:1' })
    ).rejects.toThrow(/tidak mengembalikan gambar.*sorry/);
  });
});
