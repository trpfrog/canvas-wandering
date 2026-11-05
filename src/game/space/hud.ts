import { FONT_TITLE, FONT_DIGITAL } from '../../engine/assets';
import { createOffscreen, rgba } from '../../engine/draw';
import { HEIGHT, WIDTH } from '../../engine/stage';
import { CHUNKS, MAP_SIZE, type Layer } from './space-map';

// ---------------------------------------------------------------- indicator bar

const FONT_SIZE = 30;
const MARGIN = 5;
const BAR_HEIGHT = FONT_SIZE + MARGIN * 4;
const VALUE_FONT = `bold ${Math.trunc(FONT_SIZE * 0.7)}px ${FONT_DIGITAL}`;

let barImage: HTMLCanvasElement | null = null;

function getBarImage(): HTMLCanvasElement {
  if (barImage) return barImage;
  const [canvas, ctx] = createOffscreen(WIDTH, BAR_HEIGHT);
  const gradient = ctx.createLinearGradient(0, 0, 0, BAR_HEIGHT);
  gradient.addColorStop(0, 'rgb(76,76,76)');
  gradient.addColorStop(0.95, 'rgb(26,26,26)');
  gradient.addColorStop(1, '#000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, BAR_HEIGHT);

  ctx.font = `${FONT_SIZE}px ${FONT_TITLE}`;
  ctx.fillStyle = rgba(0xcd, 0xcd, 0xcd, 0x75);
  ctx.textAlign = 'center';
  ctx.fillText('Space Wandering', WIDTH / 2, (BAR_HEIGHT + FONT_SIZE) / 2 - MARGIN);
  barImage = canvas;
  return canvas;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Draws one LCD-like value box with a title above it. */
function drawValueBox(ctx: CanvasRenderingContext2D, x: number, width: number, title: string, value: string): void {
  const y = MARGIN * 3;
  const h = FONT_SIZE;

  const base = ctx.createLinearGradient(0, 0, 0, BAR_HEIGHT);
  base.addColorStop(0, '#000');
  base.addColorStop(1, 'rgb(17,17,17)');
  ctx.fillStyle = base;
  roundRectPath(ctx, x, y, width, h, 5);
  ctx.fill();

  ctx.font = `${2 * MARGIN}px monospace`;
  ctx.fillStyle = 'gray';
  ctx.textAlign = 'center';
  ctx.fillText(title, x + width / 2, MARGIN * 2.5);

  ctx.font = VALUE_FONT;
  ctx.fillStyle = '#0f0';
  ctx.textAlign = 'right';
  ctx.fillText(value, x + width - MARGIN, y + h - 5);

  // Glare
  ctx.save();
  roundRectPath(ctx, x, y, width, h, 5);
  ctx.clip();
  const upperBottom = y + h - (FONT_SIZE / 5) * 3;
  const upper = ctx.createLinearGradient(0, y, 0, upperBottom);
  upper.addColorStop(0, 'rgba(255,255,255,0.27)');
  upper.addColorStop(1, 'rgba(255,255,255,0.07)');
  ctx.fillStyle = upper;
  roundRectPath(ctx, x, y - (FONT_SIZE / 5) * 3, width, h, 5);
  ctx.fill();
  const lowerTop = y + FONT_SIZE / 2;
  const lower = ctx.createLinearGradient(0, lowerTop, 0, lowerTop + h);
  lower.addColorStop(0, 'rgba(255,255,255,0)');
  lower.addColorStop(1, 'rgba(255,255,255,0.42)');
  ctx.fillStyle = lower;
  ctx.fillRect(x, lowerTop, width, h);
  ctx.restore();

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  roundRectPath(ctx, x, y, width, h, 5);
  ctx.stroke();
}

function textWidth(ctx: CanvasRenderingContext2D, text: string): number {
  ctx.font = VALUE_FONT;
  return ctx.measureText(text).width;
}

function drawNumber(ctx: CanvasRenderingContext2D, x: number, title: string, value: number, digits: number): void {
  const widest = String(10 ** (digits + 1) - 10);
  let str = String(Math.trunc(value));
  if (str.length > digits) str = str.slice(str.length - digits);
  drawValueBox(ctx, x, textWidth(ctx, widest) - MARGIN, title, str);
}

export function drawIndicator(
  ctx: CanvasRenderingContext2D,
  state: { x: number; y: number; depth: number; medals: number },
): void {
  ctx.drawImage(getBarImage(), 0, 0, WIDTH, BAR_HEIGHT);
  drawNumber(ctx, 20, 'X-AXIS', state.x, 5);
  drawNumber(ctx, 125, 'Y-AXIS', state.y, 5);
  drawNumber(ctx, 230, 'DEPTH', state.depth, 1);

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const clockWidth = textWidth(ctx, time) + MARGIN + 5;
  const clockX = WIDTH - clockWidth - 20;
  drawValueBox(ctx, clockX, clockWidth, 'CLOCK', time);

  const cleared = String(state.medals);
  const clearedWidth = textWidth(ctx, cleared) + MARGIN + 5;
  drawValueBox(ctx, clockX - 10 - clearedWidth, clearedWidth, 'CLEARED', cleared);
}

// ---------------------------------------------------------------- mini map

const MINI_CHUNK = 7;
const MINI_SIZE = CHUNKS * MINI_CHUNK;
const MINI_X = WIDTH - 10 - MINI_SIZE;
const MINI_Y = HEIGHT - 10 - MINI_SIZE;

export function drawMiniMap(ctx: CanvasRenderingContext2D, layer: Layer, rocket: { x: number; y: number }): void {
  const toMini = (v: number, offset: number) =>
    offset + Math.min(MINI_SIZE, Math.max(0, Math.trunc((v * MINI_SIZE) / MAP_SIZE)));

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#fff';
  ctx.fillRect(MINI_X - 1, MINI_Y - 1, MINI_SIZE + 2, MINI_SIZE + 2);
  ctx.fillStyle = 'rgb(0,5,28)';
  ctx.fillRect(MINI_X, MINI_Y, MINI_SIZE, MINI_SIZE);
  ctx.globalAlpha = 1;

  const dot = (x: number, y: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(toMini(x, MINI_X), toMini(y, MINI_Y), r, 0, Math.PI * 2);
    ctx.fill();
  };

  for (const star of layer.eventStars) dot(star.x, star.y, 3, '#ff0');

  // The rocket's dot shrinks as it gets farther away from the map.
  let r = 5;
  if (!layer.isWithin(rocket.x, rocket.y)) {
    const fromVertical = Math.min(Math.abs(rocket.x), Math.abs(rocket.x - MAP_SIZE));
    const fromHorizontal = Math.min(Math.abs(rocket.y), Math.abs(rocket.y - MAP_SIZE));
    r = Math.max(r - Math.trunc(Math.max(fromVertical, fromHorizontal) / 500), 2);
  }
  dot(rocket.x, rocket.y, r, '#f00');
}

// ---------------------------------------------------------------- speedometer

const SPEED_RADIUS = 150;
const SPEED_MARGIN = 10;
/** The speedometer is a quarter circle in the lower left corner. */
const SPEED_CX = SPEED_MARGIN;
const SPEED_CY = HEIGHT - SPEED_MARGIN;

let speedBackground: HTMLCanvasElement | null = null;

function getSpeedBackground(): HTMLCanvasElement {
  if (speedBackground) return speedBackground;
  const size = SPEED_RADIUS + SPEED_MARGIN;
  const [canvas, ctx] = createOffscreen(size, size);
  ctx.translate(0, size - HEIGHT);

  ctx.fillStyle = rgba(0x11, 0x10, 0x10, 0xcc);
  ctx.beginPath();
  ctx.arc(SPEED_CX, SPEED_CY, SPEED_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  const r = SPEED_RADIUS - SPEED_MARGIN;
  ctx.strokeStyle = '#00A2BF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(SPEED_CX, SPEED_CY, r, -Math.PI / 2, 0);
  ctx.stroke();
  for (let deg = 0; deg <= 90; deg += 10) {
    const rad = (deg * Math.PI) / 180;
    const x2 = SPEED_CX + r * Math.cos(rad);
    const y2 = SPEED_CY - r * Math.sin(rad);
    const x1 = (SPEED_CX + 10 * x2) / 11;
    const y1 = (SPEED_CY + 10 * y2) / 11;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  speedBackground = canvas;
  return canvas;
}

export function drawSpeedometer(ctx: CanvasRenderingContext2D, speed: number, maxSpeed: number): void {
  const size = SPEED_RADIUS + SPEED_MARGIN;
  ctx.drawImage(getSpeedBackground(), 0, HEIGHT - size, size, size);

  const deg = Math.trunc((speed / maxSpeed) * 90);
  const rad = (deg * Math.PI) / 180;
  const r = SPEED_RADIUS - SPEED_MARGIN;
  ctx.strokeStyle = '#f00';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(SPEED_CX, SPEED_CY);
  ctx.lineTo(SPEED_CX + r * Math.cos(rad), SPEED_CY - r * Math.sin(rad));
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(SPEED_CX, SPEED_CY, 20, 0, Math.PI * 2);
  ctx.fill();
}
