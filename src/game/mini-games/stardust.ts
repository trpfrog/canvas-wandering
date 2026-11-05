/*
 * 星屑集め — ported from the unmerged upstream PR trpfrog/medipro-game#271.
 */
import { img } from '../../engine/assets';
import { pad2 } from '../../engine/draw';
import { circle, intersects, place, rect } from '../../engine/geometry';
import { HEIGHT, WIDTH, type Point } from '../../engine/stage';
import { MiniGameScene, type MiniGameEntry } from './mini-game';

/** Everything in this game is counted in 10 ms ticks. */
const COUNTDOWN_TICKS = 300;
const PLAY_TICKS = 1000;
const SPAWN_END_TICK = 1300;
const END_TICK = 1400;

const KOZOU = { w: 112, h: 267, speed: 5 };
const CUP = { w: 100, h: 130 };
const CUP_Y = HEIGHT - 200;
/** Only the top 50 px of the cup catch dust. */
const CUP_HIT_BOX = rect(CUP.w, 50, 0, 25);
const DUST_SIZE = 20;

interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Catch the stardust the boy scatters with the cup. Ten seconds. It IS stardust. */
class Stardust extends MiniGameScene {
  private ticks = 0;
  private score = 0;
  private cupX = WIDTH / 2;
  private dust: Dust[] = [];
  /** x of the boy's back; he faces right while `facing` is 1. */
  private kozou = { x: KOZOU.w, vx: KOZOU.speed, facing: 1 as 1 | -1 };

  constructor() {
    super({ title: 'GAME OVER', background: 'rgba(118,34,0,0.71)' });
  }

  pointerMove(p: Point): void {
    this.cupX = p.x;
  }

  update(): void {
    this.moveKozou();
    for (const d of this.dust) this.moveDust(d);
    this.catchDust();
    if (this.ticks >= COUNTDOWN_TICKS && this.ticks < SPAWN_END_TICK && this.ticks % 5 === 0) this.scatter();
    this.ticks++;
    if (this.ticks > END_TICK) this.end(this.score);
  }

  private moveKozou(): void {
    const k = this.kozou;
    k.x += k.vx;
    if (k.x > WIDTH - KOZOU.w) {
      k.facing = -1;
      k.x = 2 * WIDTH - 3 * KOZOU.w - k.x;
      k.vx = -k.vx;
    }
    if (k.x < KOZOU.w) {
      k.facing = 1;
      k.x = 3 * KOZOU.w - k.x;
      k.vx = -k.vx;
    }
  }

  private scatter(): void {
    const k = this.kozou;
    const vy = Math.random() * 36 - 17;
    this.dust.push({
      x: k.facing === -1 ? k.x + 20 : k.x - 35,
      y: 190,
      vx: Math.sqrt(400 - vy * vy) * k.facing,
      vy,
    });
  }

  private moveDust(d: Dust): void {
    d.x += d.vx;
    d.y += d.vy;
    d.vy += 1;
    if (d.x > WIDTH - DUST_SIZE) {
      d.x = 2 * (WIDTH - DUST_SIZE) - d.x;
      d.vx = -d.vx;
    }
    if (d.x < 0) {
      d.x = -d.x;
      d.vx = -d.vx;
    }
  }

  /** Counts the dust that falls into the cup and drops what can no longer be caught. */
  private catchDust(): void {
    const cup = place(CUP_HIT_BOX, this.cupX, CUP_Y);
    const caught = (d: Dust) => intersects(cup, place(circle(DUST_SIZE / 2), d.x + DUST_SIZE / 2, d.y + DUST_SIZE / 2));
    const missed = (d: Dust) => d.vy > 0 && d.y > CUP_Y + 50;
    const before = this.dust.length;
    this.dust = this.dust.filter((d) => !caught(d));
    this.score += before - this.dust.length;
    this.dust = this.dust.filter((d) => !missed(d));
  }

  private remainingTicks(): number {
    return Math.max(0, PLAY_TICKS - Math.max(0, this.ticks - COUNTDOWN_TICKS));
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgb(0,34,82)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // The image faces left; flip it while he faces right.
    const k = this.kozou;
    ctx.save();
    ctx.translate(k.x, 0);
    ctx.scale(-k.facing, 1);
    ctx.drawImage(img('stardust/kozou'), 0, 0, KOZOU.w, KOZOU.h);
    ctx.restore();

    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    for (const d of this.dust) {
      ctx.moveTo(d.x + DUST_SIZE, d.y + DUST_SIZE / 2);
      ctx.arc(d.x + DUST_SIZE / 2, d.y + DUST_SIZE / 2, DUST_SIZE / 2, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.drawImage(img('stardust/cup'), this.cupX - CUP.w / 2, CUP_Y, CUP.w, CUP.h);

    ctx.fillStyle = '#fff';
    ctx.font = '25px sans-serif';
    ctx.textBaseline = 'alphabetic';
    const remaining = this.remainingTicks();
    ctx.fillText(`score  ${this.score}`, WIDTH - 150, 20);
    ctx.fillText(`time  ${Math.trunc(remaining / 100)}.${pad2(remaining % 100)}`, 0, 20);

    ctx.font = '60px sans-serif';
    if (this.ticks < COUNTDOWN_TICKS) {
      ctx.fillText(String(3 - Math.trunc(this.ticks / 100)), WIDTH / 2 - 45, HEIGHT / 2);
    } else if (this.ticks < COUNTDOWN_TICKS + 100) {
      ctx.fillText('Start', WIDTH / 2 - 90, HEIGHT / 2);
    }
  }
}

export const stardust: MiniGameEntry = {
  depth: 0,
  title: '星屑集め',
  creator: 'Q',
  description: ['星屑を回収しろ！'],
  howToPlay: [
    '「単位を取りたい！」という願い事を叶えたいなら',
    'できるだけ多くの星屑を集めてお願いしないといけません。',
    '10秒間でより多くの星屑を集めてください。',
    '',
    '・・・誰が何と言おうと星屑です！',
  ],
  starImage: 'stardust/star',
  create: () => new Stardust(),
};
