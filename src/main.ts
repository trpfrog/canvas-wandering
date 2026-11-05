import './styles.css';
import { audio } from './engine/audio';
import { bindInput } from './engine/input';
import { SceneStack, TICK_MS } from './engine/scene';
import { Stage } from './engine/stage';
import { BootScene } from './game/boot-scene';
import { setSceneStack } from './game/context';
import { QuitScene } from './game/main-menu';

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

const stage = new Stage(container);
const stack: SceneStack = new SceneStack({
  onChange(visible, bgm) {
    stage.showLayers(visible.flatMap((scene) => scene.element ?? []));
    audio.playBgm(bgm);
  },
  onEmpty: () => stack.push(new QuitScene()),
});
setSceneStack(stack);
bindInput(stage, stack);
stack.push(new BootScene());

/** Longest time simulated per frame, so a backgrounded tab does not fast-forward. */
const MAX_FRAME_MS = 250;
let last = performance.now();
let accumulator = 0;

function frame(now: number): void {
  accumulator += Math.min(now - last, MAX_FRAME_MS);
  last = now;
  while (accumulator >= TICK_MS) {
    stack.update(TICK_MS);
    accumulator -= TICK_MS;
  }
  stack.render(stage.beginFrame());
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Expose the scene stack on the dev server for debugging; stripped from production builds.
if (import.meta.env.DEV) Object.assign(window, { debug: { stack } });
