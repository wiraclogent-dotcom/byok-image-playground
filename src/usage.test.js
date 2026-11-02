import { describe, expect, it } from 'vitest';
import {
  effectivePrice,
  estimateCost,
  extractUsage,
  formatIDR,
  formatUSD,
  resolveCost,
  summarize,
} from './usage.js';

describe('extractUsage', () => {
  it('reads OpenAI Images naming (input_tokens / output_tokens)', () => {
    const u = extractUsage({
      usage: { input_tokens: 52, output_tokens: 4160, total_tokens: 4212, input_tokens_details: { text_tokens: 52 } },
    });
    expect(u).toMatchObject({ inputTokens: 52, outputTokens: 4160, totalTokens: 4212, cost: null });
    expect(u.raw.input_tokens_details).toEqual({ text_tokens: 52 });
  });

  it('reads chat naming + OpenRouter cost', () => {
    const u = extractUsage({ usage: { prompt_tokens: 10, completion_tokens: 1290, total_tokens: 1300, cost: 0.0387 } });
    expect(u).toMatchObject({ inputTokens: 10, outputTokens: 1290, totalTokens: 1300, cost: 0.0387 });
  });

  it('derives total when missing', () => {
    expect(extractUsage({ usage: { prompt_tokens: 3, completion_tokens: 7 } }).totalTokens).toBe(10);
  });

  it('returns null when provider sends no usage', () => {
    expect(extractUsage({ data: [] })).toBeNull();
    expect(extractUsage({ usage: {} })).toBeNull();
    expect(extractUsage(null)).toBeNull();
  });
});

describe('estimateCost / resolveCost', () => {
  const usage = { inputTokens: 52, outputTokens: 4160, totalTokens: 4212, cost: null };

  it('multiplies tokens by USD-per-1M prices', () => {
    expect(estimateCost(usage, { input: 5, output: 0 })).toBeCloseTo(0.00026, 10);
    expect(estimateCost(usage, { input: 5, output: 40 })).toBeCloseTo(0.16666, 5);
  });

  it('returns null without price or token split', () => {
    expect(estimateCost(usage, null)).toBeNull();
    expect(estimateCost({ inputTokens: null, outputTokens: null, totalTokens: 9 }, { input: 1, output: 1 })).toBeNull();
    expect(estimateCost(null, { input: 1, output: 1 })).toBeNull();
  });

  it('prefers actual provider cost over estimate', () => {
    expect(resolveCost({ ...usage, cost: 0.04 }, { input: 5, output: 0 })).toEqual({ amount: 0.04, kind: 'actual' });
    expect(resolveCost(usage, { input: 5, output: 0 })).toEqual({ amount: expect.closeTo(0.00026, 10), kind: 'estimate' });
    expect(resolveCost(usage, null)).toBeNull();
  });
});

describe('effectivePrice', () => {
  it('uses override fields (strings) over base, per field', () => {
    expect(effectivePrice({ output: '40' }, { input: 5, output: 0 })).toEqual({ input: 5, output: 40 });
    expect(effectivePrice({ input: '', output: 'abc' }, { input: 5, output: 0 })).toEqual({ input: 5, output: 0 });
  });

  it('fills a missing side with 0 and returns null when nothing is known', () => {
    expect(effectivePrice({ input: '2.5' }, null)).toEqual({ input: 2.5, output: 0 });
    expect(effectivePrice(undefined, null)).toBeNull();
  });
});

describe('summarize', () => {
  it('totals and groups by provider + model', () => {
    const { totals, byModel } = summarize([
      { provider: 'SemutSSH', model: 'gpt-image-2', inputTokens: 50, outputTokens: 4000, totalTokens: 4050, cost: 0.00025, costKind: 'estimate' },
      { provider: 'SemutSSH', model: 'gpt-image-2', inputTokens: 60, outputTokens: 4000, totalTokens: 4060, cost: 0.0003, costKind: 'estimate' },
      { provider: 'OpenRouter', model: 'google/x-image', inputTokens: 10, outputTokens: 1290, totalTokens: 1300, cost: 0.04, costKind: 'actual' },
      { provider: 'SemutSSH', model: 'gpt-image-2', inputTokens: null, outputTokens: null, totalTokens: null, cost: null, costKind: null },
    ]);
    expect(totals).toMatchObject({ count: 4, inputTokens: 120, outputTokens: 9290, totalTokens: 9410, hasEstimate: true, unreported: 1 });
    expect(totals.cost).toBeCloseTo(0.04055, 10);
    expect(byModel.map((r) => [r.model, r.count])).toEqual([
      ['google/x-image', 1],
      ['gpt-image-2', 3],
    ]);
  });

  it('handles an empty log', () => {
    expect(summarize([]).totals).toMatchObject({ count: 0, totalTokens: 0, cost: 0 });
  });
});

describe('formatting', () => {
  it('formats USD with enough precision for tiny amounts', () => {
    expect(formatUSD(0)).toBe('$0');
    expect(formatUSD(0.00026)).toBe('$0.00026');
    expect(formatUSD(0.0123)).toBe('$0.012');
    expect(formatUSD(1.5)).toBe('$1.50');
    expect(formatUSD(null)).toBe('—');
  });

  it('formats IDR with Indonesian separators', () => {
    expect(formatIDR(1, 16500)).toBe('Rp16.500');
    expect(formatIDR(0.00026, 16500)).toBe('Rp4,29');
    expect(formatIDR(null, 16500)).toBe('—');
    expect(formatIDR(1, 0)).toBe('—');
  });
});
