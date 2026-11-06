import type { Point } from './geometry';

/** Logical screen size. Everything in the game is laid out in this coordinate space. */
export const WIDTH = 1024;
export const HEIGHT = 768;

/**
 * The fixed-size game screen: a canvas for the game itself and a DOM overlay
 * for dialogs, both scaled together to fit the browser window.
 */
export interface Stage {
  canvas: HTMLCanvasElement;
  /** Layer above the overlay for on-screen controls. */
  controls: HTMLElement;
  /** Shows exactly these DOM layers above the canvas, the last one on top. */
  showLayers: (layers: readonly HTMLElement[]) => void;
  /** Resets the transform so that drawing uses logical coordinates. */
  beginFrame: () => CanvasRenderingContext2D;
  /** Converts a client (viewport) position to logical screen coordinates. */
  toLogical: (clientX: number, clientY: number) => Point;
}

/** `onResize` runs after the canvas was resized, which clears it. */
export function createStage(container: HTMLElement, { onResize }: { onResize: () => void }): Stage {
  const root = document.createElement('div');
  root.className = 'stage';
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not supported');
  const overlay = document.createElement('div');
  overlay.className = 'stage-overlay';
  const controls = document.createElement('div');
  controls.className = 'stage-controls';
  root.append(canvas, overlay, controls);
  container.append(root);

  let pixelRatio = 1;
  /** Where the screen is in the viewport. */
  let viewport = { left: 0, top: 0, scale: 1 };

  function resize(): void {
    const scale = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
    root.style.transform = `translate(-50%, -50%) scale(${scale})`;
    viewport = {
      left: (window.innerWidth - WIDTH * scale) / 2,
      top: (window.innerHeight - HEIGHT * scale) / 2,
      scale,
    };
    // More than 2 device pixels per logical pixel is not visible but costs fill rate.
    pixelRatio = scale * Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(WIDTH * pixelRatio);
    canvas.height = Math.round(HEIGHT * pixelRatio);
  }

  resize();
  window.addEventListener('resize', () => {
    resize();
    onResize();
  });

  return {
    canvas,
    controls,
    showLayers(layers) {
      const current = [...overlay.children];
      const unchanged = current.length === layers.length && current.every((c, i) => c === layers[i]);
      if (!unchanged) overlay.replaceChildren(...layers);
      // Covered layers can neither be clicked nor keep focus.
      layers.forEach((layer, i) => {
        layer.inert = i < layers.length - 1;
      });
    },
    beginFrame() {
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      return ctx;
    },
    toLogical(clientX, clientY) {
      const { left, top, scale } = viewport;
      return { x: (clientX - left) / scale, y: (clientY - top) / scale };
    },
  };
}
