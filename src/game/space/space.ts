import { img, type ImageKey } from '../../engine/assets';
import * as audio from '../../engine/audio';
import { drawRotated, drawTiled } from '../../engine/draw';
import {
  advance,
  angleDiffDegrees,
  clamp,
  distance,
  type Heading,
  intersects,
  mod,
  normalizeDegrees,
  place,
  toDegrees,
  toRadians,
} from '../../engine/geometry';
import { input } from '../../engine/input';
import { randomInt } from '../../engine/random';
import type { Scene } from '../../engine/scene';
import { HEIGHT, WIDTH } from '../../engine/stage';
import { every } from '../../engine/timing';
import { MEDALS, medalCount } from '../medals';
import { miniGames } from '../mini-games';
import { startMiniGame } from '../mini-games/mini-game';
import { rocketHitBox } from '../rocket';
import { showMedalDialog } from '../ui/medal-dialogs';
import { createPauseMenu } from '../ui/menus';
import { drawIndicator, drawMiniMap, drawSpeedometer } from './hud';
import {
  createSpaceMap,
  eventStarHitBox,
  type EventStar,
  type Layer,
  MAP_DEPTH,
  MAP_SIZE,
  MINI_GAME_STAR_RADIUS,
  touchZodiacStar,
} from './space-map';

const MAX_SPEED = 500;
/** The controls are read every 20 ms. */
const CONTROL_INTERVAL_MS = 20;
/** Speed change per control step: 5 s to reach the top speed. */
const ACCELERATION = 2;
/** Turn per control step: one full turn in 2 s. */
const TURN_DEGREES = 3.6;
/** Touching stars is checked every 100 ms. */
const TOUCH_INTERVAL_MS = 100;
const INVINCIBLE_MS = 5000;
const TWINKLE_MS = 400;

const ROCKET_HIT_BOX = rocketHitBox();
const SCREEN_CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };

interface Rocket extends Heading {
  depth: number;
}

interface Twinkle {
  x: number;
  y: number;
  bornAt: number;
}

interface SpaceState {
  rocket: Rocket;
  /** Scene clock in ms; it only advances while the scene is active. */
  now: number;
  invincibleUntil: number;
  /** Z/X presses and wheel turns not handled yet; each changes the depth by one layer. */
  pendingDepthKeys: Set<string>;
  wheelDirection?: 1 | -1;
  twinkles: Twinkle[];
  fadingBackgrounds: { image: ImageKey; alpha: number }[];
}

const isInvincible = (s: SpaceState): boolean => s.now < s.invincibleUntil;

const accelerate = (rocket: Rocket, a: number): void => {
  rocket.speed = clamp(rocket.speed + a, 0, MAX_SPEED);
};

/** W/S/A/D, or the mouse: faster the farther from the center, turning towards the pointer. */
function steer(rocket: Rocket): void {
  const keys = input.keys;
  const mouse = input.pointerDown ? input.pointer : undefined;

  const w = keys.has('KeyW');
  const s = keys.has('KeyS');
  if (w || s) {
    accelerate(rocket, ACCELERATION * (Number(w) - Number(s)));
  } else if (mouse) {
    accelerate(rocket, ACCELERATION * (distance(mouse, SCREEN_CENTER) / (HEIGHT / 2) - 0.5) * 2);
  }

  const a = keys.has('KeyA');
  const d = keys.has('KeyD');
  if (a || d) {
    rocket.angle = normalizeDegrees(rocket.angle + TURN_DEGREES * (Number(d) - Number(a)));
  } else if (mouse) {
    const target = toDegrees(Math.atan2(mouse.y - HEIGHT / 2, mouse.x - WIDTH / 2));
    const diff = angleDiffDegrees(rocket.angle, target);
    // Turn slower when almost facing the pointer, so that the rocket does not wobble.
    const step = Math.abs(diff) < 1 ? 0 : Math.abs(diff) < 14.4 ? 1 : TURN_DEGREES;
    rocket.angle = normalizeDegrees(rocket.angle + Math.sign(diff) * step);
  }
}

/** Z: up a layer, X: down a layer, wheel: either. */
function takeDepthChange(s: SpaceState): number {
  if (s.pendingDepthKeys.size > 0) {
    const delta = Number(s.pendingDepthKeys.has('KeyZ')) - Number(s.pendingDepthKeys.has('KeyX'));
    s.pendingDepthKeys.clear();
    return delta;
  }
  const delta = s.wheelDirection ?? 0;
  s.wheelDirection = undefined;
  return delta;
}

