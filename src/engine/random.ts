import type { Point } from './geometry';

export const randomInt = (maxExclusive: number): number => Math.floor(Math.random() * maxExclusive);

/** Returns a shuffled copy (sorting by independent random keys is unbiased). */
export function shuffled<T>(items: readonly T[]): T[] {
  return items
    .map((item) => ({ item, key: Math.random() }))
    .toSorted((a, b) => a.key - b.key)
    .map(({ item }) => item);
}

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

/**
 * Picks `count` random points in the rectangle that are at least `interval` apart.
 *
 * The rectangle is divided into a hexagonal lattice with spacing `2 * interval`,
 * `count` lattice points are chosen at random, and each one is then moved by less
 * than `interval` in a random direction.
 */
export function sparsePoints(
  range: { x: number; y: number; w: number; h: number },
  interval: number,
  count: number,
): Point[] {
  const lattice: Point[] = [];
  const spacing = interval * 2;
  const half = Math.trunc(spacing / 2);
  const xLimit = range.x + range.w - half;
  const yLimit = range.y + range.h - half;
  const rowHeight = (spacing * Math.SQRT2) / 2;

  for (let row = 0; range.y + spacing / 2 + row * rowHeight < yLimit; row++) {
    const y = Math.round(range.y + spacing / 2 + row * rowHeight);
    for (let x = range.x + half + (row % 2) * half; x < xLimit; x += spacing) {
      lattice.push({ x, y });
    }
  }
  if (lattice.length < count) throw new RangeError(`Only ${lattice.length} points fit, ${count} requested`);

  return shuffled(lattice)
    .slice(0, count)
    .map((p) => {
      const r = Math.random() * interval;
      const theta = Math.random() * Math.PI * 2;
      return { x: p.x + Math.trunc(r * Math.cos(theta)), y: p.y + Math.trunc(r * Math.sin(theta)) };
    });
}
