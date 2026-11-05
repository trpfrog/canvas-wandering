import { img } from '../../engine/assets';
import { drawRotated, arcDegrees } from '../../engine/draw';
import { normalizeDegrees, toRadians } from '../../engine/geometry';
import { input } from '../../engine/input';
import { HEIGHT, WIDTH } from '../../engine/stage';
import type { MiniGame, MiniGameEntry } from './mini-game';

const MAX_SPEED = 500;
/** Speed added every 10 ms while W/S is held. */
const ACCELERATION = 10;
/** Speed lost every 10 ms by friction. */
const FRICTION = 8;

/** A driving school course with no goal: just drive around. */
class RaceGame implements MiniGame {
  private readonly car = { x: 100, y: 100, angle: 0, speed: 0 };
  private active = false;

  resume(): void {
    this.active = true;
  }

  suspend(): void {
    this.active = false;
  }

  update(dt: number): void {
    const car = this.car;
    const keys = this.active ? input.keys : new Set<string>();
    const forward = keys.has('KeyW');
    const back = keys.has('KeyS');

    if (forward) car.speed = Math.min(MAX_SPEED, car.speed + ACCELERATION);
    if (back) car.speed = Math.max(-MAX_SPEED, car.speed - ACCELERATION);
    // You can only turn while pressing the pedal.
    if (forward || back) {
      const turn = (car.speed / MAX_SPEED) * 2;
      if (keys.has('KeyA')) car.angle = normalizeDegrees(car.angle - turn);
      if (keys.has('KeyD')) car.angle = normalizeDegrees(car.angle + turn);
    }

    // Friction always slows the car down to a standstill.
    if (car.speed > 0) car.speed = Math.max(0, car.speed - FRICTION);
    else if (car.speed < 0) car.speed = Math.min(0, car.speed + FRICTION);

    car.x += Math.cos(toRadians(car.angle)) * car.speed * (dt / 1000);
    car.y += Math.sin(toRadians(car.angle)) * car.speed * (dt / 1000);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    for (const size of [350, 300]) drawTrack(ctx, size);

    drawRotated(
      ctx,
      img('race-game/car'),
      Math.trunc(this.car.x),
      Math.trunc(this.car.y),
      80,
      40,
      toRadians(this.car.angle),
    );
  }
}

/** A stadium-shaped track centered on the screen. */
function drawTrack(ctx: CanvasRenderingContext2D, size: number): void {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  arcDegrees(ctx, cx - size / 2, cy, size / 2, 90, 180);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - size / 2, cy - size / 2);
  ctx.lineTo(cx + size / 2, cy - size / 2);
  ctx.moveTo(cx - size / 2, cy + size / 2);
  ctx.lineTo(cx + size / 2, cy + size / 2);
  ctx.stroke();
  arcDegrees(ctx, cx + size / 2, cy, size / 2, 90, -180);
  ctx.stroke();
}

export const raceGame: MiniGameEntry = {
  id: 'race-game',
  depth: 0,
  title: 'Sample Racing',
  creator: 'Created by つまみ自動車学校',
  description: ['教習所へようこそ！'],
  howToPlay: [
    'WASDで車を操作しましょう。',
    '移動中のみ曲がることができます。',
    'ブレーキはありません。勝手に止まるので待ってください。',
  ],
  starImage: 'race-game/star',
  create: () => new RaceGame(),
};
