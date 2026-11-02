import { useState } from 'react';
import { PROVIDERS, testConnection } from './providers.js';

const PRICE_SOURCE_LABEL = {
  manual: 'Sumber: diisi manual (kosongkan untuk kembali ke default).',
  models: 'Sumber: daftar model provider.',
  docs: 'Sumber: dokumentasi harga provider.',
};

export default function Settings({
  provider,
  config,
  models,
  status,
  onSelectProvider,
  onChange,
  onModels,
  onStatus,
  price,
  basePrice,
  priceOverride,
  priceSource,
  onPriceChange,
}) {
  const [showKey, setShowKey] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visibleModels = showAll ? models : models.filter((m) => m.isImage);
  const imageCount = models.filter((m) => m.isImage).length;

  async function handleTest() {
    onStatus({ state: 'loading', message: 'Menghubungkan…' });
    try {
      const { models: list, info } = await testConnection(provider, config.baseUrl, config.apiKey);
      onModels(list);
      const imgs = list.filter((m) => m.isImage).length;
      onStatus({ state: 'ok', message: `Terhubung · ${info} · ${imgs} model gambar dari ${list.length} model` });
      if (!config.model && imgs > 0) onChange({ model: list.find((m) => m.isImage).id });
    } catch (err) {
      onStatus({ state: 'error', message: err.message });
    }
  }

  function handleClear() {
    onChange({ apiKey: '' });
    onModels([]);
    onStatus({ state: 'idle' });
  }

  return (
    <section className="panel">
      <h2>Pengaturan</h2>

      <label className="field">
        <span>Provider</span>
        <select value={provider.id} onChange={(e) => onSelectProvider(e.target.value)}>
          {Object.values(PROVIDERS).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Base URL</span>
        {provider.id === 'custom' ? (
          <input
            type="url"
            placeholder="https://gateway-anda.com/v1"
            value={config.baseUrl}
            onChange={(e) => onChange({ baseUrl: e.target.value.trim() })}
          />
        ) : (
          <code className="readonly">{config.baseUrl}</code>
        )}
      </label>

      <label className="field">
        <span>API Key</span>
        <div className="row">
          <input
            type={showKey ? 'text' : 'password'}
            placeholder={provider.keyHint}
            value={config.apiKey}
            onChange={(e) => onChange({ apiKey: e.target.value.trim() })}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="ghost" onClick={() => setShowKey((v) => !v)}>
            {showKey ? 'Sembunyi' : 'Tampil'}
          </button>
        </div>
      </label>

      <div className="row">
        <button
          type="button"
          onClick={handleTest}
          disabled={!config.apiKey || status.state === 'loading'}
        >
          {status.state === 'loading' ? 'Menguji…' : 'Tes Koneksi'}
        </button>
        <button type="button" className="ghost" onClick={handleClear} disabled={!config.apiKey}>
          Hapus key
        </button>
      </div>

      {status.state !== 'idle' && (
        <p className={`status status-${status.state}`} role="status">
          {status.message}
        </p>
      )}

      <hr />

      <label className="field">
        <span>
          Model {models.length > 0 && <em className="muted">({imageCount} model gambar)</em>}
        </span>
        {models.length > 0 ? (
          <select value={config.model} onChange={(e) => onChange({ model: e.target.value })}>
            <option value="">— pilih model —</option>
            {visibleModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </select>
        ) : (
          <p className="muted small">Klik “Tes Koneksi” untuk memuat daftar model.</p>
        )}
      </label>

      {models.length > 0 && (
        <label className="check">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Tampilkan semua model
        </label>
      )}

      <label className="field">
        <span>atau ketik ID model</span>
        <input
          type="text"
          placeholder="mis. gpt-image-2"
          value={config.model}
          onChange={(e) => onChange({ model: e.target.value.trim() })}
          spellCheck={false}
        />
      </label>

      {config.model && (
        <fieldset className="field price">
          <legend>Harga model (USD per 1M token)</legend>
          <div className="row">
            {['input', 'output'].map((field) => (
              <label key={field} className="price-input">
                <span className="muted small">{field === 'input' ? 'Input' : 'Output'} $</span>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={`Harga ${field} per 1M token`}
                  placeholder={basePrice ? String(basePrice[field]) : '0'}
                  value={priceOverride?.[field] ?? ''}
                  onChange={(e) => onPriceChange(field, e.target.value.trim().replace(',', '.'))}
                />
              </label>
            ))}
          </div>
          <p className="muted small">{PRICE_SOURCE_LABEL[priceSource] || 'Harga belum diketahui — isi manual untuk estimasi biaya.'}</p>
          {provider.style === 'openrouter' && (
            <p className="muted small">OpenRouter mengirim biaya aktual di setiap respons; harga ini hanya cadangan.</p>
          )}
          {!price && <p className="muted small">Tanpa harga, hanya jumlah token yang ditampilkan.</p>}
        </fieldset>
      )}
    </section>
  );
}
