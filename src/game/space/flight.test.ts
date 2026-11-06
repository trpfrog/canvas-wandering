import { describe, expect, it } from 'vite-plus/test';
import { fly, OUTER_LIMIT } from './flight';
import { MAP_SIZE } from './space-map';

const flyer = (x: number, angle: number) => ({ x, y: MAP_SIZE / 2, angle, speed: 500, drift: { x: 0, y: 0 } });

describe('fly', () => {
  it('moves at full speed on the map', () => {
    const f = flyer(MAP_SIZE / 2, 0);
    fly(f, 1000);
    expect(f.x).toBeCloseTo(MAP_SIZE / 2 + 500);
    expect(f.drift.x).toBe(0);
  });

  it('never gets farther than the outer limit, while the background keeps scrolling', () => {
    const f = flyer(0, 180);
    for (let i = 0; i < 100_000; i++) fly(f, 10);
    expect(f.x).toBeGreaterThan(-OUTER_LIMIT);
    expect(f.x).toBeLessThan(-OUTER_LIMIT * 0.9);
    expect(f.x + f.drift.x).toBeCloseTo(-500 * 1000, -2);
  });

  it('comes back at full speed', () => {
    const f = flyer(-OUTER_LIMIT / 2, 0);
    fly(f, 1000);
    expect(f.x).toBeCloseTo(-OUTER_LIMIT / 2 + 500);
  });
});
