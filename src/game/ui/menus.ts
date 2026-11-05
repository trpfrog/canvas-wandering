import * as audio from '../../engine/audio';
import type { Scene } from '../../engine/scene';
import { backTo, closeTop, scenes } from '../scenes';
import { createDialog } from './dialog';
import { button, h } from './dom';

/** The pause menu for the scene currently on top. */
export function createPauseMenu(): Scene {
  const pausingSpace = scenes.top()?.tag === 'space';
  return createDialog(
    [
      h('div', { class: 'title-font dialog-title', text: 'Pause' }),
      h(
        'div',
        { class: 'button-list' },
        button('Resume', closeTop),
        button('Settings', () => scenes.push(createSettingsMenu())),
        button('Back to Main Menu', () => backTo('main-menu')),
        !pausingSpace && button('Back to Space', () => backTo('space')),
      ),
    ],
    { kind: 'menu', width: 300, height: 200, panelClass: 'pause-panel' },
  );
}

function volumeSlider(label: string, value: number, onChange: (v: number) => void): HTMLElement {
  const slider = h('input', { attrs: { type: 'range', min: '0', max: '100', step: '1' } });
  slider.valueAsNumber = Math.round(value * 100);
  slider.addEventListener('input', () => onChange(slider.valueAsNumber / 100));
  return h('label', { class: 'volume-row' }, h('span', { text: label }), slider);
}

export function createSettingsMenu(): Scene {
  const { bgm, se } = audio.volume();
  return createDialog(
    [
      h('div', { class: 'title-font dialog-title settings-title', text: 'Settings' }),
      h(
        'fieldset',
        { class: 'volume-settings' },
        h('legend', { text: 'Volume' }),
        volumeSlider('BGM', bgm, (v) => audio.setVolume({ bgm: v })),
        volumeSlider('SE', se, (v) => audio.setVolume({ se: v })),
      ),
    ],
    { kind: 'menu', width: 500, height: 400, panelClass: 'light-panel' },
  );
}