function addTwinkle(s: SpaceState): void {
  const range = 10;
  const p = input.pointer;
  s.twinkles.push({
    x: p.x - WIDTH / 2 + Math.trunc(s.rocket.x) + randomInt(2 * range) - range,
    y: p.y - HEIGHT / 2 + Math.trunc(s.rocket.y) + randomInt(2 * range) - range,
    bornAt: s.now,
  });
}

/** Tiles the background with half-speed parallax. */
function drawBackground(ctx: CanvasRenderingContext2D, rocket: Rocket, image: ImageKey, alpha: number): void {
  const size = 1024;
  const x0 = mod(-Math.trunc(rocket.x / 2 - WIDTH / 2), size) - size;
  const y0 = mod(-Math.trunc(rocket.y / 2 - HEIGHT / 2), size) - size;
  ctx.globalAlpha = alpha;
  drawTiled(ctx, img(image), size, { width: WIDTH, height: HEIGHT }, x0, y0);
  ctx.globalAlpha = 1;
}

function drawEventStar(ctx: CanvasRenderingContext2D, star: EventStar): void {
  const [image, r]: [ImageKey, number] =
    star.kind === 'mini-game'
      ? [star.entry.starImage, MINI_GAME_STAR_RADIUS * 2]
      : star.touched
        ? ['space/star-bright', 30]
        : ['space/star-dark', 35];
  ctx.drawImage(img(image), star.x - r, star.y - r, r * 2, r * 2);
}

/** Draws the map in world coordinates; (left, top) is the world position of the screen's corner. */
function drawMap(ctx: CanvasRenderingContext2D, layer: Layer, left: number, top: number): void {
  const margin = 250;
  const visible = ({ x, y }: { x: number; y: number }) =>
    x > left - margin && x < left + WIDTH + margin && y > top - margin && y < top + HEIGHT + margin;

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
  for (const star of layer.backgroundStars.filter(visible)) {
    ctx.drawImage(img(Math.random() < 0.5 ? 'space/star-bright' : 'space/star-dark'), star.x, star.y, 35, 35);
  }
  for (const star of layer.eventStars.filter(visible)) drawEventStar(ctx, star);
}

function drawRocket(ctx: CanvasRenderingContext2D, s: SpaceState): void {
  const stopped = s.rocket.speed < 1;
  const angle = toRadians(s.rocket.angle);
  const draw = (image: ImageKey) => drawRotated(ctx, img(image), WIDTH / 2, HEIGHT / 2, 120, 80, angle);

  draw(stopped ? 'space/rocket-stop' : 'space/rocket');
  if (isInvincible(s)) {
    // Cross-fade into the normal look; the curve gets steeper towards the end.
    const ratio = (s.invincibleUntil - s.now) / INVINCIBLE_MS;
    const alpha = (1 - Math.pow(100, -ratio)) / (1 - 1 / 100);
    ctx.globalAlpha = clamp(alpha, 0, 1);
    draw(stopped ? 'space/rocket-invincible-stop' : 'space/rocket-invincible');
    ctx.globalAlpha = 1;
  }
}

const whitish = (): number => 200 + randomInt(55);

function drawTwinkles(ctx: CanvasRenderingContext2D, s: SpaceState): void {
  ctx.lineWidth = 1;
  for (const t of s.twinkles) {
    const progress = (s.now - t.bornAt) / TWINKLE_MS;
    const grow = 0.3;
    const length = Math.trunc(
      progress < grow ? (10 * progress) / grow : 10 * Math.cos(((progress - grow) / (1 - grow)) * (Math.PI / 2)),
    );
    ctx.strokeStyle = `rgb(${whitish()},${whitish()},${whitish()})`;
    ctx.beginPath();
    ctx.moveTo(t.x - length, t.y + 0.5);
    ctx.lineTo(t.x + length, t.y + 0.5);
    ctx.moveTo(t.x + 0.5, t.y - length);
    ctx.lineTo(t.x + 0.5, t.y + length);
    ctx.stroke();
  }
}

