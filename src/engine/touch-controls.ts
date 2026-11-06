import type { Scene, TouchKey } from './scene';

/** Whether the main input is a finger rather than a mouse. */
export const isTouchScreen = (): boolean => matchMedia('(pointer: coarse)').matches;

const pressKey = (type: 'keydown' | 'keyup', code: string): boolean =>
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));

/** Releases every key held by an on-screen button. */
const releaseAll = new Set<() => void>();

/** A button that holds `code` down for as long as it is touched. */
function keyButton({ code, label }: TouchKey): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'touch-key';
  el.textContent = label;
  let held = false;
  const release = () => {
    if (!held) return;
    held = false;
    el.classList.remove('pressed');
    pressKey('keyup', code);
  };
  releaseAll.add(release);
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    held = true;
    el.classList.add('pressed');
    pressKey('keydown', code);
    // Keep receiving this finger's events even if it slides off the button.
    if (el.isConnected) el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('lostpointercapture', release);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  return el;
}

function group(side: 'left' | 'right', keys: readonly TouchKey[], bottom: number): HTMLElement {
  const el = document.createElement('div');
  el.className = `touch-group ${side}`;
  el.style.bottom = `${bottom}px`;
  el.append(...keys.map(keyButton));
  return el;
}

/**
 * Shows the top scene's on-screen keys, plus a pause button for pausable scenes,
 * in `container`. They are hidden by CSS unless the device has a touch screen.
 */
export function showTouchControls(container: HTMLElement, scene: Scene | undefined): void {
  // Buttons about to be removed get no more pointer events, so let go of their keys now.
  for (const release of releaseAll) release();
  releaseAll.clear();
  const children: HTMLElement[] = [];
  if (scene?.pauseMenu) children.push(keyButton({ code: 'Escape', label: 'Ⅱ' }));
  children.at(-1)?.classList.add('touch-pause');
  const { left = [], right = [], bottom = 24 } = scene?.touchControls ?? {};
  if (left.length > 0) children.push(group('left', left, bottom));
  if (right.length > 0) children.push(group('right', right, bottom));
  container.replaceChildren(...children);
}
