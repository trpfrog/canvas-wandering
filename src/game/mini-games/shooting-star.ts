import { img } from '../../engine/assets';
import { arcDegrees } from '../../engine/draw';
import { normalizeDegrees } from '../../engine/geometry';
import { HEIGHT, WIDTH } from '../../engine/stage';
import { scenes } from '../context';
import { MEDALS } from '../medals';
import { createGameOverDialog, pushMedalWindow } from '../ui/dialogs';
import { drawTiledBackground } from './moons-work';
import type { MiniGame, MiniGameEntry } from './mini-game';

const GAME_MS = 30_000;
const PENALTY = 10;
const MEDAL_SCORE = 100;

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
  readonly radius: number;
  seen: boolean;
  heart: FloatingEffect | null;
  penalty: FloatingEffect | null;
}

const COUPLE_HEIGHT = 300;

/** Send as many shooting stars as possible while the couple is not looking at the sky. */
class ShootingStar implements MiniGame {
  private stars: Star[] = [];
  private score = 0;
  private now = 0;
  private startedAt: number | null = null;
  private ended = false;

  private lookingUntil = 0;
  private desireToSeeSky = 0;

  private remainingMs(): number {
    if (this.startedAt === null) return GAME_MS;
    return Math.max(0, GAME_MS - (this.now - this.startedAt));
  }

  private launch(): void {
    if (this.ended) return;
    this.startedAt ??= this.now;
    this.score++;
    this.stars.push({
      angle: 180,
      radius: Math.trunc(WIDTH * 1.5 + Math.random() * WIDTH * 0.5),
      seen: false,
      heart: null,
      penalty: null,
    });
  }

  keyDown(e: KeyboardEvent): void {
    if (e.code === 'Space' && !e.repeat) this.launch();
  }

  click(): void {
    this.launch();
  }

  private looksAtSky(): boolean {
    return this.now < this.lookingUntil;
  }

  /** The longer the couple has not looked up, the more they want to. */
  private updateCouple(): void {
    if (this.looksAtSky()) return;
    const chance = 0.1 * ((this.now - this.lookingUntil - 1000) / 10_000);
    if (Math.random() >= chance) return;
    this.desireToSeeSky++;
    if (Math.random() < 0.1) this.desireToSeeSky -= 2;
    if (this.desireToSeeSky >= 10) {
      this.lookingUntil = this.now + 1000 + 2000 * Math.random();
      this.desireToSeeSky = 0;
    }
  }

  private coupleSize(): { x: number; y: number; w: number } {
    const image = img(this.looksAtSky() ? 'shooting-star/looking' : 'shooting-star/hug');
    const w = Math.trunc((COUPLE_HEIGHT * image.width) / image.height);
    return { x: WIDTH - w - 30, y: HEIGHT - COUPLE_HEIGHT, w };
  }

  update(dt: number): void {
    this.now += dt;
    this.updateCouple();

    for (const star of this.stars) {
      if (!isGone(star.angle)) star.angle = normalizeDegrees(star.angle - 2);
      if (!star.seen && this.looksAtSky() && isInSight(star.angle)) {
        star.seen = true;
        this.score = Math.max(0, this.score - PENALTY);
        const margin = 100;
        star.penalty = {
          x: (WIDTH - margin * 2) * Math.random() + margin / 2,
          y: (HEIGHT - margin * 2) * Math.random() + margin / 2,
          alpha: 0.8,
        };
        const couple = this.coupleSize();
        star.heart = { x: couple.x + Math.random() * 300, y: couple.y + Math.random() * 250, alpha: 1 };
      }
      for (const effect of [star.heart, star.penalty]) {
        if (!effect) continue;
        effect.y -= 1;
        effect.alpha -= 0.01;
      }
    }
    this.stars = this.stars.filter((s) => !isGone(s.angle) || (s.penalty !== null && s.penalty.alpha >= 0));

    if (this.startedAt !== null && this.remainingMs() === 0 && !this.ended) this.endGame();
  }

  private endGame(): void {
    this.ended = true;
    scenes().push(createGameOverDialog('Game Over', this.score, 'rgba(200,200,0,0.2)'));
    if (this.score >= MEDAL_SCORE) pushMedalWindow(MEDALS.shootingStar);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawTiledBackground(ctx);

    // Big translucent score in the middle
    const scoreSize = Math.trunc(HEIGHT * 0.6);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${scoreSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(this.score), WIDTH / 2, (HEIGHT + scoreSize / 2) / 2);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    for (const star of this.stars) this.drawStar(ctx, star);
    this.drawCouple(ctx);

    const remaining = this.remainingMs();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px monospace';
    const text =
      this.startedAt === null
        ? 'PRESS SPACE KEY TO START'
        : `${String(Math.trunc(remaining / 1000)).padStart(2)}.${String(remaining % 1000).padStart(3, '0')} seconds left`;
    ctx.fillText(text, 10, 40);
  }

  private drawStar(ctx: CanvasRenderingContext2D, star: Star): void {
    if (star.penalty && star.penalty.alpha >= 0) {
      ctx.globalAlpha = star.penalty.alpha;
      ctx.fillStyle = '#f00';
      ctx.font = 'bold 50px sans-serif';
      ctx.fillText(`-${PENALTY}`, star.penalty.x, star.penalty.y);
    }
    if (star.heart && star.heart.alpha >= 0) {
      ctx.globalAlpha = star.heart.alpha;
      const size = 50;
      ctx.drawImage(img('shooting-star/heart'), star.heart.x - size / 2, star.heart.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    if (isGone(star.angle)) return;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    arcDegrees(ctx, ORBIT_CX, ORBIT_CY, star.radius, Math.trunc(star.angle), 5);
    ctx.stroke();
  }

  private drawCouple(ctx: CanvasRenderingContext2D): void {
    const { x, y, w } = this.coupleSize();
    const shake = Math.max(0, this.desireToSeeSky - 3) * Math.random();
    const image = img(this.looksAtSky() ? 'shooting-star/looking' : 'shooting-star/hug');
    ctx.drawImage(image, x - Math.trunc(shake), y, w, COUPLE_HEIGHT);
  }
}

export const shootingStar: MiniGameEntry = {
  id: 'shooting-star',
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
  create: () => new ShootingStar(),
};
