export interface StoredAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  gclid?: string;
  fbclid?: string;
  capturedAt: number;
}

const STORAGE_KEY = 'ys_attribution';
const TRACKED_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid'] as const;

// First-touch attribution: captures UTM/click-id params from the current URL
// into localStorage, but never overwrites an attribution already stored —
// the first landing page that brought this visitor in stays credited.
export function captureAttributionFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    let hasAny = false;
    for (const key of TRACKED_PARAMS) {
      const val = params.get(key);
      if (val) { found[key] = val; hasAny = true; }
    }
    if (!hasAny) return;

    const attribution: StoredAttribution = { ...found, capturedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // localStorage unavailable (private mode, blocked storage, etc.) — non-fatal
  }
}

export function getStoredAttribution(): StoredAttribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
