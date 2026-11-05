import type { Scene } from '../engine/scene';
import { HEIGHT, WIDTH } from '../engine/stage';
import { scenes } from './context';
import { h } from './ui/dom';

/** The hole opens or closes by 12 px of width every 10 ms (6 px on each side). */
const OPEN_PER_MS = 12 / WIDTH / 10;
/** How long the screen stays fully black before the next scene appears. */
const BLACK_HOLD_MS = 200;

/**
 * A rectangular "peephole" transition: the visible area shrinks to the center,
 * the scenes from `next` are pushed, and the hole opens again.
 *
 * It is drawn with a DOM element so that it also covers dialogs.
 */
export class TransitionScene implements Scene {
  readonly opaque = false;
  private readonly hole = h('div', { class: 'transition-hole' });
  readonly element = h('div', { class: 'transition' }, this.hole);
  /** How far the hole is open, from 0 (black) to 1 (full screen). */
  private open: number;
  private blackMs = 0;

  /** @param next creates the scenes to show (bottom first); omitted for the opening half */
  private constructor(private readonly next?: () => Scene[]) {
    this.open = next ? 1 : 0;
    this.render();
  }

  /** Closes the screen, then pushes the scenes created by `next` (bottom first). */
  static push(next: () => Scene[]): TransitionScene {
    return new TransitionScene(next);
  }

  update(dt: number): void {
    if (!this.next) {
      this.open = Math.min(1, this.open + OPEN_PER_MS * dt);
      if (this.open === 1) scenes().pop();
      return;
    }
    this.open = Math.max(0, this.open - OPEN_PER_MS * dt);
    if (this.open > 0) return;
    this.blackMs += dt;
    if (this.blackMs < BLACK_HOLD_MS) return;

    const stack = scenes();
    stack.pop();
    const [first, ...rest] = this.next();
    if (first) stack.push(first, ...rest);
    stack.push(new TransitionScene());
  }

  render(): void {
    const width = WIDTH * this.open;
    const height = HEIGHT * this.open;
    Object.assign(this.hole.style, {
      left: `${(WIDTH - width) / 2}px`,
      top: `${(HEIGHT - height) / 2}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
  }
}
