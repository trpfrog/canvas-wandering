import { render, type JSX } from 'preact';
import type { Scene } from '../engine/scene';
import { HEIGHT, WIDTH } from '../engine/stage';
import { scenes } from './scenes';
import { mount } from './ui/dom';

/** The hole opens or closes by 12 px of width every 10 ms (6 px on each side). */
const OPEN_PER_MS = 12 / WIDTH / 10;
/** How long the screen stays fully black before the next scene appears. */
const BLACK_HOLD_MS = 200;

/**
 * A rectangular "peephole" drawn with a DOM element, so that it also covers dialogs.
 * `open` is how far the hole is open, from 0 (black) to 1 (full screen).
 */
function Peephole({ open }: { open: number }): JSX.Element {
  const width = WIDTH * open;
  const height = HEIGHT * open;
  return (
    <div class="transition">
      <div class="transition-hole" style={{ left: (WIDTH - width) / 2, top: (HEIGHT - height) / 2, width, height }} />
    </div>
  );
}

function createPeephole(open: number): { element: HTMLElement; setOpen: (open: number) => void } {
  const element = mount(<Peephole open={open} />);
  return { element, setOpen: (fraction) => render(<Peephole open={fraction} />, element) };
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
      scenes.replaceTop(...next(), openingTransition());
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
