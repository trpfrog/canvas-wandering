import type { Point } from './geometry';

export const randomInt = (maxExclusive: number): number => Math.floor(Math.random() * maxExclusive);

/** Picks a random element of a non-empty list. */
export function pick<T>(items: readonly [T, ...T[]]): T {
  return items[randomInt(items.length)] ?? items[0];
}

/** Samples from a Poisson distribution (Knuth's method; fine for small means). */
export function poisson(mean: number): number {
  const limit = Math.exp(-mean);
  let k = 0;
  let p = Math.random();
  while (p > limit) {
    k++;
    p *= Math.random();
  }
  return k;
}

/** How many random candidates to try per point before giving up. */
const ATTEMPTS_PER_POINT = 1000;

/**
 * Picks `count` uniformly random points in the rectangle that are all at least
 * `interval` apart, by trying random candidates and keeping those far enough
 * from every point kept so far.
 */
export function sparsePoints(
  range: { x: number; y: number; w: number; h: number },
  interval: number,
  count: number,
): Point[] {
  const points: Point[] = [];
  for (let attempt = 0; points.length < count; attempt++) {
    if (attempt >= count * ATTEMPTS_PER_POINT) {
      throw new RangeError(`Could not fit ${count} points ${interval} apart (placed ${points.length})`);
    }
    const p = { x: range.x + Math.random() * range.w, y: range.y + Math.random() * range.h };
    if (points.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= interval)) points.push(p);
  }
  return points;
}
