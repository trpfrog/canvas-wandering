import { imageUrl, type ImageKey } from '../../engine/assets';
import { audio } from '../../engine/audio';
import type { Scene } from '../../engine/scene';
import { scenes } from '../context';
import { player, type MedalDef } from '../medals';
import { DialogScene } from './dialog';
import { button, h } from './dom';

const isTag = (tag: Scene['tag']) => (scene: Scene) => scene.tag === tag;

export function backToMainMenu(): void {
  scenes().popUntil(isTag('main-menu'));
}

export function backToSpace(): void {
  scenes().popUntil(isTag('space'));
}

const pop = () => scenes().pop();

export function createPauseDialog(hasBackToSpaceButton: boolean): DialogScene {
  return new DialogScene(
    [
      h('div', { class: 'title-font pause-title', text: 'Pause' }),
      h(
        'div',
        { class: 'button-list' },
        button('Resume', pop),
        button('Settings', () => scenes().push(createSettingsDialog())),
        button('Back to Main Menu', backToMainMenu),
        hasBackToSpaceButton && button('Back to Space', backToSpace),
      ),
    ],
    {
      tag: 'pause',
      width: 300,
      height: 200,
      panelClass: 'pause-panel',
      rich: true,
      clickToClose: true,
      escToClose: true,
    },
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
      h('div', { class: 'title-font settings-title', text: 'Settings' }),
      h(
        'fieldset',
        { class: 'volume-settings' },
        h('legend', { text: 'Volume' }),
        volumeSlider('BGM', volume.bgm, (bgm) => audio.setVolume({ bgm })),
        volumeSlider('SE', volume.se, (se) => audio.setVolume({ se })),
      ),
    ],
    { width: 500, height: 400, panelClass: 'light-panel', rich: true, clickToClose: true, escToClose: true },
  );
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

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
              h('img', { attrs: { src: imageUrl(medal.image), alt: '' } }),
              h('span', { class: 'medal-title', text: medal.title }),
              h('span', { class: 'medal-date' }, ...formatDate(acquiredAt).flatMap((s) => [s, h('br')])),
            ),
          ),
        )
      : h('div', { class: 'no-medals', text: 'You have no medals yet.' });

  return new DialogScene(
    [h('div', { class: 'title-font medals-title', text: 'Medal Collections' }), body, button('Close', pop)],
    {
      width: 500,
      height: 400,
      panelClass: 'light-panel medals-panel',
      rich: true,
      clickToClose: true,
      escToClose: true,
    },
  );
}

/** Shows the "You got a medal!" dialog unless the player already has the medal. */
export function pushMedalWindow(medal: MedalDef): boolean {
  if (player.has(medal)) return false;
  const dialog = new DialogScene(
    [
      h('div', { class: 'medal-get-title', text: 'You got a medal!' }),
      h(
        'div',
        { class: 'medal-get-visual' },
        h('div', { class: 'medal-rays' }),
        h('img', { attrs: { src: imageUrl(medal.image), alt: '' } }),
      ),
      h('div', { class: 'medal-get-name', text: medal.title }),
      button('I got it', pop),
    ],
    {
      width: 300,
      height: 300,
      panelClass: 'medal-get-panel',
      clickToClose: true,
      onResume: () => {
        audio.playSe('achievement', { exclusive: true });
        player.register(medal);
      },
    },
  );
  scenes().push(dialog);
  return true;
}

export function createGameOverDialog(title: string, score: number, backgroundColor: string): DialogScene {
  const dialog = new DialogScene(
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
    { width: 300, height: 200, panelClass: 'gameover-panel' },
  );
  dialog.panel.style.background = backgroundColor;
  return dialog;
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
      h('img', { class: 'start-star', attrs: { src: imageUrl(info.starImage), alt: '' } }),
      h('div', { class: 'start-title', text: info.title }),
      h('div', { class: 'start-creator', text: info.creator }),
      h('div', { class: 'start-description' }, ...withLineBreaks(info.description)),
      h('div', { class: 'start-rules-title', text: 'ルール' }),
      h(
        'div',
        { class: `start-rules${info.preformattedRules === true ? ' preformatted' : ''}` },
        ...withLineBreaks(info.howToPlay),
      ),
      button('Start', pop),
    ],
    { width: 600, height: 400, panelClass: 'start-panel', clickToClose: true },
  );
}
