// Token usage + cost helpers (pure functions, no React).
// Prices are always USD per 1M tokens: { input, output }.

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const toNum = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Normalizes `usage` from either API style:
//   OpenAI Images: input_tokens / output_tokens / total_tokens
//   Chat (OpenRouter): prompt_tokens / completion_tokens / total_tokens / cost (USD)
export function extractUsage(data) {
  const u = data?.usage;
  if (!u || typeof u !== 'object') return null;
  const inputTokens = num(u.input_tokens) ?? num(u.prompt_tokens);
  const outputTokens = num(u.output_tokens) ?? num(u.completion_tokens);
  let totalTokens = num(u.total_tokens);
  if (totalTokens == null && (inputTokens != null || outputTokens != null)) {
    totalTokens = (inputTokens || 0) + (outputTokens || 0);
  }
  const cost = num(u.cost);
  if (inputTokens == null && outputTokens == null && totalTokens == null && cost == null) return null;
  return { inputTokens, outputTokens, totalTokens, cost, raw: u };
}

export function estimateCost(usage, price) {
  if (!usage || !price) return null;
  const { inputTokens, outputTokens } = usage;
  if (inputTokens == null && outputTokens == null) return null;
  return ((inputTokens || 0) * (price.input || 0) + (outputTokens || 0) * (price.output || 0)) / 1e6;
}

// Actual cost reported by the provider wins; otherwise estimate from price.
export function resolveCost(usage, price) {
  if (usage?.cost != null) return { amount: usage.cost, kind: 'actual' };
  const amount = estimateCost(usage, price);
  return amount == null ? null : { amount, kind: 'estimate' };
}

// override: user-typed strings { input?, output? }; base: { input, output } | null
export function effectivePrice(override, base) {
  const input = toNum(override?.input) ?? toNum(base?.input);
  const output = toNum(override?.output) ?? toNum(base?.output);
  if (input == null && output == null) return null;
  return { input: input ?? 0, output: output ?? 0 };
}

export function summarize(log) {
  const totals = { count: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0, hasEstimate: false, unreported: 0 };
  const rows = new Map();
  for (const e of log) {
    const key = `${e.provider}\u0000${e.model}`;
    const row = rows.get(key) || { key, provider: e.provider, model: e.model, count: 0, totalTokens: 0, cost: 0, hasEstimate: false };
    for (const t of [totals, row]) {
      t.count += 1;
      t.totalTokens += e.totalTokens || 0;
      t.cost += e.cost || 0;
      if (e.costKind === 'estimate') t.hasEstimate = true;
    }
    totals.inputTokens += e.inputTokens || 0;
    totals.outputTokens += e.outputTokens || 0;
    if (e.totalTokens == null) totals.unreported += 1;
    rows.set(key, row);
  }
  const byModel = [...rows.values()].sort((a, b) => b.cost - a.cost || b.count - a.count);
  return { totals, byModel };
}

export function formatUSD(n) {
  if (n == null) return '—';
  if (n === 0) return '$0';
  if (n >= 1) return `$${n.toFixed(2)}`;
  const decimals = Math.min(10, Math.max(2, -Math.floor(Math.log10(n)) + 1));
  return `$${n.toFixed(decimals)}`;
}

export function formatIDR(usd, rate) {
  if (usd == null || !rate) return '—';
  const idr = usd * rate;
  return `Rp${idr.toLocaleString('id-ID', { maximumFractionDigits: idr < 10 ? 2 : 0 })}`;
}

export function formatTokens(n) {
  return n == null ? '—' : n.toLocaleString('id-ID');
}
