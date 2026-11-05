import type { BgmId } from './audio';
import type { Point } from './stage';

/** Fixed simulation step in milliseconds. */
export const TICK_MS = 10;

export interface PointerInput extends Point {
  button: number;
}

/**
 * A screen of the game. Scenes live on a stack managed by {@link SceneStack}.
 * Only the top scene is updated and receives input; every visible scene is rendered.
 */
export interface Scene {
  /** Identifies well-known scenes (e.g. to pop back to them) without importing their classes. */
  readonly tag?: 'main-menu' | 'space' | 'pause';
  /** Opaque scenes hide everything below them. */
  readonly opaque: boolean;
  /** Background music while this scene is the topmost one that has a say in it. */
  readonly bgm?: BgmId | null;
  /** Optional DOM layer shown above the canvas while the scene is visible. */
  readonly element?: HTMLElement;

  /** Advances the simulation by one fixed step. Called only while the scene is on top. */
  update?(dt: number): void;
  /** Draws the scene onto the canvas. Must not change the game state. */
  render?(ctx: CanvasRenderingContext2D): void;

  /** Called when the scene becomes the top of the stack. */
  resume?(popped: Scene | null): void;
  /** Called when another scene covers this one or this one is removed. */
  suspend?(): void;
  /** Called after the scene was removed from the stack for good. */
  dispose?(): void;

  keyDown?(e: KeyboardEvent): void;
  keyUp?(e: KeyboardEvent): void;
  pointerDown?(p: PointerInput): void;
  pointerUp?(p: PointerInput): void;
  pointerMove?(p: Point): void;
  click?(p: PointerInput): void;
  wheel?(deltaY: number): void;
}

export interface SceneStackHooks {
  /** Called whenever the stack changes, with the visible scenes and the music that should play. */
  onChange(visible: readonly Scene[], bgm: BgmId | null): void;
  /** Called when the last scene has been popped. */
  onEmpty(): void;
}

export class SceneStack {
  private readonly stack: Scene[] = [];

  constructor(private readonly hooks: SceneStackHooks) {}

  top(): Scene | undefined {
    return this.stack.at(-1);
  }

  /** Pushes a scene, plus scenes stacked on top of it (e.g. a start dialog). */
  push(scene: Scene, ...above: Scene[]): void {
    this.top()?.suspend?.();
    this.stack.push(scene, ...above);
    this.top()?.resume?.(null);
    this.changed();
  }

  pop(): Scene | undefined {
    const popped = this.stack.pop();
    if (!popped) return undefined;
    popped.suspend?.();
    popped.dispose?.();
    this.top()?.resume?.(popped);
    this.changed();
    if (this.stack.length === 0) this.hooks.onEmpty();
    return popped;
  }

  /** Removes every scene and starts over with the given one. */
  reset(scene: Scene): void {
    for (const s of this.stack.splice(0).toReversed()) {
      s.suspend?.();
      s.dispose?.();
    }
    this.push(scene);
  }

  /** Pops scenes until the predicate holds for the top scene. */
  popUntil(predicate: (scene: Scene) => boolean): void {
    for (let top = this.top(); top !== undefined && !predicate(top); top = this.top()) {
      this.pop();
    }
  }

  /** Pops scenes until the given scene itself has been popped. */
  popThrough(scene: Scene): void {
    if (!this.stack.includes(scene)) return;
    while (this.pop() !== scene) {
      /* keep popping */
    }
  }

  /** Scenes to draw, bottom first: the topmost opaque scene and everything above it. */
  visibleScenes(): Scene[] {
    const start = this.stack.findLastIndex((scene) => scene.opaque);
    return this.stack.slice(Math.max(start, 0));
  }

  update(dt: number): void {
    this.top()?.update?.(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const scene of this.visibleScenes()) {
      ctx.save();
      scene.render?.(ctx);
      ctx.restore();
    }
  }

  /** The topmost scene that is opaque or has its own BGM decides the music. */
  bgm(): BgmId | null {
    return this.stack.findLast((scene) => scene.opaque || scene.bgm !== undefined)?.bgm ?? null;
  }

  private changed(): void {
    this.hooks.onChange(this.visibleScenes(), this.bgm());
  }
}
