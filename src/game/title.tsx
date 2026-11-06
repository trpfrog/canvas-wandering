import { FONT_TITLE, img, type ImageKey } from '../engine/assets';
import { fillTextCentered } from '../engine/draw';
import { pick } from '../engine/random';
import type { Scene } from '../engine/scene';
import { HEIGHT, WIDTH } from '../engine/stage';
import { every } from '../engine/timing';
import { scenes } from './scenes';
import { createSpaceScene } from './space/space';
import { Button, mount } from './ui/dom';
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
    element: mount(
      <div class="main-menu-buttons">
        <Button onClick={() => scenes.push(createSpaceScene())}>START</Button>
        <Button onClick={() => scenes.push(createSettingsMenu())}>SETTINGS</Button>
        <Button onClick={() => scenes.push(createMedalCollection())}>MEDALS</Button>
        <Button onClick={() => scenes.reset(createQuitScreen())}>QUIT</Button>
      </div>,
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
  return {
    opaque: true,
    bgm: 'silence',
    element: mount(
      <div class="quit-screen" onClick={() => scenes.reset(createMainMenu())}>
        <div class="title-font">Thank you for playing!</div>
        <div class="quit-hint">Click to return to the title</div>
      </div>,
    ),
  };
}
