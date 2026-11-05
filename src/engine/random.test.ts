import { describe, expect, it } from 'vite-plus/test';
import { shuffled, sparsePoints } from './random';

describe('sparsePoints', () => {
  const range = { x: 100, y: 100, w: 2872, h: 2872 };

  it('returns distinct points inside the range', () => {
    for (let trial = 0; trial < 50; trial++) {
      const points = sparsePoints(range, 500, 6);
      expect(points).toHaveLength(6);
      for (const p of points) {
        expect(p.x).toBeGreaterThanOrEqual(range.x);
        expect(p.x).toBeLessThanOrEqual(range.x + range.w);
        expect(p.y).toBeGreaterThanOrEqual(range.y);
        expect(p.y).toBeLessThanOrEqual(range.y + range.h);
      }
      for (const [i, p] of points.entries()) {
        for (const q of points.slice(i + 1)) {
          expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(0);
        }
      }
    }
  });

  it('throws when the range cannot hold that many points', () => {
    expect(() => sparsePoints({ x: 0, y: 0, w: 100, h: 100 }, 500, 2)).toThrow();
  });
});

describe('shuffled', () => {
  it('keeps the elements and does not touch the input', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffled(input);
    expect(result.toSorted((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});
