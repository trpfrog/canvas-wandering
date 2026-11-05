import { FONT_TITLE, img, type ImageKey } from '../engine/assets';
import { pick } from '../engine/random';
import type { Scene } from '../engine/scene';
import { HEIGHT, WIDTH } from '../engine/stage';
import { scenes } from './context';
import { SpaceScene } from './space/space-scene';
import { button, h } from './ui/dom';
import { createMedalCollectionDialog, createSettingsDialog } from './ui/dialogs';

const BACKGROUNDS: readonly [ImageKey, ...ImageKey[]] = [
  'menu/background-1',
  'menu/background-2',
  'menu/background-3',
  'menu/background-4',
];
const STAR_IMAGES: readonly [ImageKey, ...ImageKey[]] = ['space/star-bright', 'space/star-dark'];
const TITLE = 'Space Wandering!!';

export class MainMenuScene implements Scene {
  readonly tag = 'main-menu';
  readonly opaque = true;
  readonly bgm = 'menu';
  readonly element: HTMLElement;

  private readonly background = pick(BACKGROUNDS);
  /** The background slowly zooms in (1 px every 50 ms, as in the original). */
  private zoom = 0;
  private twinkle = { x: 0, y: 0, image: STAR_IMAGES[0], elapsed: 0 };
  private readonly start: HTMLButtonElement;
  private readonly quit: HTMLButtonElement;

  constructor() {
    this.start = button('START', () => scenes().push(new SpaceScene()));
    this.quit = button('QUIT', () => scenes().pop());
    this.element = h(
      'div',
      { class: 'main-menu' },
      this.start,
      button('SETTINGS', () => scenes().push(createSettingsDialog())),
      button('MEDALS', () => scenes().push(createMedalCollectionDialog())),
      this.quit,
    );
    this.moveTwinkle();
  }

  private moveTwinkle(): void {
    this.twinkle.x = Math.random() * WIDTH;
    this.twinkle.y = Math.random() * (HEIGHT / 2);
    this.twinkle.image = pick(STAR_IMAGES);
  }

  update(dt: number): void {
    this.zoom += dt / 50;
    this.twinkle.elapsed += dt;
    if (this.twinkle.elapsed >= 50) {
      this.twinkle.elapsed = 0;
      this.moveTwinkle();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const z = Math.floor(this.zoom);
    ctx.drawImage(img(this.background), 0, 0, WIDTH + z, HEIGHT + z);

    const fontSize = 50;
    ctx.fillStyle = 'rgba(0,0,0,0.71)';
    ctx.fillRect(0, 100 - fontSize / 2 + 10, WIDTH, 200);

    ctx.drawImage(img(this.twinkle.image), this.twinkle.x, this.twinkle.y, 35, 35);

    ctx.font = `${fontSize}px ${FONT_TITLE}`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(TITLE, WIDTH / 2, 200);
  }

  resume(): void {
    this.start.disabled = false;
    this.quit.disabled = false;
  }

  suspend(): void {
    this.start.disabled = true;
    this.quit.disabled = true;
  }
}

/** Shown after QUIT, since a web page cannot close itself. */
export class QuitScene implements Scene {
  readonly opaque = true;
  readonly bgm = null;
  readonly element = h(
    'div',
    { class: 'quit-screen' },
    h('div', { class: 'title-font', text: 'Thank you for playing!' }),
    h('div', { class: 'quit-hint', text: 'Click to return to the title' }),
  );

  constructor() {
    this.element.addEventListener('click', () => scenes().reset(new MainMenuScene()));
  }
}
