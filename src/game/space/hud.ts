import { FONT_TITLE, FONT_DIGITAL } from '../../engine/assets';
import { createOffscreen, fillCircle, fillTextCentered } from '../../engine/draw';
import { clamp, toRadians } from '../../engine/geometry';
import { HEIGHT, WIDTH } from '../../engine/stage';
import { lazy } from '../../engine/timing';
import { CHUNKS, isOnMap, MAP_SIZE, type Layer } from './space-map';

const FONT_SIZE = 30;
const MARGIN = 5;
const BAR_HEIGHT = FONT_SIZE + MARGIN * 4;
const VALUE_FONT = `bold ${Math.trunc(FONT_SIZE * 0.7)}px ${FONT_DIGITAL}`;

const BOX_Y = MARGIN * 3;
const BOX_H = FONT_SIZE;

interface Box {
  title: string;
  x: number;
  width: number;
}

/** The value boxes, laid out once from the widest text each can show. */
function layoutBoxes(ctx: CanvasRenderingContext2D): Record<'x' | 'y' | 'depth' | 'clock' | 'cleared', Box> {
  ctx.font = VALUE_FONT;
  const width = (sample: string) => ctx.measureText(sample).width;
  const clockWidth = width('00:00') + MARGIN + 5;
  const clockX = WIDTH - clockWidth - 20;
  const clearedWidth = width('0') + MARGIN + 5;
  return {
    x: { title: 'X-AXIS', x: 20, width: width('999990') - MARGIN },
    y: { title: 'Y-AXIS', x: 125, width: width('999990') - MARGIN },
    depth: { title: 'DEPTH', x: 230, width: width('90') - MARGIN },
    clock: { title: 'CLOCK', x: clockX, width: clockWidth },
    cleared: { title: 'CLEARED', x: clockX - 10 - clearedWidth, width: clearedWidth },
  };
}

function boxPath(ctx: CanvasRenderingContext2D, box: Box, offsetY = 0): void {
  ctx.beginPath();
  ctx.roundRect(box.x, BOX_Y + offsetY, box.width, BOX_H, 5);
}

/** The bar, the title and the empty value boxes: everything under the values. */
function drawBack(ctx: CanvasRenderingContext2D, boxes: readonly Box[]): void {
  const bar = ctx.createLinearGradient(0, 0, 0, BAR_HEIGHT);
  bar.addColorStop(0, 'rgb(76,76,76)');
  bar.addColorStop(0.95, 'rgb(26,26,26)');
  bar.addColorStop(1, '#000');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, WIDTH, BAR_HEIGHT);

  ctx.font = `${FONT_SIZE}px ${FONT_TITLE}`;
  ctx.fillStyle = '#cdcdcd75';
  fillTextCentered(ctx, 'Space Wandering', WIDTH / 2, (BAR_HEIGHT + FONT_SIZE) / 2 - MARGIN);

  const base = ctx.createLinearGradient(0, 0, 0, BAR_HEIGHT);
  base.addColorStop(0, '#000');
  base.addColorStop(1, 'rgb(17,17,17)');
  ctx.font = `${2 * MARGIN}px monospace`;
  for (const box of boxes) {
    ctx.fillStyle = base;
    boxPath(ctx, box);
    ctx.fill();
    ctx.fillStyle = 'gray';
    fillTextCentered(ctx, box.title, box.x + box.width / 2, MARGIN * 2.5);
  }
}

/** The glass glare and outline drawn over the values. */
function drawFront(ctx: CanvasRenderingContext2D, boxes: readonly Box[]): void {
  const glareHeight = (FONT_SIZE / 5) * 3;
  const upper = ctx.createLinearGradient(0, BOX_Y, 0, BOX_Y + BOX_H - glareHeight);
  upper.addColorStop(0, 'rgba(255,255,255,0.27)');
  upper.addColorStop(1, 'rgba(255,255,255,0.07)');
  const lowerTop = BOX_Y + FONT_SIZE / 2;
  const lower = ctx.createLinearGradient(0, lowerTop, 0, lowerTop + BOX_H);
  lower.addColorStop(0, 'rgba(255,255,255,0)');
  lower.addColorStop(1, 'rgba(255,255,255,0.42)');

  for (const box of boxes) {
    ctx.save();
    boxPath(ctx, box);
    ctx.clip();
    ctx.fillStyle = upper;
    boxPath(ctx, box, -glareHeight);
    ctx.fill();
    ctx.fillStyle = lower;
    ctx.fillRect(box.x, lowerTop, box.width, BOX_H);
    ctx.restore();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    boxPath(ctx, box);
    ctx.stroke();
  }
}

/** Everything but the values is drawn once, on first use (fonts must be loaded by then). */
const indicator = lazy(() => {
  const [back, backCtx] = createOffscreen(WIDTH, BAR_HEIGHT);
  const [front, frontCtx] = createOffscreen(WIDTH, BAR_HEIGHT);
  const boxes = layoutBoxes(backCtx);
  drawBack(backCtx, Object.values(boxes));
  drawFront(frontCtx, Object.values(boxes));
  return { back, front, boxes };
});

const clockFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** Keeps only the last `digits` digits, like a mechanical counter. */
const lastDigits = (value: number, digits: number): string => String(Math.trunc(value)).slice(-digits);

/** The LCD-like bar at the top of the screen. */
export function drawIndicator(
  ctx: CanvasRenderingContext2D,
  state: { x: number; y: number; depth: number; medals: number },
): void {
  const { back, front, boxes } = indicator();
  ctx.drawImage(back, 0, 0, WIDTH, BAR_HEIGHT);

  const values: [Box, string][] = [
    [boxes.x, lastDigits(state.x, 5)],
    [boxes.y, lastDigits(state.y, 5)],
    [boxes.depth, lastDigits(state.depth, 1)],
    [boxes.clock, clockFormat.format(new Date())],
    [boxes.cleared, String(state.medals)],
  ];
  ctx.font = VALUE_FONT;
  ctx.fillStyle = '#0f0';
  ctx.textAlign = 'right';
  for (const [box, value] of values) ctx.fillText(value, box.x + box.width - MARGIN, BOX_Y + BOX_H - 5);
  ctx.textAlign = 'left';

  ctx.drawImage(front, 0, 0, WIDTH, BAR_HEIGHT);
}

const MINI_CHUNK = 7;
const MINI_SIZE = CHUNKS * MINI_CHUNK;
const MINI_X = WIDTH - 10 - MINI_SIZE;
const MINI_Y = HEIGHT - 10 - MINI_SIZE;

export function drawMiniMap(ctx: CanvasRenderingContext2D, layer: Layer, rocket: { x: number; y: number }): void {
  const toMini = (v: number, offset: number) => offset + clamp(Math.trunc((v * MINI_SIZE) / MAP_SIZE), 0, MINI_SIZE);

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#fff';
  ctx.fillRect(MINI_X - 1, MINI_Y - 1, MINI_SIZE + 2, MINI_SIZE + 2);
  ctx.fillStyle = 'rgb(0,5,28)';
  ctx.fillRect(MINI_X, MINI_Y, MINI_SIZE, MINI_SIZE);
  ctx.globalAlpha = 1;

  const dot = (x: number, y: number, r: number, color: string) => {
    ctx.fillStyle = color;
    fillCircle(ctx, toMini(x, MINI_X), toMini(y, MINI_Y), r);
  };

  for (const star of layer.eventStars) dot(star.x, star.y, 3, '#ff0');

  // The rocket's dot shrinks as it gets farther away from the map.
  let r = 5;
  if (!isOnMap(rocket)) {
    const fromVertical = Math.min(Math.abs(rocket.x), Math.abs(rocket.x - MAP_SIZE));
    const fromHorizontal = Math.min(Math.abs(rocket.y), Math.abs(rocket.y - MAP_SIZE));
    r = Math.max(r - Math.trunc(Math.max(fromVertical, fromHorizontal) / 500), 2);
  }
  dot(rocket.x, rocket.y, r, '#f00');
}

const SPEED_RADIUS = 150;
const SPEED_MARGIN = 10;
/** The speedometer is a quarter circle in the lower left corner. */
const SPEED_CX = SPEED_MARGIN;
const SPEED_CY = HEIGHT - SPEED_MARGIN;

const speedBackground = lazy(() => {
  const size = SPEED_RADIUS + SPEED_MARGIN;
  const [canvas, ctx] = createOffscreen(size, size);
  ctx.translate(0, size - HEIGHT);

  ctx.fillStyle = '#111010cc';
  fillCircle(ctx, SPEED_CX, SPEED_CY, SPEED_RADIUS);

  const r = SPEED_RADIUS - SPEED_MARGIN;
  ctx.strokeStyle = '#00A2BF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(SPEED_CX, SPEED_CY, r, -Math.PI / 2, 0);
  ctx.stroke();
  for (let deg = 0; deg <= 90; deg += 10) {
    const rad = toRadians(deg);
    const x2 = SPEED_CX + r * Math.cos(rad);
    const y2 = SPEED_CY - r * Math.sin(rad);
    const x1 = (SPEED_CX + 10 * x2) / 11;
    const y1 = (SPEED_CY + 10 * y2) / 11;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  return canvas;
});

export function drawSpeedometer(ctx: CanvasRenderingContext2D, speed: number, maxSpeed: number): void {
  const size = SPEED_RADIUS + SPEED_MARGIN;
  ctx.drawImage(speedBackground(), 0, HEIGHT - size, size, size);

  const rad = toRadians(Math.trunc((speed / maxSpeed) * 90));
  const r = SPEED_RADIUS - SPEED_MARGIN;
  ctx.strokeStyle = '#f00';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(SPEED_CX, SPEED_CY);
  ctx.lineTo(SPEED_CX + r * Math.cos(rad), SPEED_CY - r * Math.sin(rad));
  ctx.stroke();

  ctx.fillStyle = '#000';
  fillCircle(ctx, SPEED_CX, SPEED_CY, 20);
}
