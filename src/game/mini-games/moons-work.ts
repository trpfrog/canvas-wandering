import { img } from '../../engine/assets';
import { audio, type SoundHandle } from '../../engine/audio';
import { drawRotated, fillCircle } from '../../engine/draw';
import {
  bounds,
  circle,
  circleContainsRect,
  intersects,
  place,
  polygon,
  toDegrees,
  toRadians,
  type Rect,
  type Shape,
} from '../../engine/geometry';
import { input } from '../../engine/input';
import { randomInt } from '../../engine/random';
import { HEIGHT, WIDTH, type Point } from '../../engine/stage';
import { scenes } from '../context';
import { ROCKET_OUTLINE } from '../rocket-outline';
import { MEDALS } from '../medals';
import { createGameOverDialog, pushMedalWindow } from '../ui/dialogs';
import type { MiniGame, MiniGameEntry } from './mini-game';

const CENTER: Point = { x: WIDTH / 2, y: HEIGHT / 2 };
const ORBIT_RADIUS = 200;
const MOON_RADIUS = 15;
const EARTH_RADIUS = 70;
const METEORITE_RADIUS = 26;
/** Objects appear on this circle around the earth, just outside the screen. */
const SPAWN_RADIUS = Math.hypot(WIDTH, HEIGHT) / 2 + 50;
const MAX_LIVES = 3;
const MEDAL_SCORE = 50;
const GAME_OVER_DELAY_MS = 3000;

/** Same outline as the player's rocket, at 70 % size. */
const ROCKET_HIT_BOX = polygon(
  ROCKET_OUTLINE.map(([x, y]) => [Math.trunc((x * 7) / 10), Math.trunc((y * 7) / 10)] as const),
);

const distanceFromEarth = (p: Point): number => Math.hypot(p.x - CENTER.x, p.y - CENTER.y);

interface Mover {
  x: number;
  y: number;
  /** Heading in degrees. */
  angle: number;
  /** px per second */
  speed: number;
}

interface Rocket extends Mover {
  /** Rockets leaving the earth never land; returning ones heal once they land. */
  readonly leaving: boolean;
}

// ---------------------------------------------------------------- explosion sprite

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

/** The starry background shared with Shooting Star. */
export function drawTiledBackground(ctx: CanvasRenderingContext2D): void {
  const size = 500;
  for (let x = 0; x <= WIDTH; x += size) {
    for (let y = 0; y <= HEIGHT; y += size) ctx.drawImage(img('moons-work/background'), x, y, size, size);
  }
}

// ---------------------------------------------------------------- game

/** Move the moon around its orbit to protect the earth from meteorites, without hitting rockets. */
class MoonsWork implements MiniGame {
  private now = 0;
  private spawnTimer = 0;
  private moon: Point = { ...CENTER };
  private meteorites: Mover[] = [];
  private rockets: Rocket[] = [];
  private explosions: Explosion[] = [];
  private score = 0;
  private lives = MAX_LIVES;
  private earthExplosion: Explosion | null = null;
  private gameOverAt: number | null = null;
  private ended = false;
  private explosionSound: SoundHandle | null = null;

  constructor() {
    this.moveMoon(input.pointer);
  }

  pointerMove(p: Point): void {
    this.moveMoon(p);
  }

  /** The moon stays on its orbit, on the side the pointer is. */
  private moveMoon(p: Point): void {
    const angle = Math.atan2(p.y - CENTER.y, p.x - CENTER.x);
    this.moon = {
      x: CENTER.x + Math.trunc(ORBIT_RADIUS * Math.cos(angle)),
      y: CENTER.y + Math.trunc(ORBIT_RADIUS * Math.sin(angle)),
    };
  }

  dispose(): void {
    this.explosionSound?.stop();
  }

  // ------------------------------------------------------------ hit boxes

  private moonHitBox = (): Shape => place(circle(MOON_RADIUS), this.moon.x, this.moon.y);
  private earthHitBox = () => ({ kind: 'circle', cx: CENTER.x, cy: CENTER.y, r: EARTH_RADIUS }) as const;
  private meteoriteHitBox = (m: Mover): Shape => place(circle(METEORITE_RADIUS), m.x, m.y);
  private rocketHitBox = (r: Rocket): Shape => place(ROCKET_HIT_BOX, r.x, r.y, toRadians(r.angle));
  private isTooFar = (m: Mover) => Math.hypot(m.x - CENTER.x, m.y - CENTER.y) > SPAWN_RADIUS + 10;

