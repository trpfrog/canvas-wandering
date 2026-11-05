/** Draws an image of size w×h centered at (cx, cy), rotated by `angle` radians. */
export function drawRotated(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  cx: number,
  cy: number,
  w: number,
  h: number,
  angle: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export function fillCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Starts a circular arc path. Angles are in degrees, measured counter-clockwise
 * from 3 o'clock as in math (the y axis pointing up); a positive sweep turns counter-clockwise.
 */
export function arcDegrees(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  sweepDeg: number,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, (-startDeg * Math.PI) / 180, (-(startDeg + sweepDeg) * Math.PI) / 180, sweepDeg > 0);
}

export function createOffscreen(w: number, h: number, scale = 2): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not supported');
  ctx.scale(scale, scale);
  return [canvas, ctx];
}

export const rgba = (r: number, g: number, b: number, a255: number): string => `rgba(${r},${g},${b},${a255 / 255})`;
