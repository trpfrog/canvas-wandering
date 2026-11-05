import { img, type ImageKey } from '../../engine/assets';
import { audio } from '../../engine/audio';
import { drawRotated, drawTiled } from '../../engine/draw';
import {
  advance,
  angleDiffDegrees,
  clamp,
  distance,
  intersects,
  mod,
  normalizeDegrees,
  place,
  polygon,
  toDegrees,
  toRadians,
  type Shape,
} from '../../engine/geometry';
import { input } from '../../engine/input';
import { randomInt } from '../../engine/random';
import type { Scene } from '../../engine/scene';
import { HEIGHT, WIDTH } from '../../engine/stage';
import { SceneTag } from '../context';
import { MEDALS, player } from '../medals';
import { ROCKET_OUTLINE } from '../rocket-outline';
import { MINI_GAMES } from '../mini-games/registry';
import { startMiniGame, type MiniGameEntry } from '../mini-games/mini-game';
import { createPauseDialog, pushMedalWindow } from '../ui/dialogs';
import { drawIndicator, drawMiniMap, drawSpeedometer } from './hud';
import { eventStarHitBox, MAP_DEPTH, MAP_SIZE, MINI_GAME_STAR_RADIUS, SpaceMap, type EventStar } from './space-map';

const MAX_SPEED = 500;
/** Speed change per controller step (every 20 ms). 5 s to reach the top speed. */
const ACCELERATION = 2;
/** Turn per controller step. One full turn in 2 s. */
const TURN_DEGREES = 3.6;
const INVINCIBLE_MS = 5000;

const ROCKET_HIT_BOX = polygon(ROCKET_OUTLINE);
const SCREEN_CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };

interface Twinkle {
  x: number;
  y: number;
  bornAt: number;
}
const TWINKLE_MS = 400;

/** The open world: fly the rocket around and visit the mini game stars. */
export class SpaceScene implements Scene {
  readonly tag = SceneTag.space;
  readonly opaque = true;
  readonly bgm = 'space';

  private readonly map = new SpaceMap(MINI_GAMES);
  private readonly rocket = {
    x: MAP_SIZE / 2,
    y: MAP_SIZE / 2,
    angle: 0,
    speed: 0,
    depth: 0,
  };
  /** Scene clock in ms; it only advances while the scene is active. */
  private now = 0;
  private ticks = 0;
  private invincibleUntil = 0;

  private readonly pendingDepthKeys = new Set<string>();
  private wheelDelta: number | null = null;
  private twinkles: Twinkle[] = [];
  private fadingBackgrounds: { image: ImageKey; alpha: number }[] = [];
  /** The mini game stars move to new places after each mini game. */
  private visitedMiniGame = false;

  private get layer() {
    return this.map.layer(this.rocket.depth);
  }

  // ------------------------------------------------------------------ lifecycle

  resume(): void {
    if (this.visitedMiniGame) {
      this.visitedMiniGame = false;
      this.map.redistributeMiniGameStars();
    }
    this.invincibleUntil = this.now + INVINCIBLE_MS;
    this.rocket.speed = 0;
    audio.playSe('rocket', { loop: true });
  }

  suspend(): void {
    audio.stopSe('rocket');
    this.pendingDepthKeys.clear();
    this.wheelDelta = null;
  }

  pauseMenu(): Scene {
    return createPauseDialog();
  }

  keyDown(e: KeyboardEvent): void {
    if (e.code === 'KeyZ' || e.code === 'KeyX') this.pendingDepthKeys.add(e.code);
  }

  wheel(deltaY: number): void {
    // Scrolling down goes one layer deeper, as in the original.
    if (deltaY !== 0) this.wheelDelta = deltaY > 0 ? 1 : -1;
  }

  // ------------------------------------------------------------------ simulation

  update(dt: number): void {
    this.now += dt;
    this.ticks++;
    const r = this.rocket;

    if (this.ticks % 2 === 0) this.controllerStep();

    advance(r, dt);

    if (this.ticks % 10 === 0 && !this.isInvincible()) this.checkTouchingStars();

    if (input.pointerDown && Math.random() - 0.05 <= r.speed / MAX_SPEED) this.addTwinkle();
    if (this.twinkles.length > 0) this.twinkles = this.twinkles.filter((t) => this.now - t.bornAt <= TWINKLE_MS);

    if (this.fadingBackgrounds.length > 0) {
      for (const bg of this.fadingBackgrounds) bg.alpha -= 1 / 64;
      this.fadingBackgrounds = this.fadingBackgrounds.filter((bg) => bg.alpha >= 0);
    }
  }

