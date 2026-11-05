import type { Scene } from '../engine/scene';
import { HEIGHT, WIDTH } from '../engine/stage';
import { scenes } from './context';
import { h } from './ui/dom';

/** Horizontal speed of the closing/opening "peephole" in px per 10 ms. */
const SPEED = 6;
const SPEED_Y = (SPEED * HEIGHT) / WIDTH;
/** How long the screen stays fully black before the next scene appears. */
const BLACK_HOLD_MS = 200;

type Mode = { kind: 'push'; next: () => Scene[] } | { kind: 'pop'; target: Scene } | { kind: 'fade-in' };

/**
 * A rectangular "peephole" transition: the visible area shrinks to the center,
 * the scene stack changes, and then the hole opens again.
 *
 * It is drawn with DOM elements so that it also covers dialogs.
 */
export class TransitionScene implements Scene {
  readonly opaque = false;
  readonly element: HTMLElement;
  private readonly bars: Record<'top' | 'bottom' | 'left' | 'right', HTMLElement>;
  /** Half size of the hole. */
  private halfW: number;
  private halfH: number;
  private blackMs = 0;

  private constructor(private readonly mode: Mode) {
    this.bars = { top: bar(), bottom: bar(), left: bar(), right: bar() };
    this.element = h('div', { class: 'transition' }, ...Object.values(this.bars));
    const fadeOut = mode.kind !== 'fade-in';
    this.halfW = fadeOut ? WIDTH / 2 : 0;
    this.halfH = fadeOut ? HEIGHT / 2 : 0;
    this.layout();
  }

  /** Closes the screen, then pushes the scenes created by `next` (bottom first). */
  static push(next: () => Scene[]): TransitionScene {
    return new TransitionScene({ kind: 'push', next });
  }

  /** Closes the screen, then pops every scene down to and including `target`. */
  static pop(target: Scene): TransitionScene {
    return new TransitionScene({ kind: 'pop', target });
  }

  update(dt: number): void {
    const steps = dt / 10;
    if (this.mode.kind === 'fade-in') {
      this.halfW += SPEED * steps;
      this.halfH += SPEED_Y * steps;
      this.layout();
      if (this.halfW >= WIDTH / 2 && this.halfH >= HEIGHT / 2) scenes().pop();
      return;
    }

    this.halfW = Math.max(0, this.halfW - SPEED * steps);
    this.halfH = Math.max(0, this.halfH - SPEED_Y * steps);
    this.layout();
    if (this.halfW > 0) return;
    this.blackMs += dt;
    if (this.blackMs >= BLACK_HOLD_MS) this.transit();
  }

  private transit(): void {
    const stack = scenes();
    stack.pop();
    if (this.mode.kind === 'push') {
      const [first, ...rest] = this.mode.next();
      if (first) stack.push(first, ...rest);
    } else if (this.mode.kind === 'pop') {
      stack.popThrough(this.mode.target);
    }
    stack.push(new TransitionScene({ kind: 'fade-in' }));
  }

  private layout(): void {
    const left = WIDTH / 2 - this.halfW;
    const top = HEIGHT / 2 - this.halfH;
    setRect(this.bars.top, 0, 0, WIDTH, top);
    setRect(this.bars.bottom, 0, HEIGHT - top, WIDTH, top);
    setRect(this.bars.left, 0, 0, left, HEIGHT);
    setRect(this.bars.right, WIDTH - left, 0, left, HEIGHT);
  }
}

const bar = (): HTMLElement => h('div', { class: 'transition-bar' });

function setRect(el: HTMLElement, x: number, y: number, width: number, height: number): void {
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.style.width = `${Math.max(0, width)}px`;
  el.style.height = `${Math.max(0, height)}px`;
}
