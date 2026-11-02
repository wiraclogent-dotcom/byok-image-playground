import { useState } from 'react';
import { RATIOS, generateImage } from './providers.js';

export default function Playground({ provider, config, textOutput }) {
  const [prompt, setPrompt] = useState('');
  const [ratio, setRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]); // session only

  const canGenerate = config.apiKey && config.model && prompt.trim() && !loading;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError('');
    const started = performance.now();
    try {
      const images = await generateImage(provider, config.baseUrl, config.apiKey, {
        model: config.model,
        prompt: prompt.trim(),
        ratio,
        textOutput,
      });
      const seconds = ((performance.now() - started) / 1000).toFixed(1);
      const batch = images.map((src, i) => ({
        id: `${Date.now()}-${i}`,
        src,
        prompt: prompt.trim(),
        model: config.model,
        provider: provider.name,
        seconds,
      }));
      setResults((r) => [...batch, ...r]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

      <div className="row between">
        <div className="segmented" role="group" aria-label="Rasio">
          {Object.keys(RATIOS).map((r) => (
            <button
              key={r}
              type="button"
              className={r === ratio ? 'active' : ''}
              onClick={() => setRatio(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <button type="button" className="primary" onClick={handleGenerate} disabled={!canGenerate}>
          {loading ? 'Membuat gambar…' : 'Generate'}
        </button>
      </div>

      <p className="muted small">
        {provider.name} · {config.model || 'belum ada model'} · Ctrl/⌘ + Enter untuk generate
      </p>

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
            <figure key={r.id} className="card">
              <img src={r.src} alt={r.prompt} />
              <figcaption>
                <p className="caption-prompt">{r.prompt}</p>
                <p className="muted small">
                  {r.provider} · {r.model} · {r.seconds}s
                </p>
                <a href={r.src} download={`image-${r.id}.png`} target="_blank" rel="noreferrer">
                  Download
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
