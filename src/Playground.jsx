import { useState } from 'react';
import { generateImage } from './providers.js';
import { STYLES, buildPrompt } from './options.js';
import { removeBackground } from './chromaKey.js';
import { resolveCost } from './usage.js';
import Controls from './Controls.jsx';
import ResultCard from './ResultCard.jsx';

const DEFAULT_OPTIONS = {
  ratio: '1:1',
  size: '1024x1024',
  quality: 'auto',
  format: 'png',
  styleId: 'none',
  chroma: { enabled: false, color: '#FF00FF', tolerance: 25 },
};

async function keyOut(src, chroma) {
  try {
    const { src: keyedSrc } = await removeBackground(src, chroma.color, chroma.tolerance);
    return { keyedSrc, chromaError: null };
  } catch (err) {
    return { keyedSrc: null, chromaError: err.message };
  }
}

export default function Playground({ provider, config, textOutput, price, idrRate, onRecord }) {
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]); // session only

  const isOpenAI = provider.style === 'openai';
  const finalPrompt = buildPrompt(prompt, { styleId: options.styleId, chromaKey: options.chroma });
  const canGenerate = config.apiKey && config.model && prompt.trim() && !loading;
  const updateOptions = (patch) => setOptions((o) => ({ ...o, ...patch }));

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError('');
    const started = performance.now();
    const opts = options; // snapshot for this request
    try {
      const { images, usage, routedModel } = await generateImage(provider, config.baseUrl, config.apiKey, {
        model: config.model,
        prompt: finalPrompt,
        ratio: opts.ratio,
        ...(isOpenAI ? { size: opts.size, quality: opts.quality, format: opts.format } : {}),
        textOutput,
      });
      const seconds = ((performance.now() - started) / 1000).toFixed(1);
      const cost = resolveCost(usage, price);
      const id = `${Date.now()}`;
      const styleLabel = opts.styleId !== 'none' ? STYLES.find((s) => s.id === opts.styleId)?.label : null;

      onRecord({
        id,
        time: new Date().toISOString(),
        provider: provider.name,
        model: config.model,
        ratio: isOpenAI ? null : opts.ratio,
        size: isOpenAI ? opts.size : null,
        quality: isOpenAI ? opts.quality : null,
        style: opts.styleId,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        totalTokens: usage?.totalTokens ?? null,
        cost: cost?.amount ?? null,
        costKind: cost?.kind ?? null,
      });

      const batch = await Promise.all(
        images.map(async (src, i) => ({
          id: `${id}-${i}`,
          src,
          ...(opts.chroma.enabled ? await keyOut(src, opts.chroma) : {}),
          prompt: prompt.trim(),
          model: config.model,
          routedModel: routedModel && routedModel !== config.model ? routedModel : null,
          provider: provider.name,
          seconds,
          ratio: isOpenAI ? null : opts.ratio,
          size: isOpenAI ? opts.size : null,
          quality: isOpenAI ? opts.quality : null,
          format: isOpenAI ? opts.format : 'png',
          styleLabel,
          usage,
          cost,
          batchSize: images.length,
        }))
      );
      setResults((r) => [...batch, ...r]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReprocess(id) {
    const item = results.find((r) => r.id === id);
    if (!item) return;
    const keyed = await keyOut(item.src, options.chroma);
    setResults((rs) => rs.map((r) => (r.id === id ? { ...r, ...keyed } : r)));
  }

  return (
    <section className="panel grow">
      <h2>Playground</h2>

      <label className="field">
        <span>Prompt</span>
        <textarea
          rows={4}
          placeholder="Seekor kucing astronot melayang di atas Jakarta saat senja, gaya ilustrasi digital"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate();
          }}
        />
      </label>

      <Controls isOpenAI={isOpenAI} values={options} onChange={updateOptions} />

      {finalPrompt !== prompt.trim() && prompt.trim() && (
        <details className="final-prompt">
          <summary className="muted small">Lihat prompt final yang dikirim</summary>
          <pre>{finalPrompt}</pre>
        </details>
      )}

      <div className="row between">
        <p className="muted small">
          {provider.name} · {config.model || 'belum ada model'} · Ctrl/⌘ + Enter untuk generate
        </p>
        <button type="button" className="primary" onClick={handleGenerate} disabled={!canGenerate}>
          {loading ? 'Membuat gambar…' : 'Generate'}
        </button>
      </div>

      {error && (
        <p className="status status-error" role="alert">
          {error}
        </p>
      )}

      {results.length === 0 && !loading ? (
        <div className="empty muted">Hasil gambar akan muncul di sini.</div>
      ) : (
        <div className="grid">
          {loading && <div className="card skeleton">Sedang membuat…</div>}
          {results.map((r) => (
            <ResultCard key={r.id} r={r} idrRate={idrRate} onReprocess={handleReprocess} />
          ))}
        </div>
      )}
    </section>
  );
}
