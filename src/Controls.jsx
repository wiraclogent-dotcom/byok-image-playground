import { RATIOS } from './providers.js';
import { FORMATS, QUALITIES, SIZES, STYLES } from './options.js';

// Generation options. OpenAI-style providers get size/quality/format;
// OpenRouter keeps aspect-ratio buttons. Style + chroma key work everywhere.
export default function Controls({ isOpenAI, values, onChange }) {
  const { ratio, size, quality, format, styleId, chroma } = values;
  const qualityHint = QUALITIES.find((q) => q.value === quality)?.hint;
  const sizeInfo = SIZES.find((s) => s.value === size);
  const setChroma = (patch) => onChange({ chroma: { ...chroma, ...patch } });

  return (
    <div className="controls">
      {isOpenAI ? (
        <>
          <label className="field">
            <span>Ukuran</span>
            <select value={size} onChange={(e) => onChange({ size: e.target.value })}>
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {sizeInfo?.experimental && <em className="muted small">4K masih eksperimental di gpt-image-2.</em>}
          </label>
          <label className="field">
            <span>Kualitas</span>
            <select value={quality} onChange={(e) => onChange({ quality: e.target.value })}>
              {QUALITIES.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
            {qualityHint && <em className="muted small">{qualityHint}</em>}
          </label>
          <label className="field">
            <span>Format</span>
            <select value={format} onChange={(e) => onChange({ format: e.target.value })}>
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            {chroma.enabled && <em className="muted small">Hasil transparan selalu PNG.</em>}
          </label>
        </>
      ) : (
        <div className="field">
          <span>Rasio</span>
          <div className="segmented" role="group" aria-label="Rasio">
            {Object.keys(RATIOS).map((r) => (
              <button
                key={r}
                type="button"
                className={r === ratio ? 'active' : ''}
                onClick={() => onChange({ ratio: r })}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="field">
        <span>Style</span>
        <select value={styleId} onChange={(e) => onChange({ styleId: e.target.value })}>
          {STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <div className="field chroma">
        <label className="check">
          <input
            type="checkbox"
            checked={chroma.enabled}
            onChange={(e) => setChroma({ enabled: e.target.checked })}
          />
          Background transparan (chroma key)
        </label>
        {chroma.enabled && (
          <div className="row chroma-row">
            <input
              type="color"
              aria-label="Warna kunci"
              value={chroma.color}
              onChange={(e) => setChroma({ color: e.target.value.toUpperCase() })}
            />
            <code>{chroma.color}</code>
            <label className="tolerance">
              <span className="muted small">Toleransi {chroma.tolerance}</span>
              <input
                type="range"
                min="5"
                max="60"
                aria-label="Toleransi warna"
                value={chroma.tolerance}
                onChange={(e) => setChroma({ tolerance: Number(e.target.value) })}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
