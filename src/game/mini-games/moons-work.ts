import { img } from '../../engine/assets';
import * as audio from '../../engine/audio';
import { drawRotated, fillCircle, fillTextCentered } from '../../engine/draw';
import {
  advance,
  bounds,
  circle,
  circleContainsRect,
  distance,
  type Heading,
  intersects,
  onCircle,
  place,
  type Point,
  toDegrees,
  toRadians,
  type Rect,
  type Shape,
} from '../../engine/geometry';
import { input } from '../../engine/input';
import { randomInt } from '../../engine/random';
import { HEIGHT, WIDTH } from '../../engine/stage';
import { every } from '../../engine/timing';
import { MEDALS } from '../medals';
import { rocketHitBox } from '../rocket';
import type { MiniGame, MiniGameEntry, MiniGameSession } from './mini-game';
import { drawStarryBackground } from './starry-background';

const CENTER: Point = { x: WIDTH / 2, y: HEIGHT / 2 };
const ORBIT_RADIUS = 200;
const MOON_RADIUS = 15;
const EARTH_RADIUS = 70;
const METEORITE_RADIUS = 26;
/** Objects appear on this circle around the earth, just outside the screen. */
const SPAWN_RADIUS = Math.hypot(WIDTH, HEIGHT) / 2 + 50;
const MAX_LIVES = 3;
const GAME_OVER_DELAY_MS = 3000;

/** Same outline as the player's rocket, at 70 % size. */
const ROCKET_HIT_BOX = rocketHitBox(0.7);

const distanceFromEarth = (p: Point): number => distance(p, CENTER);

interface Rocket extends Heading {
  /** Rockets leaving the earth never land; returning ones heal once they land. */
  readonly leaving: boolean;
}

const EXPLOSION = { frames: 134, columns: 12, w: 192, h: 144 };

interface Explosion {
  rect: Rect;
  startedAt: number;
  fps: number;
  alpha: number;
}

function drawExplosion(ctx: CanvasRenderingContext2D, e: Explosion, now: number): void {
  const frame = Math.floor(((now - e.startedAt) * e.fps) / 1000);
  if (frame < 0 || frame >= EXPLOSION.frames) return;
  const sx = (frame % EXPLOSION.columns) * EXPLOSION.w;
  const sy = Math.floor(frame / EXPLOSION.columns) * EXPLOSION.h;
  ctx.globalAlpha = e.alpha;
  ctx.drawImage(img('moons-work/explosion'), sx, sy, EXPLOSION.w, EXPLOSION.h, e.rect.x, e.rect.y, e.rect.w, e.rect.h);
  ctx.globalAlpha = 1;
}

const isExplosionOver = (e: Explosion, now: number) => ((now - e.startedAt) * e.fps) / 1000 >= EXPLOSION.frames;

const earthHitBox = { kind: 'circle', cx: CENTER.x, cy: CENTER.y, r: EARTH_RADIUS } as const satisfies Shape;
const meteoriteHitBox = (m: Heading): Shape => place(circle(METEORITE_RADIUS), m.x, m.y);
const placedRocketHitBox = (r: Rocket): Shape => place(ROCKET_HIT_BOX, r.x, r.y, toRadians(r.angle));
const isTooFar = (m: Point): boolean => distanceFromEarth(m) > SPAWN_RADIUS + 10;
/** The moon stays on its orbit, on the side the pointer is. */
const moonPosition = (p: Point): Point => onCircle(CENTER, ORBIT_RADIUS, Math.atan2(p.y - CENTER.y, p.x - CENTER.x));

/** Something that appears at the edge and heads to the earth. */
function fromOutside(speed: number): Heading {
  const { x, y } = onCircle(CENTER, SPAWN_RADIUS, Math.random() * Math.PI * 2);
  return { x, y, angle: toDegrees(Math.atan2(CENTER.y - y, CENTER.x - x)), speed };
}

interface MoonsWorkState {
  /** Scene clock in ms. */
  now: number;
  moon: Point;
  meteorites: Heading[];
  rockets: Rocket[];
  explosions: Explosion[];
  score: number;
  lives: number;
  earthExplosion?: Explosion;
}

function spawn(state: MoonsWorkState): void {
  if (Math.random() < 0.09 * (1 + state.score / 50)) {
    state.meteorites.push(fromOutside(120 + randomInt(60) - 30));
  }
  if (Math.random() < 0.005) {
    state.rockets.push({ ...fromOutside(100 + randomInt(60) - 30), leaving: false });
  }
  if (Math.random() < 0.04) {
    state.rockets.push({ ...CENTER, angle: Math.random() * 360, speed: 120 + randomInt(60) - 30, leaving: true });
  }
}

