import { describe, expect, it } from 'vite-plus/test';
import { angleDiffDegrees, bounds, circle, circleContainsRect, intersects, place, polygon, rect } from './geometry';

describe('intersects', () => {
  it('detects overlapping and separate circles', () => {
    expect(intersects(place(circle(10), 0, 0), place(circle(10), 15, 0))).toBe(true);
    expect(intersects(place(circle(10), 0, 0), place(circle(10), 25, 0))).toBe(false);
  });

  it('detects a circle touching a rotated rectangle', () => {
    const bar = place(rect(100, 10), 0, 0, Math.PI / 2); // now 10 wide, 100 tall
    expect(intersects(place(circle(5), 0, 45), bar)).toBe(true);
    expect(intersects(place(circle(5), 20, 0), bar)).toBe(false);
  });

  it('detects a circle fully inside a polygon', () => {
    expect(intersects(place(circle(1), 0, 0), rect(100, 100))).toBe(true);
  });

  it('handles concave polygons', () => {
    // A "U" shape: the notch at the top center is outside the polygon.
    const u = polygon([
      [0, 0],
      [30, 0],
      [30, 30],
      [20, 30],
      [20, 10],
      [10, 10],
      [10, 30],
      [0, 30],
    ]);
    expect(intersects(place(circle(2), 15, 25), u)).toBe(false);
    expect(intersects(place(circle(2), 5, 25), u)).toBe(true);
  });

  it('detects crossing polygons whose vertices are outside each other', () => {
    const horizontal = rect(100, 10);
    const vertical = rect(10, 100);
    expect(intersects(horizontal, vertical)).toBe(true);
    expect(intersects(horizontal, place(vertical, 200, 0))).toBe(false);
  });
});

describe('bounds and containment', () => {
  it('returns the bounding box of a rotated shape', () => {
    const b = bounds(place(rect(20, 10), 100, 100, Math.PI / 2));
    expect(b.x).toBeCloseTo(95);
    expect(b.y).toBeCloseTo(90);
    expect(b.w).toBeCloseTo(10);
    expect(b.h).toBeCloseTo(20);
  });

  it('checks whether a circle contains a rectangle', () => {
    const c = { kind: 'circle', cx: 0, cy: 0, r: 10 } as const;
    expect(circleContainsRect(c, { x: -5, y: -5, w: 10, h: 10 })).toBe(true);
    expect(circleContainsRect(c, { x: -9, y: -9, w: 18, h: 18 })).toBe(false);
  });
});

describe('angleDiffDegrees', () => {
  it('returns the shortest signed turn', () => {
    expect(angleDiffDegrees(350, 10)).toBe(20);
    expect(angleDiffDegrees(10, 350)).toBe(-20);
    expect(angleDiffDegrees(0, 180)).toBe(180);
  });
});
