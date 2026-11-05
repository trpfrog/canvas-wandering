const PREFIX = 'space-wandering:v1:';

/**
 * Reads a JSON value from localStorage. Storage may be unavailable or hold
 * anything, so missing, broken or unexpected data falls back.
 */
export function loadJson<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    return isValid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Persisting is best-effort only.
  }
}