  private controllerStep(): void {
    const r = this.rocket;
    const keys = input.keys;
    const mouse = input.pointerDown ? input.pointer : null;

    // W: accelerate, S: decelerate, mouse: faster the farther from the center
    const w = keys.has('KeyW');
    const s = keys.has('KeyS');
    if (w || s) {
      this.accelerate(ACCELERATION * (Number(w) - Number(s)));
    } else if (mouse) {
      this.accelerate(ACCELERATION * (distance(mouse, SCREEN_CENTER) / (HEIGHT / 2) - 0.5) * 2);
    }

    // A: turn left, D: turn right, mouse: turn towards the pointer
    const a = keys.has('KeyA');
    const d = keys.has('KeyD');
    if (a || d) {
      r.angle = normalizeDegrees(r.angle + TURN_DEGREES * (Number(d) - Number(a)));
    } else if (mouse) {
      const target = toDegrees(Math.atan2(mouse.y - HEIGHT / 2, mouse.x - WIDTH / 2));
      const diff = angleDiffDegrees(r.angle, target);
      let step = TURN_DEGREES;
      if (Math.abs(diff) < 14.4) step = 1;
      if (Math.abs(diff) < 1) step = 0;
      r.angle = normalizeDegrees(r.angle + Math.sign(diff) * step);
    }

    // Z: up a layer, X: down a layer, wheel: either
    let depthDelta = 0;
    if (this.pendingDepthKeys.size > 0) {
      if (this.pendingDepthKeys.has('KeyZ')) depthDelta += 1;
      if (this.pendingDepthKeys.has('KeyX')) depthDelta -= 1;
      this.pendingDepthKeys.clear();
    } else if (this.wheelDelta !== null) {
      depthDelta = this.wheelDelta;
      this.wheelDelta = null;
    }
    if (depthDelta !== 0) this.changeDepth(depthDelta);
  }

  private accelerate(a: number): void {
    this.rocket.speed = clamp(this.rocket.speed + a, 0, MAX_SPEED);
  }

  private changeDepth(delta: number): void {
    const previous = this.layer.background;
    this.rocket.depth = mod(this.rocket.depth + delta, MAP_DEPTH);
    if (this.layer.background !== previous) this.fadingBackgrounds.push({ image: previous, alpha: 1 });
  }

  private isInvincible(): boolean {
    return this.now < this.invincibleUntil;
  }

  private rocketHitBox(): Shape {
    return place(ROCKET_HIT_BOX, this.rocket.x, this.rocket.y, toRadians(this.rocket.angle));
  }

  private checkTouchingStars(): void {
    const r = this.rocket;
    const hitBox = this.rocketHitBox();
    const range = 1000;
    const touching = this.layer.eventStars.filter(
      (star) =>
        Math.abs(star.x - r.x) <= range && Math.abs(star.y - r.y) <= range && intersects(hitBox, eventStarHitBox(star)),
    );

    const miniGameStar = touching
      .filter((star) => star.kind === 'mini-game')
      .toSorted((p, q) => distance(p, r) - distance(q, r))
      .at(0);
    if (miniGameStar) {
      this.enter(miniGameStar.entry);
      return;
    }

    for (const star of touching) {
      if (star.kind !== 'zodiac') continue;
      const completed = star.sign.touch(star);
      if (completed && pushMedalWindow(MEDALS.zodiac)) return;
    }
  }

  private enter(miniGame: MiniGameEntry): void {
    this.visitedMiniGame = true;
    startMiniGame(miniGame);
  }

  private addTwinkle(): void {
    const range = 10;
    const p = input.pointer;
    this.twinkles.push({
      x: p.x - WIDTH / 2 + Math.trunc(this.rocket.x) + randomInt(2 * range) - range,
      y: p.y - HEIGHT / 2 + Math.trunc(this.rocket.y) + randomInt(2 * range) - range,
      bornAt: this.now,
    });
  }

  // ------------------------------------------------------------------ rendering

  render(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx, this.layer.background, 1);
    for (const bg of this.fadingBackgrounds) this.drawBackground(ctx, bg.image, bg.alpha);

    const ox = WIDTH / 2 - Math.trunc(this.rocket.x);
    const oy = HEIGHT / 2 - Math.trunc(this.rocket.y);
    ctx.save();
    ctx.translate(ox, oy);
    this.drawMapSymbols(ctx, -ox, -oy);
    ctx.restore();

