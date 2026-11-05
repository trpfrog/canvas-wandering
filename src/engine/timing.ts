/** Returns a ticker that calls `fn` once for every full `ms` milliseconds fed to it. */
export function every(ms: number, fn: () => void): (dt: number) => void {
  let elapsed = 0;
  return (dt) => {
    for (elapsed += dt; elapsed >= ms; elapsed -= ms) fn();
  };
}

/** Computes the value on first use and keeps it. */
export function lazy<T>(create: () => T): () => T {
  let value: { current: T } | undefined;
  return () => (value ??= { current: create() }).current;
}
