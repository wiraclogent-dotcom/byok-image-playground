import { useEffect, useState } from 'react';
import { PROVIDERS } from './providers.js';
import { loadState, saveState } from './storage.js';
import Settings from './Settings.jsx';
import Playground from './Playground.jsx';

export default function App() {
  const [saved, setSaved] = useState(loadState);
  const [models, setModels] = useState({}); // per provider id, in memory
  const [status, setStatus] = useState({}); // per provider id: { state, message }

  useEffect(() => saveState(saved), [saved]);

  const activeId = PROVIDERS[saved.active] ? saved.active : 'openrouter';
  const provider = PROVIDERS[activeId];
  const stored = saved.providers?.[activeId] || {};
  const config = {
    apiKey: stored.apiKey || '',
    model: stored.model || '',
    baseUrl: activeId === 'custom' ? stored.baseUrl || '' : provider.baseUrl,
  };

  const setActive = (id) => setSaved((s) => ({ ...s, active: id }));
  const updateConfig = (patch) =>
    setSaved((s) => ({
      ...s,
      providers: { ...s.providers, [activeId]: { ...s.providers?.[activeId], ...patch } },
    }));

  const providerModels = models[activeId] || [];
  const selectedModel = providerModels.find((m) => m.id === config.model);

  return (
    <div className="app">
      <header className="header">
        <h1>BYOK Image Playground</h1>
        <span className="muted">Key disimpan di browser ini saja · request langsung ke provider</span>
      </header>
      <main className="layout">
        <Settings
          provider={provider}
          config={config}
          models={providerModels}
          status={status[activeId] || { state: 'idle' }}
          onSelectProvider={setActive}
          onChange={updateConfig}
          onModels={(list) => setModels((m) => ({ ...m, [activeId]: list }))}
          onStatus={(st) => setStatus((s) => ({ ...s, [activeId]: st }))}
        />
        <Playground
          provider={provider}
          config={config}
          textOutput={selectedModel ? selectedModel.textOutput : true}
        />
      </main>
    </div>
  );
}
