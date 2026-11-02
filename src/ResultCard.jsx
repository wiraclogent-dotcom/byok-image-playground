import { useState } from 'react';
import { fileExtension } from './options.js';
import { formatIDR, formatTokens, formatUSD } from './usage.js';

export default function ResultCard({ r, idrRate, onReprocess }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const keyed = Boolean(r.keyedSrc) && !showOriginal;
  const src = keyed ? r.keyedSrc : r.src;
  const ext = keyed ? 'png' : fileExtension(r.format);
  const details = [r.size || r.ratio, r.quality && r.quality !== 'auto' ? r.quality : null, r.styleLabel]
    .filter(Boolean)
    .join(' · ');

  return (
    <figure className="card">
      <div className={`card-image${r.keyedSrc ? ' checker' : ''}`}>
        <img src={src} alt={r.prompt} />
      </div>
      <figcaption>
        <p className="caption-prompt">{r.prompt}</p>
        <p className="muted small">
          {r.provider} · {r.model}
          {r.routedModel && ` → dirutekan ke ${r.routedModel}`} · {r.seconds}s
        </p>
        {details && <p className="muted small">{details}</p>}

        {r.chromaError && <p className="small error-text">{r.chromaError}</p>}
        {r.keyedSrc && (
          <div className="row small chroma-actions">
            <button type="button" className="link" onClick={() => setShowOriginal((v) => !v)}>
              {showOriginal ? 'Lihat transparan' : 'Lihat asli'}
            </button>
            <button type="button" className="link" onClick={() => onReprocess(r.id)}>
              Proses ulang (toleransi saat ini)
            </button>
          </div>
        )}

        <UsageLine usage={r.usage} cost={r.cost} idrRate={idrRate} batchSize={r.batchSize} />
        <a href={src} download={`image-${r.id}.${ext}`} target="_blank" rel="noreferrer">
          Download {ext.toUpperCase()}
          {keyed && ' transparan'}
        </a>
      </figcaption>
    </figure>
  );
}

function UsageLine({ usage, cost, idrRate, batchSize }) {
  if (!usage) {
    return <p className="usage-line muted small">Token: provider tidak melaporkan token</p>;
  }
  return (
    <div className="usage-line small">
      <p>
        Token: {formatTokens(usage.inputTokens)} in · {formatTokens(usage.outputTokens)} out ·{' '}
        <strong>{formatTokens(usage.totalTokens)}</strong> total
        {batchSize > 1 && <span className="muted"> (untuk {batchSize} gambar)</span>}
      </p>
      <p>
        Biaya:{' '}
        {cost ? (
          <>
            <strong>{formatUSD(cost.amount)}</strong>{' '}
            <span className={`badge badge-${cost.kind}`}>{cost.kind === 'actual' ? 'aktual' : 'perkiraan'}</span>{' '}
            ≈ {formatIDR(cost.amount, idrRate)}
          </>
        ) : (
          <span className="muted">harga model belum diisi</span>
        )}
      </p>
      <details>
        <summary className="muted">usage mentah</summary>
        <pre>{JSON.stringify(usage.raw, null, 2)}</pre>
      </details>
    </div>
  );
}
