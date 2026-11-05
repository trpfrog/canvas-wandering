import { polygon, type Shape } from '../engine/geometry';

/** The rocket's outline, pointing to +x. */
export const ROCKET_OUTLINE = [
  [-30, 0],
  [-20, 20],
  [-15, 40],
  [0, 25],
  [30, 20],
  [60, 0],
  [30, -20],
  [0, -25],
  [-15, -40],
  [-20, -20],
] as const;

/** The rocket's hit box, scaled by `scale` and snapped to whole pixels. */
export const rocketHitBox = (scale = 1): Shape =>
  polygon(ROCKET_OUTLINE.map(([x, y]) => [Math.trunc(x * scale), Math.trunc(y * scale)] as const));
