import './styles.css';
import * as audio from './engine/audio';
import { bindInput } from './engine/input';
import { TICK_MS } from './engine/scene';
import { createStage } from './engine/stage';
import { isTouchScreen, showTouchControls } from './engine/touch-controls';
import { createBootScreen } from './game/boot';
import { scenes } from './game/scenes';

/*
    　　_＿
　 / )))　　　＿
`／ イ~　　　(((ヽ
(　 ﾉ　　　　 ￣Ｙ＼
|　(＼　∧＿∧　｜　)
ヽ　ヽ`(´･ω･)／ノ/
　＼ |　⌒Ｙ⌒　/ /
　 ｜ヽ　 ｜　 ﾉ／
　　＼トー仝ーイ
　　 ｜ ミ土彡/
　　　)　　　｜
　　 /　　_　 ＼
　　/　 ／ ＼　 ヽ
　 /　 /　　 ヽ　|

    Respect to the macho from trpfrog/medipro-game#231.
 */

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('#app is missing');

// Lets the CSS size the UI for fingers.
if (isTouchScreen()) document.documentElement.dataset.input = 'touch';

const stage = createStage(container, { onResize: scenes.invalidate });
scenes.onChange((visible, bgm) => {
  stage.showLayers(visible.flatMap((scene) => scene.element ?? []));
  showTouchControls(stage.controls, visible.at(-1));
  audio.playBgm(bgm);
});
bindInput(stage, scenes);
scenes.push(createBootScreen());

/** Longest time simulated per frame, so a backgrounded tab does not fast-forward. */
const MAX_FRAME_MS = 250;
let last = performance.now();
let accumulator = 0;

function frame(now: number): void {
  accumulator += Math.min(now - last, MAX_FRAME_MS);
  last = now;
  while (accumulator >= TICK_MS) {
    scenes.update(TICK_MS);
    accumulator -= TICK_MS;
  }
  scenes.render(stage.beginFrame());
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Expose the scene stack on the dev server for debugging; stripped from production builds.
if (import.meta.env.DEV) Object.assign(window, { debug: { scenes } });
