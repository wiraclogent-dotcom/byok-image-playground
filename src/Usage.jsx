import { formatIDR, formatTokens, formatUSD, summarize } from './usage.js';

export default function Usage({ log, provider, idrRate, onRateChange, onReset }) {
  const { totals, byModel } = summarize(log);

  function handleReset() {
    if (window.confirm('Hapus semua riwayat monitoring token & biaya?')) onReset();
  }

  return (
    <section className="panel" aria-labelledby="usage-title">
      <h2 id="usage-title">Monitoring</h2>

      <div className="stats">
        <div>
          <span className="stat-value">{totals.count}</span>
          <span className="stat-label">generate</span>
        </div>
        <div>
          <span className="stat-value">{formatTokens(totals.totalTokens)}</span>
          <span className="stat-label">token</span>
        </div>
        <div>
          <span className="stat-value">{formatUSD(totals.cost)}</span>
          <span className="stat-label">{formatIDR(totals.cost, idrRate)}</span>
        </div>
      </div>

      {totals.count > 0 && (
        <p className="muted small">
          Input {formatTokens(totals.inputTokens)} · output {formatTokens(totals.outputTokens)}
          {totals.hasEstimate && ' · sebagian biaya adalah perkiraan'}
          {totals.unreported > 0 && ` · ${totals.unreported} generate tanpa data token`}
        </p>
      )}

      {byModel.length > 0 ? (
        <table className="usage-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Gen</th>
              <th>Token</th>
              <th>Biaya</th>
            </tr>
          </thead>
          <tbody>
            {byModel.map((r) => (
              <tr key={r.key}>
                <td>
                  <span className="model-cell">{r.model}</span>
                  <span className="muted small">{r.provider}</span>
                </td>
                <td>{r.count}</td>
                <td>{formatTokens(r.totalTokens)}</td>
                <td>
                  {formatUSD(r.cost)}
                  {r.hasEstimate && <span className="muted">*</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted small">Belum ada generate. Token & biaya tiap generate akan tercatat di sini.</p>
      )}

      <div className="row between">
        <label className="rate">
          <span className="muted small">Kurs Rp / $1</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Kurs Rupiah per USD"
            value={idrRate}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, ''));
              onRateChange(Number.isFinite(n) ? n : 0);
            }}
          />
        </label>
        <button type="button" className="ghost" onClick={handleReset} disabled={log.length === 0}>
          Reset
        </button>
      </div>

      {provider.usageUrl && (
        <p className="muted small">
          Sisa budget {provider.name} hanya bisa dilihat di{' '}
          <a href={provider.usageUrl} target="_blank" rel="noreferrer">
            dashboard {provider.name}
          </a>
          .
        </p>
      )}
    </section>
  );
}
