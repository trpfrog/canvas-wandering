import { describe, expect, it } from 'vite-plus/test';
import { sparsePoints } from './random';

describe('sparsePoints', () => {
  const range = { x: 100, y: 100, w: 2872, h: 2872 };

  it('returns points inside the range that are at least the interval apart', () => {
    for (let trial = 0; trial < 50; trial++) {
      const points = sparsePoints(range, 500, 10);
      expect(points).toHaveLength(10);
      for (const [i, p] of points.entries()) {
        expect(p.x).toBeGreaterThanOrEqual(range.x);
        expect(p.x).toBeLessThanOrEqual(range.x + range.w);
        expect(p.y).toBeGreaterThanOrEqual(range.y);
        expect(p.y).toBeLessThanOrEqual(range.y + range.h);
        for (const q of points.slice(i + 1)) {
          expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(500);
        }
      }
    }
  });

  it('throws when the range cannot hold that many points', () => {
    expect(() => sparsePoints({ x: 0, y: 0, w: 100, h: 100 }, 500, 2)).toThrow(RangeError);
  });
});
