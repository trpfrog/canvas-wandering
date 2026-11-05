import type { Point } from './geometry';
import type { SceneStack } from './scene';
import type { Stage } from './stage';

/** Keys whose default browser action (scrolling) must not happen during the game. */
const BLOCKED_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/** Global input state, readable from anywhere in the game. */
export const input: { keys: Set<string>; pointer: Point; pointerDown: boolean } = {
  keys: new Set(),
  pointer: { x: 0, y: 0 },
  pointerDown: false,
};

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement && target.type !== 'range';
}

/** Routes browser events to the top scene, and opens its pause menu on Escape. */
export function bindInput(stage: Stage, scenes: SceneStack): void {
  window.addEventListener('keydown', (e) => {
    if (BLOCKED_KEYS.has(e.code) && !isTextField(e.target)) e.preventDefault();
    input.keys.add(e.code);
    const top = scenes.top();
    if (e.code === 'Escape' && !e.repeat && top?.pauseMenu) scenes.push(top.pauseMenu());
    else top?.keyDown?.(e);
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    scenes.top()?.keyUp?.(e);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.pointerDown = false;
  });

  const canvas = stage.canvas;
  const toPointer = (e: MouseEvent) => stage.toLogical(e.clientX, e.clientY);

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = toPointer(e);
    input.pointer = p;
    input.pointerDown = true;
    scenes.top()?.pointerDown?.(p);
  });
  canvas.addEventListener('pointerup', (e) => {
    const p = toPointer(e);
    input.pointer = p;
    input.pointerDown = false;
    scenes.top()?.pointerUp?.(p);
  });
  canvas.addEventListener('pointercancel', () => {
    input.pointerDown = false;
  });
  window.addEventListener('pointermove', (e) => {
    const p = toPointer(e);
    input.pointer = p;
    if (e.target === canvas || canvas.hasPointerCapture(e.pointerId)) scenes.top()?.pointerMove?.(p);
  });
  canvas.addEventListener('click', (e) => scenes.top()?.click?.(toPointer(e)));
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      scenes.top()?.wheel?.(e.deltaY);
    },
    { passive: false },
  );
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
