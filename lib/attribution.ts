export interface StoredAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  gclid?: string;
  fbclid?: string;
  // Meta browser ids, read fresh from cookies on every call (not stored) —
  // sent with the order so the server-side Conversions API can match the buyer.
  fbp?: string;
  fbc?: string;
  capturedAt: number;
}

function readCookie(name: string): string | undefined {
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : undefined;
  } catch {
    return undefined;
  }
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
  let stored: StoredAttribution | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    stored = raw ? JSON.parse(raw) : null;
  } catch {
    stored = null;
  }
  const fbp = readCookie('_fbp');
  let fbc = readCookie('_fbc');
  if (!fbc && stored?.fbclid) fbc = `fb.1.${stored.capturedAt || Date.now()}.${stored.fbclid}`;
  if (!stored && !fbp && !fbc) return null;
  return {
    ...(stored ?? { capturedAt: Date.now() }),
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
  };
}
