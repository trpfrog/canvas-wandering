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

/**
 * Covers the rectangle (0, 0)–(width, height) with copies of `image` drawn at `size`×`size`,
 * starting at (x0, y0), which should be at or left/above the origin.
 */
export function drawTiled(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  size: number,
  area: { width: number; height: number },
  x0 = 0,
  y0 = 0,
): void {
  for (let x = x0; x <= area.width; x += size) {
    for (let y = y0; y <= area.height; y += size) ctx.drawImage(image, x, y, size, size);
  }
}

/** Draws text horizontally centered on x. */
export function fillTextCentered(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  const { textAlign } = ctx;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.textAlign = textAlign;
}

export const pad2 = (n: number): string => String(n).padStart(2, '0');
