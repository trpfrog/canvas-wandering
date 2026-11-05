import { FONT_TITLE, img, type ImageKey } from '../engine/assets';
import { fillTextCentered } from '../engine/draw';
import { pick } from '../engine/random';
import type { Scene } from '../engine/scene';
import { HEIGHT, WIDTH } from '../engine/stage';
import { every } from '../engine/timing';
import { scenes } from './scenes';
import { createSpaceScene } from './space/space';
import { button, h } from './ui/dom';
import { createMedalCollection } from './ui/medal-dialogs';
import { createSettingsMenu } from './ui/menus';

const BACKGROUNDS: readonly [ImageKey, ...ImageKey[]] = [
  'menu/background-1',
  'menu/background-2',
  'menu/background-3',
  'menu/background-4',
];
const STAR_IMAGES: readonly [ImageKey, ...ImageKey[]] = ['space/star-bright', 'space/star-dark'];
const TITLE = 'Space Wandering!!';

/** A star blinking at a random place in the upper half. */
const randomTwinkle = () => ({
  x: Math.random() * WIDTH,
  y: Math.random() * (HEIGHT / 2),
  image: pick(STAR_IMAGES),
});

export function createMainMenu(): Scene {
  const background = pick(BACKGROUNDS);
  /** The background slowly zooms in, 1 px every 50 ms. */
  let zoom = 0;
  let twinkle = randomTwinkle();
  const twinkleTick = every(50, () => {
    twinkle = randomTwinkle();
  });

  return {
    tag: 'main-menu',
    opaque: true,
    bgm: 'menu',
    element: h(
      'div',
      {},
      h(
        'div',
        { class: 'main-menu-buttons' },
        button('START', () => scenes.push(createSpaceScene())),
        button('SETTINGS', () => scenes.push(createSettingsMenu())),
        button('MEDALS', () => scenes.push(createMedalCollection())),
        button('QUIT', () => scenes.reset(createQuitScreen())),
      ),
    ),
    update(dt) {
      zoom += dt / 50;
      twinkleTick(dt);
    },
    render(ctx) {
      const z = Math.floor(zoom);
      ctx.drawImage(img(background), 0, 0, WIDTH + z, HEIGHT + z);

      const fontSize = 50;
      ctx.fillStyle = 'rgba(0,0,0,0.71)';
      ctx.fillRect(0, 100 - fontSize / 2 + 10, WIDTH, 200);

      ctx.drawImage(img(twinkle.image), twinkle.x, twinkle.y, 35, 35);

      ctx.font = `${fontSize}px ${FONT_TITLE}`;
      ctx.fillStyle = '#fff';
      fillTextCentered(ctx, TITLE, WIDTH / 2, 200);
    },
  };
}

/** Shown after QUIT, since a web page cannot close itself. */
function createQuitScreen(): Scene {
  const element = h(
    'div',
    { class: 'quit-screen' },
    h('div', { class: 'title-font', text: 'Thank you for playing!' }),
    h('div', { class: 'quit-hint', text: 'Click to return to the title' }),
  );
  element.addEventListener('click', () => scenes.reset(createMainMenu()));
  return { opaque: true, bgm: 'silence', element };
}
