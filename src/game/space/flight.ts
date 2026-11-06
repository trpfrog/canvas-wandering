import { advance, type Heading, type Point } from '../../engine/geometry';
import { MAP_SIZE } from './space-map';

export interface Flyer extends Heading {
  /**
   * How far the background has scrolled beyond the real position. Outside the map
   * the rocket really slows down, but the background keeps scrolling at full speed.
   */
  drift: Point;
}

/** How far past the map edge the rocket can get: it slows down on the way out and stops there. */
export const OUTER_LIMIT = MAP_SIZE / 2;

/** The part of a move along one axis that is allowed; moving outwards gets slower away from the map. */
function dampOutward(position: number, delta: number): number {
  const outside = position < 0 ? -position : position - MAP_SIZE;
  const outward = (position < 0 && delta < 0) || (position > MAP_SIZE && delta > 0);
  return outward ? delta * Math.max(0, 1 - outside / OUTER_LIMIT) : delta;
}

/** Moves the rocket for `dt` ms, keeping it within {@link OUTER_LIMIT} of the map. */
export function fly(rocket: Flyer, dt: number): void {
  const target = { ...rocket };
  advance(target, dt);
  const dx = target.x - rocket.x;
  const dy = target.y - rocket.y;
  const allowedX = dampOutward(rocket.x, dx);
  const allowedY = dampOutward(rocket.y, dy);
  rocket.x += allowedX;
  rocket.y += allowedY;
  rocket.drift.x += dx - allowedX;
  rocket.drift.y += dy - allowedY;
}
