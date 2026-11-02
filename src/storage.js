// Persists { active, providers: { [id]: { apiKey, model, baseUrl } } } in localStorage.
const STORAGE_KEY = 'byok-image-playground';

export function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private mode etc.) — app still works in memory
  }
}
