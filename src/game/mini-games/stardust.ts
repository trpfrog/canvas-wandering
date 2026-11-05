/*
 * 星屑集め — based on trpfrog/medipro-game#271.
 */
import { img } from '../../engine/assets';
import { pad2 } from '../../engine/draw';
import { circle, intersects, place, rect } from '../../engine/geometry';
import { HEIGHT, WIDTH } from '../../engine/stage';
import type { MiniGame, MiniGameEntry, MiniGameSession } from './mini-game';

const COUNTDOWN_MS = 3000;
const PLAY_MS = 10_000;
const SPAWN_END_MS = COUNTDOWN_MS + PLAY_MS;
/** The game ends a second after time is up, so dust still in the air can be caught. */
const END_MS = SPAWN_END_MS + 1000;
const SCATTER_INTERVAL_MS = 50;

const KOZOU = { w: 112, h: 267, speed: 5 };
const CUP = { w: 100, h: 130 };
const CUP_Y = HEIGHT - 200;
/** Only the top 50 px of the cup catch dust. */
const CUP_HIT_BOX = rect(CUP.w, 50, 0, 25);
const DUST_SIZE = 20;

/** Velocities are in px per tick. */
interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Kozou {
  /** x of the boy's back. */
  x: number;
  vx: number;
  facing: 1 | -1;
}

function moveKozou(k: Kozou): void {
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

function moveDust(d: Dust): void {
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

/** A handful of dust flung from the boy's hand, in the direction he faces. */
function scatterFrom(k: Kozou): Dust {
  const vy = Math.random() * 36 - 17;
  return { x: k.facing === -1 ? k.x + 20 : k.x - 35, y: 190, vx: Math.sqrt(400 - vy * vy) * k.facing, vy };
}

/** Catch the stardust the boy scatters with the cup. Ten seconds. It IS stardust. */
function start({ end }: MiniGameSession): MiniGame {
  let elapsed = 0;
  let score = 0;
  let cupX = WIDTH / 2;
  let dust: Dust[] = [];
  const kozou: Kozou = { x: KOZOU.w, vx: KOZOU.speed, facing: 1 };

  /** Counts the dust that falls into the cup and drops what can no longer be caught. */
  function catchDust(): void {
    const cup = place(CUP_HIT_BOX, cupX, CUP_Y);
    const caught = (d: Dust) => intersects(cup, place(circle(DUST_SIZE / 2), d.x + DUST_SIZE / 2, d.y + DUST_SIZE / 2));
    const missed = (d: Dust) => d.vy > 0 && d.y > CUP_Y + 50;
    const before = dust.length;
    dust = dust.filter((d) => !caught(d));
    score += before - dust.length;
    dust = dust.filter((d) => !missed(d));
  }

  return {
    pointerMove(p) {
      cupX = p.x;
    },
    update(dt) {
      moveKozou(kozou);
      for (const d of dust) moveDust(d);
      catchDust();
      if (elapsed >= COUNTDOWN_MS && elapsed < SPAWN_END_MS && elapsed % SCATTER_INTERVAL_MS === 0) {
        dust.push(scatterFrom(kozou));
      }
      elapsed += dt;
      if (elapsed > END_MS) end(score);
    },
    render(ctx) {
      ctx.fillStyle = 'rgb(0,34,82)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // The image faces left; flip it while he faces right.
      ctx.save();
      ctx.translate(kozou.x, 0);
      ctx.scale(-kozou.facing, 1);
      ctx.drawImage(img('stardust/kozou'), 0, 0, KOZOU.w, KOZOU.h);
      ctx.restore();

      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      for (const d of dust) {
        ctx.moveTo(d.x + DUST_SIZE, d.y + DUST_SIZE / 2);
        ctx.arc(d.x + DUST_SIZE / 2, d.y + DUST_SIZE / 2, DUST_SIZE / 2, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.drawImage(img('stardust/cup'), cupX - CUP.w / 2, CUP_Y, CUP.w, CUP.h);

      ctx.fillStyle = '#fff';
      ctx.font = '25px sans-serif';
      ctx.textBaseline = 'alphabetic';
      const remaining = Math.max(0, PLAY_MS - Math.max(0, elapsed - COUNTDOWN_MS));
      ctx.fillText(`score  ${score}`, WIDTH - 150, 20);
      ctx.fillText(`time  ${Math.trunc(remaining / 1000)}.${pad2(Math.trunc((remaining % 1000) / 10))}`, 0, 20);

      ctx.font = '60px sans-serif';
      if (elapsed < COUNTDOWN_MS) {
        ctx.fillText(String(3 - Math.trunc(elapsed / 1000)), WIDTH / 2 - 45, HEIGHT / 2);
      } else if (elapsed < COUNTDOWN_MS + 1000) {
        ctx.fillText('Start', WIDTH / 2 - 90, HEIGHT / 2);
      }
    },
  };
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
  result: { title: 'GAME OVER', background: 'rgba(118,34,0,0.71)' },
  start,
};