function explode(state: MoonsWorkState, rect: Rect): void {
  const grow = 20;
  state.explosions.push({
    rect: { x: rect.x - grow, y: rect.y - grow, w: rect.w + grow * 2, h: rect.h + grow * 2 },
    startedAt: state.now,
    fps: 40,
    alpha: 0.5,
  });
  if (!state.earthExplosion) audio.playSe('explosion');
}

function destroyEarth(state: MoonsWorkState): void {
  if (state.earthExplosion) return;
  state.earthExplosion = { rect: { x: 0, y: 0, w: WIDTH, h: HEIGHT }, startedAt: state.now, fps: 20, alpha: 1 };
  audio.playSe('explosion', { repeat: 10 });
}

function updateMeteorites(state: MoonsWorkState, dt: number): void {
  const moon = place(circle(MOON_RADIUS), state.moon.x, state.moon.y);
  state.meteorites = state.meteorites.filter((m) => {
    const hitBox = meteoriteHitBox(m);
    const hitsMoon = intersects(moon, hitBox);
    const hitsEarth = intersects(earthHitBox, hitBox);
    if (hitsMoon) {
      state.score++;
      explode(state, bounds(hitBox));
    }
    if (hitsEarth) destroyEarth(state);
    if (hitsMoon || hitsEarth || isTooFar(m)) return false;
    advance(m, dt);
    return true;
  });
}

function updateRockets(state: MoonsWorkState, dt: number): void {
  const moon = place(circle(MOON_RADIUS), state.moon.x, state.moon.y);
  state.rockets = state.rockets.filter((r) => {
    const hitBox = placedRocketHitBox(r);
    const hitsMoon = intersects(moon, hitBox);
    const landed = !r.leaving && circleContainsRect(earthHitBox, bounds(hitBox));
    if (landed) state.lives++;
    if (hitsMoon) {
      state.lives--;
      if (state.lives === 0) destroyEarth(state);
      explode(state, bounds(hitBox));
    }
    if (landed || hitsMoon || isTooFar(r)) return false;
    advance(r, dt);
    return true;
  });
}

/** 0: safe … 3: a meteorite is inside the orbit. */
function dangerLevel({ lives, meteorites, moon }: MoonsWorkState): number {
  const lowLives = lives <= 1 ? 1 : 0;
  const approaching = meteorites.some(
    (m) =>
      distanceFromEarth(m) < ORBIT_RADIUS + 100 &&
      (distance(m, moon) > ORBIT_RADIUS * 2 || distanceFromEarth(m) < ORBIT_RADIUS),
  )
    ? 1
    : 0;
  const critical = meteorites.some((m) => distanceFromEarth(m) < ORBIT_RADIUS) ? 3 : 0;
  return Math.max(lowLives + approaching, critical);
}

/** The meteorite image has a long tail behind the rock. */
function drawMeteorite(ctx: CanvasRenderingContext2D, m: Heading): void {
  const r = METEORITE_RADIUS;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(toRadians(m.angle));
  ctx.drawImage(img('moons-work/meteorite'), -r - r * 2 * 1.8, -r, r * 2 * 2.8, r * 2);
  ctx.restore();
}

function drawLives(ctx: CanvasRenderingContext2D, lives: number): void {
  const size = 50;
  const margin = 10;
  for (let i = 0; i < Math.max(MAX_LIVES, lives); i++) {
    const image = img(i < lives ? 'moons-work/life' : 'moons-work/life-lost');
    ctx.drawImage(image, WIDTH - (i + 1) * (size + margin), margin, size, size);
  }
}

/** Draws the score on the earth, about half as wide as it; the font is measured only when the score changes. */
function createScoreLabel(): (ctx: CanvasRenderingContext2D, score: number) => void {
  let measured = { score: -1, size: EARTH_RADIUS };
  return (ctx, score) => {
    const text = String(score);
    if (measured.score !== score) {
      ctx.font = 'bold 100px sans-serif';
      measured = {
        score,
        size: Math.min(EARTH_RADIUS, Math.trunc((100 * EARTH_RADIUS) / ctx.measureText(text).width)),
      };
    }
    ctx.font = `bold ${measured.size}px sans-serif`;
    ctx.fillStyle = '#fff';
    fillTextCentered(ctx, text, CENTER.x, CENTER.y + measured.size / 2);
  };
}

