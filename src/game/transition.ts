import type { Scene } from '../engine/scene';
import { HEIGHT, WIDTH } from '../engine/stage';
import { scenes } from './scenes';
import { h } from './ui/dom';

/** The hole opens or closes by 12 px of width every 10 ms (6 px on each side). */
const OPEN_PER_MS = 12 / WIDTH / 10;
/** How long the screen stays fully black before the next scene appears. */
const BLACK_HOLD_MS = 200;

/**
 * A rectangular "peephole" drawn with a DOM element, so that it also covers dialogs.
 * `open` is how far the hole is open, from 0 (black) to 1 (full screen).
 */
function createPeephole(open: number): { element: HTMLElement; setOpen: (open: number) => void } {
  const hole = h('div', { class: 'transition-hole' });
  const setOpen = (fraction: number) => {
    const width = WIDTH * fraction;
    const height = HEIGHT * fraction;
    Object.assign(hole.style, {
      left: `${(WIDTH - width) / 2}px`,
      top: `${(HEIGHT - height) / 2}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
  };
  setOpen(open);
  return { element: h('div', { class: 'transition' }, hole), setOpen };
}

/** Closes the screen to the center, pushes the scenes from `next` (bottom first), and opens again. */
export function transitionTo(next: () => [Scene, ...Scene[]]): Scene {
  const peephole = createPeephole(1);
  let open = 1;
  let blackMs = 0;
  return {
    opaque: false,
    element: peephole.element,
    update(dt) {
      open = Math.max(0, open - OPEN_PER_MS * dt);
      if (open > 0) return;
      blackMs += dt;
      if (blackMs < BLACK_HOLD_MS) return;
      scenes.pop();
      scenes.push(...next());
      scenes.push(openingTransition());
    },
    render: () => peephole.setOpen(open),
  };
}

function openingTransition(): Scene {
  const peephole = createPeephole(0);
  let open = 0;
  return {
    opaque: false,
    element: peephole.element,
    update(dt) {
      open = Math.min(1, open + OPEN_PER_MS * dt);
      if (open === 1) scenes.pop();
    },
    render: () => peephole.setOpen(open),
  };
}
