import type { Music } from './audio';
import type { Point } from './geometry';

/** Fixed simulation step in milliseconds. */
export const TICK_MS = 10;

/**
 * A screen of the game. Scenes live on a {@link SceneStack}: only the top scene is
 * updated and receives input, and every visible scene is rendered.
 */
export interface Scene {
  /** Names a scene so that the player can be sent back to it. */
  tag?: string;
  /** Opaque scenes hide everything below them. */
  opaque: boolean;
  /** Music while this scene is the topmost one that has a say in it. */
  bgm?: Music;
  /** DOM layer shown above the canvas while the scene is visible. */
  element?: HTMLElement;

  /** Advances the simulation by one fixed step. Scenes without it are static and not redrawn. */
  update?: (dt: number) => void;
  /** Draws the scene onto the canvas. Must not change the game state. */
  render?: (ctx: CanvasRenderingContext2D) => void;

  /** Called when the scene becomes the top of the stack; its element is already on the page. */
  resume?: () => void;
  /** Called when another scene covers this one or this one is removed. */
  suspend?: () => void;
  /** Called after the scene was removed from the stack for good. */
  dispose?: () => void;

  /** On-screen buttons for the keys this scene needs, shown on touch screens. */
  touchControls?: TouchControls;

  /** The scene pushed when the player presses Escape, if this scene can be paused. */
  pauseMenu?: () => Scene;

  keyDown?: (e: KeyboardEvent) => void;
  keyUp?: (e: KeyboardEvent) => void;
  pointerDown?: (p: Point) => void;
  pointerUp?: (p: Point) => void;
  pointerMove?: (p: Point) => void;
  click?: (p: Point) => void;
  wheel?: (deltaY: number) => void;
}

/** An on-screen button that holds down a keyboard key while it is touched. */
export interface TouchKey {
  /** `KeyboardEvent.code` of the key. */
  code: string;
  label: string;
}

/** Button groups in the lower corners; `bottom` lifts them above HUD elements (logical px). */
export interface TouchControls {
  left?: readonly TouchKey[];
  right?: readonly TouchKey[];
  bottom?: number;
}

/** Called whenever the stack changes, with the visible scenes and the music that should play. */
export type SceneStackListener = (visible: readonly Scene[], bgm: Music) => void;

export interface SceneStack {
  top: () => Scene | undefined;
  has: (predicate: (scene: Scene) => boolean) => boolean;
  /** Pushes a scene, plus scenes stacked on top of it (e.g. a start dialog). */
  push: (scene: Scene, ...above: Scene[]) => void;
  pop: () => void;
  /** Replaces the top scene; the scene below is not resumed in between. */
  replaceTop: (scene: Scene, ...above: Scene[]) => void;
  /** Pops `scene` if it is on top; does nothing otherwise. */
  remove: (scene: Scene) => void;
  /** Removes every scene and starts over with the given one. */
  reset: (scene: Scene) => void;
  /** Pops scenes until the predicate holds for the top scene, resuming only that one. */
  popUntil: (predicate: (scene: Scene) => boolean) => void;
  /** Scenes to draw, bottom first: the topmost opaque scene and everything above it. */
  visibleScenes: () => Scene[];
  update: (dt: number) => void;
  /** Draws the visible scenes, or keeps the previous frame while nothing can have changed. */
  render: (ctx: CanvasRenderingContext2D) => void;
  /** Forces the next render to draw, e.g. after the canvas was resized. */
  invalidate: () => void;
  onChange: (listener: SceneStackListener) => void;
}

export function createSceneStack(): SceneStack {
  const stack: Scene[] = [];
  const listeners: SceneStackListener[] = [];
  /** Whether the canvas must be redrawn even though the top scene is not animating. */
  let dirty = true;

  const top = () => stack.at(-1);
  const visibleScenes = () =>
    stack.slice(
      Math.max(
        stack.findLastIndex((scene) => scene.opaque),
        0,
      ),
    );
  /** The topmost scene that is opaque or has its own music decides the music. */
  const bgm = (): Music => stack.findLast((scene) => scene.opaque || scene.bgm !== undefined)?.bgm ?? 'silence';

  function changed(): void {
    dirty = true;
    for (const listener of listeners) listener(visibleScenes(), bgm());
  }

  /** Disposes of the top `n` scenes; only the top one is active and needs suspending. */
  function discard(n: number): void {
    top()?.suspend?.();
    for (const scene of stack.splice(-n).toReversed()) scene.dispose?.();
  }

  /** Announces the new stack and resumes its top. */
  function settle(): void {
    changed();
    top()?.resume?.();
  }

  function push(scene: Scene, ...above: Scene[]): void {
    top()?.suspend?.();
    stack.push(scene, ...above);
    settle();
  }

  return {
    top,
    has: (predicate) => stack.some(predicate),
    push,
    pop() {
      if (stack.length === 0) return;
      discard(1);
      settle();
    },
    replaceTop(scene, ...above) {
      if (stack.length > 0) discard(1);
      stack.push(scene, ...above);
      settle();
    },
    remove(scene) {
      if (top() !== scene) return;
      discard(1);
      settle();
    },
    reset(scene) {
      if (stack.length > 0) discard(stack.length);
      stack.push(scene);
      settle();
    },
    popUntil(predicate) {
      const keep = stack.findLastIndex(predicate) + 1;
      if (keep === stack.length) return;
      discard(stack.length - keep);
      settle();
    },
    visibleScenes,
    update: (dt) => top()?.update?.(dt),
    render(ctx) {
      // Only the top scene changes over time, so a static top (e.g. a dialog) keeps the last frame.
      if (!dirty && top()?.update === undefined) return;
      dirty = false;
      for (const scene of visibleScenes()) {
        ctx.save();
        scene.render?.(ctx);
        ctx.restore();
      }
    },
    invalidate() {
      dirty = true;
    },
    onChange(listener) {
      listeners.push(listener);
    },
  };
}
