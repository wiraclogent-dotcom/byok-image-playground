import { useEffect, useState } from 'react';
import { PROVIDERS } from './providers.js';
import { loadState, loadUsage, saveState, saveUsage } from './storage.js';
import { effectivePrice } from './usage.js';
import Settings from './Settings.jsx';
import Playground from './Playground.jsx';
import Usage from './Usage.jsx';

const DEFAULT_IDR_RATE = 16500;

export default function App() {
  const [saved, setSaved] = useState(loadState);
  const [usageLog, setUsageLog] = useState(loadUsage);
  const [models, setModels] = useState({}); // per provider id, in memory
  const [status, setStatus] = useState({}); // per provider id: { state, message }

  useEffect(() => saveState(saved), [saved]);
  useEffect(() => saveUsage(usageLog), [usageLog]);

  const activeId = PROVIDERS[saved.active] ? saved.active : 'openrouter';
  const provider = PROVIDERS[activeId];
  const stored = saved.providers?.[activeId] || {};
  const config = {
    apiKey: stored.apiKey || '',
    model: stored.model || '',
    baseUrl: activeId === 'custom' ? stored.baseUrl || '' : provider.baseUrl,
  };
  const idrRate = saved.idrRate ?? DEFAULT_IDR_RATE;

  const setActive = (id) => setSaved((s) => ({ ...s, active: id }));
  const updateConfig = (patch) =>
    setSaved((s) => ({
      ...s,
      providers: { ...s.providers, [activeId]: { ...s.providers?.[activeId], ...patch } },
    }));

  const providerModels = models[activeId] || [];
  const selectedModel = providerModels.find((m) => m.id === config.model);

  // Price for the selected model: user override > model list (OpenRouter) > provider docs defaults
  const priceOverride = stored.prices?.[config.model];
  const docsPrice = provider.defaultPrices?.[config.model] || null;
  const basePrice = selectedModel?.price || docsPrice;
  const price = effectivePrice(priceOverride, basePrice);
  const priceSource = priceOverride
    ? 'manual'
    : selectedModel?.price
      ? 'models'
      : docsPrice
        ? 'docs'
        : null;

  const updatePrice = (field, value) => {
    const next = { ...(stored.prices?.[config.model] || {}) };
    if (value === '') delete next[field];
    else next[field] = value;
    const prices = { ...(stored.prices || {}) };
    if (Object.keys(next).length) prices[config.model] = next;
    else delete prices[config.model];
    updateConfig({ prices });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>BYOK Image Playground</h1>
        <span className="muted">Key disimpan di browser ini saja · request langsung ke provider</span>
      </header>
      <main className="layout">
        <div className="sidebar">
          <Settings
            provider={provider}
            config={config}
            models={providerModels}
            status={status[activeId] || { state: 'idle' }}
            onSelectProvider={setActive}
            onChange={updateConfig}
            onModels={(list) => setModels((m) => ({ ...m, [activeId]: list }))}
            onStatus={(st) => setStatus((s) => ({ ...s, [activeId]: st }))}
            price={price}
            basePrice={basePrice}
            priceOverride={priceOverride}
            priceSource={priceSource}
            priceNote={docsPrice?.source}
            onPriceChange={updatePrice}
          />
          <Usage
            log={usageLog}
            provider={provider}
            idrRate={idrRate}
            onRateChange={(rate) => setSaved((s) => ({ ...s, idrRate: rate }))}
            onReset={() => setUsageLog([])}
          />
        </div>
        <Playground
          provider={provider}
          config={config}
          textOutput={selectedModel ? selectedModel.textOutput : true}
          price={price}
          idrRate={idrRate}
          onRecord={(entry) => setUsageLog((log) => [...log, entry])}
        />
      </main>
    </div>
  );
}