/** Move the moon around its orbit to protect the earth from meteorites, without hitting rockets. */
function start({ end }: MiniGameSession): MiniGame {
  const state: MoonsWorkState = {
    now: 0,
    moon: moonPosition(input.pointer),
    meteorites: [],
    rockets: [],
    explosions: [],
    score: 0,
    lives: MAX_LIVES,
  };
  const spawnTick = every(100, () => spawn(state));
  const drawScore = createScoreLabel();

  return {
    pointerMove(p) {
      state.moon = moonPosition(p);
    },
    dispose() {
      audio.stopSe('explosion');
    },
    update(dt) {
      state.now += dt;
      spawnTick(dt);
      updateMeteorites(state, dt);
      updateRockets(state, dt);
      state.explosions = state.explosions.filter((e) => !isExplosionOver(e, state.now));
      if (state.earthExplosion && state.now >= state.earthExplosion.startedAt + GAME_OVER_DELAY_MS) end(state.score);
    },
    render(ctx) {
      drawStarryBackground(ctx);

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(CENTER.x, CENTER.y, ORBIT_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      for (const r of state.rockets) {
        drawRotated(ctx, img('moons-work/rocket'), r.x, r.y, 80, 50, toRadians(r.angle));
      }
      for (const m of state.meteorites) drawMeteorite(ctx, m);

      ctx.fillStyle = '#ff0';
      fillCircle(ctx, state.moon.x, state.moon.y, MOON_RADIUS);
      const earthSize = EARTH_RADIUS * 2;
      ctx.drawImage(img('moons-work/earth'), CENTER.x - EARTH_RADIUS, CENTER.y - EARTH_RADIUS, earthSize, earthSize);
      drawScore(ctx, state.score);
      drawLives(ctx, state.lives);
      drawAlert(ctx, dangerLevel(state), state.now);

      for (const e of state.explosions) drawExplosion(ctx, e, state.now);
      if (state.earthExplosion) drawExplosion(ctx, state.earthExplosion, state.now);
    },
  };
}

/** The red glow fades in from each edge towards the inner 60 % of the screen. */
const INSET_X = (WIDTH * 0.4) / 2;
const INSET_Y = (HEIGHT * 0.4) / 2;
const ALERT_EDGES: readonly { gradient: Line; rect: Rect }[] = [
  { gradient: { x0: 0, y0: 0, x1: 0, y1: INSET_Y }, rect: { x: 0, y: 0, w: WIDTH, h: INSET_Y } },
  { gradient: { x0: 0, y0: 0, x1: INSET_X, y1: 0 }, rect: { x: 0, y: 0, w: INSET_X, h: HEIGHT } },
  {
    gradient: { x0: 0, y0: HEIGHT, x1: 0, y1: HEIGHT - INSET_Y },
    rect: { x: 0, y: HEIGHT - INSET_Y, w: WIDTH, h: INSET_Y },
  },
  {
    gradient: { x0: WIDTH, y0: 0, x1: WIDTH - INSET_X, y1: 0 },
    rect: { x: WIDTH - INSET_X, y: 0, w: INSET_X, h: HEIGHT },
  },
];

interface Line {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Gradients belong to a context, so they are made once for the game canvas. */
let alertFills: { ctx: CanvasRenderingContext2D; edges: { fill: CanvasGradient; rect: Rect }[] } | undefined;

/** Red glow from the screen edges that pulses faster as the danger grows. */
function drawAlert(ctx: CanvasRenderingContext2D, level: number, now: number): void {
  if (level === 0) return;
  if (alertFills?.ctx !== ctx) {
    const edges = ALERT_EDGES.map(({ gradient: { x0, y0, x1, y1 }, rect }) => {
      const fill = ctx.createLinearGradient(x0, y0, x1, y1);
      fill.addColorStop(0, '#f00');
      fill.addColorStop(1, 'rgba(255,0,0,0)');
      return { fill, rect };
    });
    alertFills = { ctx, edges };
  }
  ctx.globalAlpha = ((Math.sin(4 * (now / 1000) * level) + 1) * 40) / 255;
  for (const { fill, rect } of alertFills.edges) {
    ctx.fillStyle = fill;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.globalAlpha = 1;
}

export const moonsWork: MiniGameEntry = {
  depth: 0,
  title: "Moon's Work",
  creator: 'Attacked by つまムーン',
  description: ['地球を隕石から守れ！'],
  howToPlay: [
    'マウスカーソルで月を誘導して隕石からの攻撃を防ぎましょう。',
    '科学の発展のためにロケットはできるだけ壊さないようにしましょう。',
    'ロケットは3回までしか壊すことができません。',
    '隕石が地球に落ちたらゲームオーバーです。',
  ],
  starImage: 'moons-work/star',
  result: { title: 'GAME OVER', background: 'rgba(118,34,0,0.71)', medal: { def: MEDALS.moonsWork, minScore: 50 } },
  start,
};
