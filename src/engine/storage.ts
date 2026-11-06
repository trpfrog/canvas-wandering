import * as v from 'valibot';

const PREFIX = 'space-wandering:v1:';

/**
 * Reads a JSON value from localStorage. Storage may be unavailable or hold
 * anything, so missing, broken or unexpected data falls back.
 */
export function loadJson<const Schema extends v.GenericSchema>(
  key: string,
  schema: Schema,
  fallback: v.InferOutput<Schema>,
): v.InferOutput<Schema> {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const result = v.safeParse(schema, JSON.parse(raw));
    return result.success ? result.output : fallback;
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
