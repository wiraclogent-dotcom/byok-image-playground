// localStorage helpers. Wrapped in try/catch so the app still works when storage is unavailable.
const STATE_KEY = 'byok-image-playground';
const USAGE_KEY = 'byok-image-playground:usage';
const MAX_USAGE_ENTRIES = 1000;

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode etc.) — keep working in memory
  }
}

// { active, idrRate, providers: { [id]: { apiKey, model, baseUrl, prices } } }
export const loadState = () => load(STATE_KEY, {});
export const saveState = (state) => save(STATE_KEY, state);

// [{ id, time, provider, model, ratio, inputTokens, outputTokens, totalTokens, cost, costKind }]
export const loadUsage = () => {
  const log = load(USAGE_KEY, []);
  return Array.isArray(log) ? log : [];
};
export const saveUsage = (log) => save(USAGE_KEY, log.slice(-MAX_USAGE_ENTRIES));