  // ------------------------------------------------------------ simulation

  update(dt: number): void {
    this.now += dt;

    this.spawnTimer += dt;
    while (this.spawnTimer >= 100) {
      this.spawnTimer -= 100;
      this.spawn();
    }

    this.updateMeteorites(dt);
    this.updateRockets(dt);
    this.explosions = this.explosions.filter((e) => !isExplosionOver(e, this.now));

    if (this.gameOverAt !== null && this.now >= this.gameOverAt && !this.ended) this.endGame();
  }

  private spawn(): void {
    if (Math.random() < 0.09 * (1 + this.score / 50)) {
      this.meteorites.push(this.fromOutside({ speed: 120 + randomInt(60) - 30 }));
    }
    if (Math.random() < 0.005) {
      this.rockets.push({ ...this.fromOutside({ speed: 100 + randomInt(60) - 30 }), leaving: false });
    }
    if (Math.random() < 0.04) {
      this.rockets.push({ ...CENTER, angle: Math.random() * 360, speed: 120 + randomInt(60) - 30, leaving: true });
    }
  }

  /** Something that appears at the edge and heads to the earth. */
  private fromOutside({ speed }: { speed: number }): Mover {
    const theta = Math.random() * Math.PI * 2;
    const x = Math.trunc(SPAWN_RADIUS * Math.cos(theta) + CENTER.x);
    const y = Math.trunc(SPAWN_RADIUS * Math.sin(theta) + CENTER.y);
    return { x, y, angle: toDegrees(Math.atan2(CENTER.y - y, CENTER.x - x)), speed };
  }

  private updateMeteorites(dt: number): void {
    const moon = this.moonHitBox();
    const earth = this.earthHitBox();
    this.meteorites = this.meteorites.filter((m) => {
      const hitBox = this.meteoriteHitBox(m);
      const hitsMoon = intersects(moon, hitBox);
      const hitsEarth = intersects(earth, hitBox);
      if (hitsMoon) {
        this.score++;
        this.explode(bounds(hitBox));
      }
      if (hitsEarth) this.destroyEarth();
      if (hitsMoon || hitsEarth || this.isTooFar(m)) return false;
      move(m, dt);
      return true;
    });
  }

  private updateRockets(dt: number): void {
    const moon = this.moonHitBox();
    const earth = this.earthHitBox();
    this.rockets = this.rockets.filter((r) => {
      const hitBox = this.rocketHitBox(r);
      const hitsMoon = intersects(moon, hitBox);
      const landed = !r.leaving && circleContainsRect(earth, bounds(hitBox));
      if (landed) this.lives++;
      if (hitsMoon) {
        this.loseLife();
        this.explode(bounds(hitBox));
      }
      if (landed || hitsMoon || this.isTooFar(r)) return false;
      move(r, dt);
      return true;
    });
  }

  private loseLife(): void {
    this.lives--;
    if (this.lives === 0) this.destroyEarth();
  }

  private explode(rect: Rect): void {
    const grow = 20;
    this.explosions.push({
      rect: { x: rect.x - grow, y: rect.y - grow, w: rect.w + grow * 2, h: rect.h + grow * 2 },
      startedAt: this.now,
      fps: 40,
      alpha: 0.5,
    });
    if (!this.earthExplosion) audio.playSe('explosion', { exclusive: true });
  }

  private destroyEarth(): void {
    if (this.earthExplosion) return;
    this.earthExplosion = { rect: { x: 0, y: 0, w: WIDTH, h: HEIGHT }, startedAt: this.now, fps: 20, alpha: 1 };
    this.gameOverAt = this.now + GAME_OVER_DELAY_MS;
    this.explosionSound = audio.playSe('explosion', { exclusive: true, loop: 10 });
  }

  private endGame(): void {
    this.ended = true;
    scenes().push(createGameOverDialog('GAME OVER', this.score, 'rgba(118,34,0,0.71)'));
    if (this.score >= MEDAL_SCORE) pushMedalWindow(MEDALS.moonsWork);
  }

