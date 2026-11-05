/** Logical screen size. Everything in the game is laid out in this coordinate space. */
export const WIDTH = 1024;
export const HEIGHT = 768;

export interface Point {
  x: number;
  y: number;
}

/**
 * The fixed-size game screen: a canvas for the game itself and a DOM overlay
 * for dialogs, both scaled together to fit the browser window.
 */
export class Stage {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly overlay: HTMLElement;
  private pixelRatio = 1;
  /** Where the screen is in the viewport, kept up to date on resize. */
  private viewport = { left: 0, top: 0, scale: 1 };

  /** @param onResize called after the canvas was resized (which clears it) */
  constructor(
    container: HTMLElement,
    private readonly onResize: () => void = () => {},
  ) {
    this.root = document.createElement('div');
    this.root.className = 'stage';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'stage-canvas';
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not supported');
    this.ctx = ctx;

    this.overlay = document.createElement('div');
    this.overlay.className = 'stage-overlay';

    this.root.append(this.canvas, this.overlay);
    container.append(this.root);

    this.resize();
    window.addEventListener('resize', () => {
      this.resize();
      this.onResize();
    });
  }

  private resize(): void {
    const scale = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
    this.root.style.transform = `translate(-50%, -50%) scale(${scale})`;
    this.viewport = {
      left: (window.innerWidth - WIDTH * scale) / 2,
      top: (window.innerHeight - HEIGHT * scale) / 2,
      scale,
    };
    // More than 2 device pixels per logical pixel is not visible but costs fill rate.
    this.pixelRatio = scale * Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(WIDTH * this.pixelRatio);
    this.canvas.height = Math.round(HEIGHT * this.pixelRatio);
  }

  /**
   * Shows exactly these DOM layers above the canvas, the last one on top.
   * Covered layers are made inert, so they can neither be clicked nor keep focus.
   */
  showLayers(layers: readonly HTMLElement[]): void {
    const current = [...this.overlay.children];
    const unchanged = current.length === layers.length && current.every((c, i) => c === layers[i]);
    if (!unchanged) this.overlay.replaceChildren(...layers);
    layers.forEach((layer, i) => {
      layer.inert = i < layers.length - 1;
    });
  }

  /** Resets the transform so that drawing uses logical coordinates. */
  beginFrame(): CanvasRenderingContext2D {
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    return this.ctx;
  }

  /** Converts a client (viewport) position to logical screen coordinates. */
  toLogical(clientX: number, clientY: number): Point {
    const { left, top, scale } = this.viewport;
    return { x: (clientX - left) / scale, y: (clientY - top) / scale };
  }
}
