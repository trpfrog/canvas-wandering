import { img } from '../../engine/assets';
import { drawTiled } from '../../engine/draw';
import { HEIGHT, WIDTH } from '../../engine/stage';

/** The night sky behind Moon's Work and Shooting Star. */
export function drawStarryBackground(ctx: CanvasRenderingContext2D): void {
  drawTiled(ctx, img('moons-work/background'), 500, { width: WIDTH, height: HEIGHT });
}