  /** 0: safe … 3: a meteorite is inside the orbit. */
  private dangerLevel(): number {
    const lowLives = this.lives <= 1 ? 1 : 0;
    const approaching = this.meteorites.some(
      (m) =>
        distanceFromEarth(m) < ORBIT_RADIUS + 100 &&
        (Math.hypot(m.x - this.moon.x, m.y - this.moon.y) > ORBIT_RADIUS * 2 || distanceFromEarth(m) < ORBIT_RADIUS),
    )
      ? 1
      : 0;
    const critical = this.meteorites.some((m) => distanceFromEarth(m) < ORBIT_RADIUS) ? 3 : 0;
    return Math.max(lowLives + approaching, critical);
  }

  // ------------------------------------------------------------ rendering

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgb(0,34,82)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawTiledBackground(ctx);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(CENTER.x, CENTER.y, ORBIT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    for (const r of this.rockets) {
      drawRotated(ctx, img('moons-work/rocket'), Math.trunc(r.x), Math.trunc(r.y), 80, 50, toRadians(r.angle));
    }
    for (const m of this.meteorites) this.drawMeteorite(ctx, m);

    ctx.fillStyle = '#ff0';
    fillCircle(ctx, this.moon.x, this.moon.y, MOON_RADIUS);
    ctx.drawImage(
      img('moons-work/earth'),
      CENTER.x - EARTH_RADIUS,
      CENTER.y - EARTH_RADIUS,
      EARTH_RADIUS * 2,
      EARTH_RADIUS * 2,
    );
    this.drawScore(ctx);
    this.drawLives(ctx);
    drawAlert(ctx, this.dangerLevel(), this.now);

    for (const e of this.explosions) drawExplosion(ctx, e, this.now);
    if (this.earthExplosion) drawExplosion(ctx, this.earthExplosion, this.now);
  }

  /** The meteorite image has a long tail behind the rock. */
  private drawMeteorite(ctx: CanvasRenderingContext2D, m: Mover): void {
    const r = METEORITE_RADIUS;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(toRadians(m.angle));
    ctx.drawImage(img('moons-work/meteorite'), -r - r * 2 * 1.8, -r, r * 2 * 2.8, r * 2);
    ctx.restore();
  }

  /** The score is drawn on the earth, about half as wide as it. */
  private drawScore(ctx: CanvasRenderingContext2D): void {
    const text = String(this.score);
    ctx.font = 'bold 100px sans-serif';
    const widthAt100 = ctx.measureText(text).width;
    const size = Math.min(EARTH_RADIUS, Math.trunc((100 * EARTH_RADIUS) / widthAt100));
    ctx.font = `bold ${size}px sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(text, CENTER.x, CENTER.y + size / 2);
    ctx.textAlign = 'left';
  }

  private drawLives(ctx: CanvasRenderingContext2D): void {
    const size = 50;
    const margin = 10;
    for (let i = 0; i < Math.max(MAX_LIVES, this.lives); i++) {
      const image = img(i < this.lives ? 'moons-work/life' : 'moons-work/life-lost');
      ctx.drawImage(image, WIDTH - (i + 1) * (size + margin), margin, size, size);
    }
  }
}

function move(m: Mover, dt: number): void {
  m.x += Math.cos(toRadians(m.angle)) * m.speed * (dt / 1000);
  m.y += Math.sin(toRadians(m.angle)) * m.speed * (dt / 1000);
}

/** Red glow from the screen edges that pulses faster as the danger grows. */
function drawAlert(ctx: CanvasRenderingContext2D, level: number, now: number): void {
  if (level === 0) return;
  const alpha = ((Math.sin(4 * (now / 1000) * level) + 1) * 40) / 255;
  const inner = { x: (WIDTH * 0.4) / 2, y: (HEIGHT * 0.4) / 2 };
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, `rgba(255,0,0,${alpha})`);
    g.addColorStop(1, 'rgba(255,0,0,0)');
    return g;
  };
  ctx.fillStyle = edge(0, 0, 0, inner.y);
  ctx.fillRect(0, 0, WIDTH, inner.y);
  ctx.fillStyle = edge(0, 0, inner.x, 0);
  ctx.fillRect(0, 0, inner.x, HEIGHT);
  ctx.fillStyle = edge(0, HEIGHT, 0, HEIGHT - inner.y);
  ctx.fillRect(0, HEIGHT - inner.y, WIDTH, inner.y);
  ctx.fillStyle = edge(WIDTH, 0, WIDTH - inner.x, 0);
  ctx.fillRect(WIDTH - inner.x, 0, inner.x, HEIGHT);
}

export const moonsWork: MiniGameEntry = {
  id: 'moons-work',
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
  create: () => new MoonsWork(),
};