    this.drawRocket(ctx);

    ctx.save();
    ctx.translate(ox, oy);
    this.drawTwinkles(ctx);
    ctx.restore();

    drawMiniMap(ctx, this.layer, this.rocket);
    drawSpeedometer(ctx, this.rocket.speed, MAX_SPEED);
    drawIndicator(ctx, { ...this.rocket, medals: player.count() });
  }

  /** Tiles the background with half-speed parallax. */
  private drawBackground(ctx: CanvasRenderingContext2D, image: ImageKey, alpha: number): void {
    const size = 1024;
    const x0 = mod(-Math.trunc(this.rocket.x / 2 - WIDTH / 2), size) - size;
    const y0 = mod(-Math.trunc(this.rocket.y / 2 - HEIGHT / 2), size) - size;
    ctx.globalAlpha = alpha;
    drawTiled(ctx, img(image), size, { width: WIDTH, height: HEIGHT }, x0, y0);
    ctx.globalAlpha = 1;
  }

  /** Draws the map in world coordinates; (left, top) is the world position of the screen's corner. */
  private drawMapSymbols(ctx: CanvasRenderingContext2D, left: number, top: number): void {
    const margin = 250;
    const visible = (x: number, y: number) =>
      x > left - margin && x < left + WIDTH + margin && y > top - margin && y < top + HEIGHT + margin;
    const layer = this.layer;

    if (layer.zodiac) {
      ctx.strokeStyle = layer.zodiac.lineColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (const line of layer.zodiac.lines) {
        ctx.moveTo(line.x0, line.y0);
        ctx.lineTo(line.x1, line.y1);
      }
      ctx.stroke();
    }

    // Background stars flicker by picking a random image every frame.
    for (const star of layer.backgroundStars) {
      if (!visible(star.x, star.y)) continue;
      ctx.drawImage(img(Math.random() < 0.5 ? 'space/star-bright' : 'space/star-dark'), star.x, star.y, 35, 35);
    }

    for (const star of layer.eventStars) {
      if (!visible(star.x, star.y)) continue;
      this.drawEventStar(ctx, star);
    }
  }

  private drawEventStar(ctx: CanvasRenderingContext2D, star: EventStar): void {
    const [image, r] =
      star.kind === 'mini-game' ? [star.entry.starImage, MINI_GAME_STAR_RADIUS * 2] : [star.image, star.imageRadius];
    ctx.drawImage(img(image), star.x - r, star.y - r, r * 2, r * 2);
  }

  private drawRocket(ctx: CanvasRenderingContext2D): void {
    const stopped = this.rocket.speed < 1;
    const angle = toRadians(this.rocket.angle);
    const draw = (image: ImageKey) => drawRotated(ctx, img(image), WIDTH / 2, HEIGHT / 2, 120, 80, angle);

    draw(stopped ? 'space/rocket-stop' : 'space/rocket');
    if (this.isInvincible()) {
      // Cross-fade into the normal look; the curve gets steeper towards the end.
      const ratio = (this.invincibleUntil - this.now) / INVINCIBLE_MS;
      const alpha = (1 - Math.pow(100, -ratio)) / (1 - 1 / 100);
      ctx.globalAlpha = clamp(alpha, 0, 1);
      draw(stopped ? 'space/rocket-invincible-stop' : 'space/rocket-invincible');
      ctx.globalAlpha = 1;
    }
  }

  private drawTwinkles(ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = 1;
    for (const t of this.twinkles) {
      const progress = (this.now - t.bornAt) / TWINKLE_MS;
      const grow = 0.3;
      const length = Math.trunc(
        progress < grow ? (10 * progress) / grow : 10 * Math.cos(((progress - grow) / (1 - grow)) * (Math.PI / 2)),
      );
      ctx.strokeStyle = randomWhitishColor();
      ctx.beginPath();
      ctx.moveTo(t.x - length, t.y + 0.5);
      ctx.lineTo(t.x + length, t.y + 0.5);
      ctx.moveTo(t.x + 0.5, t.y - length);
      ctx.lineTo(t.x + 0.5, t.y + length);
      ctx.stroke();
    }
  }
}

const whitish = (): number => 200 + randomInt(55);
const randomWhitishColor = (): string => `rgb(${whitish()},${whitish()},${whitish()})`;
