import { FONT_TITLE, img, type ImageKey } from '../engine/assets';
import { fillTextCentered } from '../engine/draw';
import { pick } from '../engine/random';
import type { Scene } from '../engine/scene';
import { HEIGHT, WIDTH } from '../engine/stage';
import { SceneTag, scenes } from './context';
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
  readonly tag = SceneTag.mainMenu;
  readonly opaque = true;
  readonly bgm = 'menu';
  readonly element = h(
    'div',
    {},
    h(
      'div',
      { class: 'main-menu-buttons' },
      button('START', () => scenes().push(new SpaceScene())),
      button('SETTINGS', () => scenes().push(createSettingsDialog())),
      button('MEDALS', () => scenes().push(createMedalCollectionDialog())),
      button('QUIT', () => scenes().pop()),
    ),
  );

  private readonly background = pick(BACKGROUNDS);
  /** The background slowly zooms in (1 px every 50 ms, as in the original). */
  private zoom = 0;
  /** A star that blinks at a random place in the upper half every 50 ms. */
  private twinkle = randomTwinkle();
  private twinkleMs = 0;

  update(dt: number): void {
    this.zoom += dt / 50;
    this.twinkleMs += dt;
    if (this.twinkleMs >= 50) {
      this.twinkleMs = 0;
      this.twinkle = randomTwinkle();
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
    fillTextCentered(ctx, TITLE, WIDTH / 2, 200);
  }
}

const randomTwinkle = () => ({
  x: Math.random() * WIDTH,
  y: Math.random() * (HEIGHT / 2),
  image: pick(STAR_IMAGES),
});

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
