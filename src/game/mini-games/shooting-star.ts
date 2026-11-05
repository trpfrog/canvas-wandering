import { img } from '../../engine/assets';
import { arcDegrees, fillTextCentered } from '../../engine/draw';
import { normalizeDegrees } from '../../engine/geometry';
import { HEIGHT, WIDTH } from '../../engine/stage';
import { MEDALS } from '../medals';
import type { MiniGame, MiniGameEntry, MiniGameSession } from './mini-game';
import { drawStarryBackground } from './starry-background';

const GAME_MS = 30_000;
const PENALTY = 10;

/** Shooting stars fly along huge circles centered far below the screen. */
const ORBIT_CX = WIDTH / 2;
const ORBIT_CY = WIDTH * 2;
/** A star starts at 180° and is gone once its angle wraps around into (180°, 270°]. */
const isGone = (angle: number) => angle > 180 && angle <= 270;
/** The couple sees a star while it is in this part of the sky. */
const isInSight = (angle: number) => angle >= 45 && angle <= 135;

interface FloatingEffect {
  x: number;
  y: number;
  alpha: number;
}

interface Star {
  angle: number;
  radius: number;
  /** Set once the couple has seen the star: a penalty and a heart float up. */
  seen?: { heart: FloatingEffect; penalty: FloatingEffect };
}

const COUPLE_HEIGHT = 300;

/** The couple in the lower right corner, hugging or looking up at the sky. */
function couplePlacement(looking: boolean): { image: HTMLImageElement; x: number; y: number; w: number } {
  const image = img(looking ? 'shooting-star/looking' : 'shooting-star/hug');
  const w = Math.trunc((COUPLE_HEIGHT * image.width) / image.height);
  return { image, x: WIDTH - w - 30, y: HEIGHT - COUPLE_HEIGHT, w };
}

function drawStar(ctx: CanvasRenderingContext2D, star: Star): void {
  const { penalty, heart } = star.seen ?? {};
  if (penalty && penalty.alpha >= 0) {
    ctx.globalAlpha = penalty.alpha;
    ctx.fillStyle = '#f00';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText(`-${PENALTY}`, penalty.x, penalty.y);
  }
  if (heart && heart.alpha >= 0) {
    ctx.globalAlpha = heart.alpha;
    const size = 50;
    ctx.drawImage(img('shooting-star/heart'), heart.x - size / 2, heart.y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
  if (isGone(star.angle)) return;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  arcDegrees(ctx, ORBIT_CX, ORBIT_CY, star.radius, Math.trunc(star.angle), 5);
  ctx.stroke();
}

/** Send as many shooting stars as possible while the couple is not looking at the sky. */
function start({ end, isOver }: MiniGameSession): MiniGame {
  let stars: Star[] = [];
  let score = 0;
  /** Scene clock in ms. */
  let now = 0;
  /** The clock starts with the first star. */
  let startedAt: number | undefined;
  let lookingUntil = 0;
  let desireToSeeSky = 0;

  const remainingMs = () => (startedAt === undefined ? GAME_MS : Math.max(0, GAME_MS - (now - startedAt)));
  const looksAtSky = () => now < lookingUntil;

  function launch(): void {
    if (isOver()) return;
    startedAt ??= now;
    score++;
    stars.push({ angle: 180, radius: Math.trunc(WIDTH * 1.5 + Math.random() * WIDTH * 0.5) });
  }

  /** The longer the couple has not looked up, the more they want to. */
  function updateCouple(): void {
    if (looksAtSky()) return;
    const chance = 0.1 * ((now - lookingUntil - 1000) / 10_000);
    if (Math.random() >= chance) return;
    desireToSeeSky++;
    if (Math.random() < 0.1) desireToSeeSky -= 2;
    if (desireToSeeSky >= 10) {
      lookingUntil = now + 1000 + 2000 * Math.random();
      desireToSeeSky = 0;
    }
  }

  function updateStar(star: Star): void {
    if (!isGone(star.angle)) star.angle = normalizeDegrees(star.angle - 2);
    if (!star.seen && looksAtSky() && isInSight(star.angle)) {
      score = Math.max(0, score - PENALTY);
      const margin = 100;
      const couple = couplePlacement(true);
      star.seen = {
        penalty: {
          x: (WIDTH - margin * 2) * Math.random() + margin / 2,
          y: (HEIGHT - margin * 2) * Math.random() + margin / 2,
          alpha: 0.8,
        },
        heart: { x: couple.x + Math.random() * 300, y: couple.y + Math.random() * 250, alpha: 1 },
      };
    }
    for (const effect of Object.values(star.seen ?? {})) {
      effect.y -= 1;
      effect.alpha -= 0.01;
    }
  }

  return {
    keyDown(e) {
      if (e.code === 'Space' && !e.repeat) launch();
    },
    click: launch,
    update(dt) {
      now += dt;
      updateCouple();
      for (const star of stars) updateStar(star);
      stars = stars.filter((s) => !isGone(s.angle) || (s.seen !== undefined && s.seen.penalty.alpha >= 0));
      if (remainingMs() === 0) end(score);
    },
    render(ctx) {
      drawStarryBackground(ctx);

      // Big translucent score in the middle
      const scoreSize = Math.trunc(HEIGHT * 0.6);
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${scoreSize}px sans-serif`;
      fillTextCentered(ctx, String(score), WIDTH / 2, (HEIGHT + scoreSize / 2) / 2);
      ctx.globalAlpha = 1;

      for (const star of stars) drawStar(ctx, star);

      const { image, x, y, w } = couplePlacement(looksAtSky());
      const shake = Math.max(0, desireToSeeSky - 3) * Math.random();
      ctx.drawImage(image, x - Math.trunc(shake), y, w, COUPLE_HEIGHT);

      const remaining = remainingMs();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 30px monospace';
      const text =
        startedAt === undefined
          ? 'PRESS SPACE KEY TO START'
          : `${String(Math.trunc(remaining / 1000)).padStart(2)}.${String(remaining % 1000).padStart(3, '0')} seconds left`;
      ctx.fillText(text, 10, 40);
    },
  };
}

export const shootingStar: MiniGameEntry = {
  depth: 0,
  title: "Don't Show Shooting Stars!",
  creator: 'つまみ流星群 impacted by ねぎー彗星',
  description: ['今日は流れ星がよく見えそうです！'],
  howToPlay: [
    'あなたはカップルが嫌いな神です。',
    'カップルが見ていない隙に流れ星を流しましょう。',
    '',
    'スペースキーを押す、または画面をクリックすることで',
    '流れ星を流すことができます。',
    '30秒間でできるだけ多くの星を流しましょう。',
    'ただし、流れ星を見られてしまうと10点減点です。',
  ],
  starImage: 'shooting-star/star',
  result: {
    title: 'Game Over',
    background: 'rgba(200,200,0,0.2)',
    medal: { def: MEDALS.shootingStar, minScore: 100 },
  },
  start,
};
