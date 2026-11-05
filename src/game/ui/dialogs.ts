import type { ImageKey } from '../../engine/assets';
import { audio } from '../../engine/audio';
import { pad2 } from '../../engine/draw';
import { hasTag, SceneTag, scenes } from '../context';
import { player, type MedalDef } from '../medals';
import { DialogScene } from './dialog';
import { button, h, image } from './dom';

export function backToMainMenu(): void {
  scenes().popUntil(hasTag(SceneTag.mainMenu));
}

export function backToSpace(): void {
  scenes().popUntil(hasTag(SceneTag.space));
}

const close = (): void => {
  scenes().pop();
};

/** The pause menu for the scene currently on top. */
export function createPauseDialog(): DialogScene {
  const pausingSpace = scenes().top()?.tag === SceneTag.space;
  return new DialogScene(
    [
      h('div', { class: 'title-font dialog-title', text: 'Pause' }),
      h(
        'div',
        { class: 'button-list' },
        button('Resume', close),
        button('Settings', () => scenes().push(createSettingsDialog())),
        button('Back to Main Menu', backToMainMenu),
        !pausingSpace && button('Back to Space', backToSpace),
      ),
    ],
    { kind: 'menu', width: 300, height: 200, panelClass: 'pause-panel' },
  );
}

function volumeSlider(label: string, value: number, onChange: (v: number) => void): HTMLElement {
  const slider = h('input', { attrs: { type: 'range', min: '0', max: '100', step: '1' } });
  slider.value = String(Math.round(value * 100));
  slider.addEventListener('input', () => onChange(Number(slider.value) / 100));
  return h('label', { class: 'volume-row' }, h('span', { text: label }), slider);
}

export function createSettingsDialog(): DialogScene {
  const volume = audio.getVolume();
  return new DialogScene(
    [
      h('div', { class: 'title-font dialog-title settings-title', text: 'Settings' }),
      h(
        'fieldset',
        { class: 'volume-settings' },
        h('legend', { text: 'Volume' }),
        volumeSlider('BGM', volume.bgm, (bgm) => audio.setVolume({ bgm })),
        volumeSlider('SE', volume.se, (se) => audio.setVolume({ se })),
      ),
    ],
    { kind: 'menu', width: 500, height: 400, panelClass: 'light-panel' },
  );
}

function formatDate(date: Date): [string, string] {
  return [
    `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`,
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`,
  ];
}

export function createMedalCollectionDialog(): DialogScene {
  const medals = player.list();
  const body =
    medals.length > 0
      ? h(
          'ul',
          { class: 'medal-list' },
          ...medals.map(({ medal, acquiredAt }) =>
            h(
              'li',
              {},
              image(medal.image),
              h('span', { class: 'medal-title', text: medal.title }),
              h('span', { class: 'medal-date' }, ...withLineBreaks(formatDate(acquiredAt))),
            ),
          ),
        )
      : h('div', { class: 'no-medals', text: 'You have no medals yet.' });

  return new DialogScene(
    [h('div', { class: 'title-font medals-title', text: 'Medal Collections' }), body, button('Close', close)],
    { kind: 'menu', width: 500, height: 400, panelClass: 'light-panel medals-panel' },
  );
}

/** Shows the "You got a medal!" dialog unless the player already has the medal. */
export function pushMedalWindow(medal: MedalDef): boolean {
  if (player.has(medal)) return false;
  const dialog = new DialogScene(
    [
      h('div', { class: 'medal-get-title', text: 'You got a medal!' }),
      h('div', { class: 'medal-get-visual' }, h('div', { class: 'medal-rays' }), image(medal.image)),
      h('div', { class: 'medal-get-name', text: medal.title }),
      button('I got it', close),
    ],
    {
      kind: 'notice',
      width: 300,
      height: 300,
      panelClass: 'medal-get-panel',
      onResume: () => {
        audio.playSe('achievement');
        player.register(medal);
      },
    },
  );
  scenes().push(dialog);
  return true;
}

export function createGameOverDialog(title: string, score: number, background: string): DialogScene {
  return new DialogScene(
    [
      h('div', { class: 'gameover-title', text: title }),
      h('div', { class: 'gameover-score', text: String(score) }),
      h(
        'div',
        { class: 'button-list' },
        button('Back to Main Menu', backToMainMenu),
        button('Back to Space', backToSpace),
      ),
    ],
    { kind: 'blocking', width: 300, height: 200, panelClass: 'gameover-panel', panelBackground: background },
  );
}

export interface MiniGameInfo {
  title: string;
  creator: string;
  description: readonly string[];
  howToPlay: readonly string[];
  starImage: ImageKey;
  /** Render the rules as preformatted text (for ASCII art). */
  preformattedRules?: boolean;
}

/** Joins lines with <br> elements. */
const withLineBreaks = (list: readonly string[]): (string | HTMLElement)[] =>
  list.flatMap((line, i) => (i === 0 ? [line] : [h('br'), line]));

export function createMiniGameStartDialog(info: MiniGameInfo): DialogScene {
  return new DialogScene(
    [
      image(info.starImage, 'start-star'),
      h('div', { class: 'start-title', text: info.title }),
      h('div', { class: 'start-creator', text: info.creator }),
      h('div', { class: 'start-description' }, ...withLineBreaks(info.description)),
      h('div', { class: 'start-rules-title', text: 'ルール' }),
      h(
        'div',
        { class: `start-rules${info.preformattedRules === true ? ' preformatted' : ''}` },
        ...withLineBreaks(info.howToPlay),
      ),
      button('Start', close),
    ],
    { kind: 'notice', width: 600, height: 400, panelClass: 'start-panel' },
  );
}
