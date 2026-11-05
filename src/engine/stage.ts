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

  constructor(container: HTMLElement) {
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
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const scale = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
    this.root.style.transform = `translate(-50%, -50%) scale(${scale})`;
    this.pixelRatio = scale * (window.devicePixelRatio || 1);
    this.canvas.width = Math.round(WIDTH * this.pixelRatio);
    this.canvas.height = Math.round(HEIGHT * this.pixelRatio);
  }

  /** Shows exactly these DOM layers above the canvas, the last one on top. */
  showLayers(layers: readonly HTMLElement[]): void {
    const current = [...this.overlay.children];
    const unchanged = current.length === layers.length && current.every((c, i) => c === layers[i]);
    if (!unchanged) this.overlay.replaceChildren(...layers);
  }

  /** Resets the transform so that drawing uses logical coordinates. */
  beginFrame(): CanvasRenderingContext2D {
    const ctx = this.ctx;
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    return ctx;
  }

  /** Converts a client (viewport) position to logical screen coordinates. */
  toLogical(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * WIDTH,
      y: ((clientY - rect.top) / rect.height) * HEIGHT,
    };
  }
}