/** The open world: fly the rocket around and visit the mini game stars. */
export function createSpaceScene(): Scene {
  const map = createSpaceMap(miniGames);
  const s: SpaceState = {
    rocket: { x: MAP_SIZE / 2, y: MAP_SIZE / 2, angle: 0, speed: 0, depth: 0 },
    now: 0,
    invincibleUntil: 0,
    pendingDepthKeys: new Set(),
    twinkles: [],
    fadingBackgrounds: [],
  };
  /** The mini game stars move to new places after each mini game. */
  let visitedMiniGame = false;
  const layer = () => map.layerAt(s.rocket.depth);

  function changeDepth(delta: number): void {
    if (delta === 0) return;
    const previous = layer().background;
    s.rocket.depth = mod(s.rocket.depth + delta, MAP_DEPTH);
    if (layer().background !== previous) s.fadingBackgrounds.push({ image: previous, alpha: 1 });
  }

  function checkTouchingStars(): void {
    const { rocket } = s;
    const hitBox = place(ROCKET_HIT_BOX, rocket.x, rocket.y, toRadians(rocket.angle));
    const range = 1000;
    const touching = layer().eventStars.filter(
      (star) =>
        Math.abs(star.x - rocket.x) <= range &&
        Math.abs(star.y - rocket.y) <= range &&
        intersects(hitBox, eventStarHitBox(star)),
    );

    const miniGameStar = touching
      .filter((star) => star.kind === 'mini-game')
      .toSorted((p, q) => distance(p, rocket) - distance(q, rocket))
      .at(0);
    if (miniGameStar) {
      visitedMiniGame = true;
      startMiniGame(miniGameStar.entry);
      return;
    }

    const { zodiac } = layer();
    if (!zodiac) return;
    for (const star of touching) {
      if (star.kind !== 'zodiac') continue;
      if (touchZodiacStar(zodiac, star) && showMedalDialog(MEDALS.zodiac)) return;
    }
  }

  const controlTick = every(CONTROL_INTERVAL_MS, () => {
    steer(s.rocket);
    changeDepth(takeDepthChange(s));
  });
  const touchTick = every(TOUCH_INTERVAL_MS, () => {
    if (!isInvincible(s)) checkTouchingStars();
  });

  return {
    tag: 'space',
    opaque: true,
    bgm: 'space',
    pauseMenu: createPauseMenu,
    resume() {
      if (visitedMiniGame) {
        visitedMiniGame = false;
        map.scatterMiniGameStars();
      }
      s.invincibleUntil = s.now + INVINCIBLE_MS;
      s.rocket.speed = 0;
      audio.playSe('rocket', { repeat: 'forever' });
    },
    suspend() {
      audio.stopSe('rocket');
      s.pendingDepthKeys.clear();
      s.wheelDirection = undefined;
    },
    keyDown(e) {
      if (e.code === 'KeyZ' || e.code === 'KeyX') s.pendingDepthKeys.add(e.code);
    },
    wheel(deltaY) {
      // Scrolling down goes one layer deeper.
      if (deltaY !== 0) s.wheelDirection = deltaY > 0 ? 1 : -1;
    },
    update(dt) {
      s.now += dt;
      controlTick(dt);
      advance(s.rocket, dt);
      touchTick(dt);

      if (input.pointerDown && Math.random() - 0.05 <= s.rocket.speed / MAX_SPEED) addTwinkle(s);
      if (s.twinkles.length > 0) s.twinkles = s.twinkles.filter((t) => s.now - t.bornAt <= TWINKLE_MS);
      if (s.fadingBackgrounds.length > 0) {
        for (const bg of s.fadingBackgrounds) bg.alpha -= 1 / 64;
        s.fadingBackgrounds = s.fadingBackgrounds.filter((bg) => bg.alpha >= 0);
      }
    },
    render(ctx) {
      const { rocket } = s;
      const current = layer();
      drawBackground(ctx, rocket, current.background, 1);
      for (const bg of s.fadingBackgrounds) drawBackground(ctx, rocket, bg.image, bg.alpha);

      const ox = WIDTH / 2 - Math.trunc(rocket.x);
      const oy = HEIGHT / 2 - Math.trunc(rocket.y);
      ctx.save();
      ctx.translate(ox, oy);
      drawMap(ctx, current, -ox, -oy);
      ctx.restore();

      drawRocket(ctx, s);

      ctx.save();
      ctx.translate(ox, oy);
      drawTwinkles(ctx, s);
      ctx.restore();

      drawMiniMap(ctx, current, rocket);
      drawSpeedometer(ctx, rocket.speed, MAX_SPEED);
      drawIndicator(ctx, { ...rocket, medals: medalCount() });
    },
  };
}
