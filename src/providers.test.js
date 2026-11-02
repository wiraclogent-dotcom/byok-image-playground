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
  it('prefers error.message and truncates', () => {
    expect(errorMessage(401, { error: { message: 'bad key' } })).toBe('HTTP 401: bad key');
    expect(errorMessage(500, { raw: 'x'.repeat(500) })).toHaveLength('HTTP 500: '.length + 300);
    expect(errorMessage(404, {})).toBe('HTTP 404');
  });
});

describe('network calls', () => {
  afterEach(() => vi.unstubAllGlobals());

  const jsonResponse = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
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
    const fetchMock = vi.fn(async () => jsonResponse(200, { data: [{ b64_json: 'ZZZ' }] }));
    vi.stubGlobal('fetch', fetchMock);
    const imgs = await generateImage(PROVIDERS.semutssh, 'https://ai.semutssh.com', 'k', {
      model: 'gpt-image-2',
      prompt: 'cat',
      ratio: '3:2',
    });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://ai.semutssh.com/images/generations');
    expect(JSON.parse(opts.body)).toEqual({ model: 'gpt-image-2', prompt: 'cat', size: '1536x1024', n: 1 });
    expect(imgs).toEqual(['data:image/png;base64,ZZZ']);
  });

  it('generateImage (openrouter) uses chat/completions with modalities', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,Q' } }] } }] })
    );
    vi.stubGlobal('fetch', fetchMock);
    await generateImage(PROVIDERS.openrouter, PROVIDERS.openrouter.baseUrl, 'k', {
      model: 'flux/pro',
      prompt: 'dog',
      ratio: '1:1',
      textOutput: false,
    });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(JSON.parse(opts.body)).toMatchObject({ model: 'flux/pro', modalities: ['image'], image_config: { aspect_ratio: '1:1' } });
  });

  it('generateImage throws when no image is returned', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { choices: [{ message: { content: 'sorry' } }] })));
    await expect(
      generateImage(PROVIDERS.openrouter, PROVIDERS.openrouter.baseUrl, 'k', { model: 'm', prompt: 'p', ratio: '1:1' })
    ).rejects.toThrow(/tidak mengembalikan gambar.*sorry/);
  });
});
