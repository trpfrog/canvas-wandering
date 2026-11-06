/*
 * マッチョ星雲 — based on trpfrog/medipro-game#273.
 */
import { img } from '../../engine/assets';
import { fillTextCentered } from '../../engine/draw';
import { clamp, toRadians, type Point } from '../../engine/geometry';
import { input } from '../../engine/input';
import { HEIGHT, WIDTH } from '../../engine/stage';
import { MEDALS } from '../medals';
import type { MiniGame, MiniGameEntry, MiniGameSession } from './mini-game';

const GAME_MS = 10_000;
const MAX_ANGLE = 150;
/** Dragging this many pixels to the right bends the arm by one degree. */
const PX_PER_DEGREE = 256;
const ELBOW: Point = { x: 512 - 32 + 140, y: 512 + 32 };

const gaugeColor = (percent: number): string =>
  percent === 100 ? '#880088' : percent > 75 ? '#dd0000' : percent > 50 ? '#dddd00' : '#00ff00';

/** Bend the arm all the way up by dragging to the right, again and again, in 10 seconds. */
function start({ end, isOver }: MiniGameSession): MiniGame {
  let angle = 0;
  let best = 0;
  let remainingMs = GAME_MS;
  let drag: { startX: number; startAngle: number } | undefined;
  const percentage = () => (100 / MAX_ANGLE) * angle;

  function drawGauge(ctx: CanvasRenderingContext2D): void {
    const w = WIDTH / 2 + WIDTH / 4;
    const h = 64;
    const x = (WIDTH - w) / 2;
    const y = HEIGHT / 16;
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = gaugeColor(Math.floor(percentage()));
    ctx.fillRect(x, y, Math.floor((percentage() * w) / 100), h);
  }

  return {
    pointerDown(p) {
      drag = { startX: p.x, startAngle: angle };
    },
    pointerUp() {
      drag = undefined;
    },
    pointerMove(p) {
      // The button may have been released while a pause menu was open.
      if (!input.pointerDown) drag = undefined;
      if (drag === undefined || isOver()) return;
      // Only whole degrees count, so short drags do nothing: it takes muscle.
      const delta = Math.trunc((p.x - drag.startX) / PX_PER_DEGREE);
      angle = clamp(drag.startAngle + delta, 0, MAX_ANGLE);
    },
    update(dt) {
      remainingMs = Math.max(0, remainingMs - dt);
      best = Math.max(best, percentage());
      if (remainingMs === 0) end(Math.floor(best));
    },
    render(ctx) {
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.drawImage(img('macho/upper-arm'), 0, 0, 1024, 1024);
      ctx.save();
      ctx.translate(ELBOW.x, ELBOW.y);
      ctx.rotate(toRadians(angle));
      ctx.translate(-ELBOW.x, -ELBOW.y);
      ctx.drawImage(img('macho/forearm'), 0, 0, 1024, 1024);
      ctx.restore();

      drawGauge(ctx);

      ctx.fillStyle = '#fff';
      ctx.font = '100px sans-serif';
      fillTextCentered(ctx, String(Math.round(remainingMs)), WIDTH / 2, 100);
    },
  };
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
  result: { title: 'YOUR MUSCLE', background: 'rgba(224,29,0,0.53)', medal: { def: MEDALS.macho, minScore: 100 } },
  start,
};
