/*
 * マッチョ星雲 — ported from the unmerged upstream PR trpfrog/medipro-game#273.
 */
import { img } from '../../engine/assets';
import { fillTextCentered } from '../../engine/draw';
import { clamp, toRadians } from '../../engine/geometry';
import { HEIGHT, WIDTH, type Point } from '../../engine/stage';
import { MEDALS } from '../medals';
import { MiniGameScene, type MiniGameEntry } from './mini-game';

const GAME_MS = 10_000;
const MAX_ANGLE = 150;
/** Dragging this many pixels to the right bends the arm by one degree. */
const PX_PER_DEGREE = 256;
const ELBOW: Point = { x: 512 - 32 + 140, y: 512 + 32 };

/** Bend the arm all the way up by dragging to the right, again and again, in 10 seconds. */
class Macho extends MiniGameScene {
  private angle = 0;
  private best = 0;
  private remainingMs = GAME_MS;
  private drag: { startX: number; startAngle: number } | null = null;

  constructor() {
    super({
      title: 'YOUR MUSCLE',
      background: 'rgba(224,29,0,0.53)',
      medal: { def: MEDALS.macho, minScore: 100 },
    });
  }

  pointerDown(p: Point): void {
    this.drag = { startX: p.x, startAngle: this.angle };
  }

  pointerUp(): void {
    this.drag = null;
  }

  pointerMove(p: Point): void {
    if (!this.drag || this.isOver) return;
    // Only whole degrees count, so short drags do nothing: it takes muscle.
    const delta = Math.trunc((p.x - this.drag.startX) / PX_PER_DEGREE);
    this.angle = clamp(this.drag.startAngle + delta, 0, MAX_ANGLE);
  }

  private percentage(): number {
    return (100 / MAX_ANGLE) * this.angle;
  }

  update(dt: number): void {
    this.remainingMs = Math.max(0, this.remainingMs - dt);
    this.best = Math.max(this.best, this.percentage());
    if (this.remainingMs === 0) this.end(Math.floor(this.best));
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.drawImage(img('macho/upper-arm'), 0, 0, 1024, 1024);
    ctx.save();
    ctx.translate(ELBOW.x, ELBOW.y);
    ctx.rotate(toRadians(this.angle));
    ctx.translate(-ELBOW.x, -ELBOW.y);
    ctx.drawImage(img('macho/forearm'), 0, 0, 1024, 1024);
    ctx.restore();

    this.drawGauge(ctx);

    const count = String(Math.round(this.remainingMs));
    ctx.fillStyle = '#fff';
    ctx.font = '100px sans-serif';
    fillTextCentered(ctx, count, WIDTH / 2, 100);
  }

  private drawGauge(ctx: CanvasRenderingContext2D): void {
    const w = WIDTH / 2 + WIDTH / 4;
    const h = 64;
    const x = (WIDTH - w) / 2;
    const y = HEIGHT / 16;
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, w, h);

    const percent = Math.floor(this.percentage());
    ctx.fillStyle = percent === 100 ? '#880088' : percent > 75 ? '#dd0000' : percent > 50 ? '#dddd00' : '#00ff00';
    ctx.fillRect(x, y, Math.floor((this.percentage() * w) / 100), h);
  }
}

export const macho: MiniGameEntry = {
  depth: 0,
  title: 'マッチョ星雲',
  creator: 'Created by キン肉一世',
  description: ['マッチョの世界へようこそ！'],
  // The rules are the muscle. Respect.
  howToPlay: [
    '　　_＿',
    '　 / )))　　　＿',
    '`／ イ~　　　(((ヽ',
    '(　 ﾉ　　　　 ￣Ｙ＼',
    '|　(＼　∧＿∧　｜　)',
    'ヽ　ヽ`(´･ω･)／ノ/',
    '　＼ |　⌒Ｙ⌒　/ /',
    '　 ｜ヽ　 ｜　 ﾉ／',
    '　　＼トー仝ーイ',
    '　　 ｜ ミ土彡/',
    '　　　)　　　｜',
    '　　 /　　_　 ＼',
    '　　/　 ／ ＼　 ヽ',
    '　 /　 /　　 ヽ　|',
  ],
  preformattedRules: true,
  starImage: 'macho/star',
  create: () => new Macho(),
};
