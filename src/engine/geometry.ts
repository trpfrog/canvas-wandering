import type { Point } from './stage';

/** A hit box in coordinates relative to its owner (before rotation and translation). */
export type Shape =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'polygon'; points: readonly Point[] };

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const circle = (r: number, cx = 0, cy = 0): Shape => ({ kind: 'circle', cx, cy, r });

/** A rectangle of size w×h whose center is offset by (dx, dy). */
export const rect = (w: number, h: number, dx = 0, dy = 0): Shape => ({
  kind: 'polygon',
  points: [
    { x: dx - w / 2, y: dy - h / 2 },
    { x: dx + w / 2, y: dy - h / 2 },
    { x: dx + w / 2, y: dy + h / 2 },
    { x: dx - w / 2, y: dy + h / 2 },
  ],
});

export const polygon = (points: readonly (readonly [x: number, y: number])[]): Shape => ({
  kind: 'polygon',
  points: points.map(([x, y]) => ({ x, y })),
});

/** Rotates the shape by `angle` radians around the origin and moves it to (x, y). */
export function place(shape: Shape, x: number, y: number, angle = 0): Shape {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tf = (p: Point): Point => ({ x: x + p.x * cos - p.y * sin, y: y + p.x * sin + p.y * cos });
  if (shape.kind === 'circle') {
    const c = tf({ x: shape.cx, y: shape.cy });
    return { kind: 'circle', cx: c.x, cy: c.y, r: shape.r };
  }
  return { kind: 'polygon', points: shape.points.map(tf) };
}

export function bounds(shape: Shape): Rect {
  if (shape.kind === 'circle') {
    return { x: shape.cx - shape.r, y: shape.cy - shape.r, w: shape.r * 2, h: shape.r * 2 };
  }
  const xs = shape.points.map((p) => p.x);
  const ys = shape.points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Ray casting: count how many edges a ray to the right crosses. */
function pointInPolygon(p: Point, poly: readonly Point[]): boolean {
  let inside = false;
  for (const [b, a] of edges(poly)) {
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToSegmentSq(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const ex = a.x + t * dx - p.x;
  const ey = a.y + t * dy - p.y;
  return ex * ex + ey * ey;
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 <= 0 && d3 * d4 <= 0 && !(d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0);
}

/** Each edge as [previous vertex, vertex]; the first edge closes the polygon. */
function edges(poly: readonly Point[]): [Point, Point][] {
  return poly.map((p, i) => [poly.at(i - 1) ?? p, p]);
}

/** Whether two placed shapes overlap. Polygons may be concave. */
export function intersects(a: Shape, b: Shape): boolean {
  if (a.kind === 'circle' && b.kind === 'circle') {
    const dx = a.cx - b.cx;
    const dy = a.cy - b.cy;
    const r = a.r + b.r;
    return dx * dx + dy * dy <= r * r;
  }
  if (a.kind === 'polygon' && b.kind === 'circle') return intersects(b, a);
  if (a.kind === 'circle' && b.kind === 'polygon') {
    const c = { x: a.cx, y: a.cy };
    if (pointInPolygon(c, b.points)) return true;
    return edges(b.points).some(([p, q]) => distanceToSegmentSq(c, p, q) <= a.r * a.r);
  }
  if (a.kind === 'polygon' && b.kind === 'polygon') {
    const [pa] = a.points;
    const [pb] = b.points;
    if ((pa && pointInPolygon(pa, b.points)) || (pb && pointInPolygon(pb, a.points))) return true;
    const eb = edges(b.points);
    return edges(a.points).some(([p, q]) => eb.some(([r, s]) => segmentsIntersect(p, q, r, s)));
  }
  return false;
}

/** Whether the circle fully contains the rectangle. */
export function circleContainsRect(c: Extract<Shape, { kind: 'circle' }>, r: Rect): boolean {
  const corners = [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x, r.y + r.h],
    [r.x + r.w, r.y + r.h],
  ] as const;
  return corners.every(([x, y]) => (x - c.cx) ** 2 + (y - c.cy) ** 2 <= c.r * c.r);
}

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export const toRadians = (deg: number): number => (deg * Math.PI) / 180;
export const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

/** Normalizes an angle in degrees to [0, 360). */
export const normalizeDegrees = (deg: number): number => ((deg % 360) + 360) % 360;

/** Signed smallest difference `to - from` in degrees, in (-180, 180]. */
export function angleDiffDegrees(from: number, to: number): number {
  const d = normalizeDegrees(to - from);
  return d > 180 ? d - 360 : d;
}
