import * as audio from '../../engine/audio';
import type { Scene } from '../../engine/scene';
import { acquiredMedals, awardMedal, hasMedal, type MedalDef } from '../medals';
import { closeTop, scenes } from '../scenes';
import { createDialog, withLineBreaks } from './dialog';
import { button, h, image } from './dom';

const dateFormat = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFormat = new Intl.DateTimeFormat('ja-JP', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function createMedalCollection(): Scene {
  const medals = acquiredMedals();
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
              h(
                'span',
                { class: 'medal-date' },
                ...withLineBreaks([dateFormat.format(acquiredAt), timeFormat.format(acquiredAt)]),
              ),
            ),
          ),
        )
      : h('div', { class: 'no-medals', text: 'You have no medals yet.' });

  return createDialog(
    [h('div', { class: 'title-font medals-title', text: 'Medal Collections' }), body, button('Close', closeTop)],
    { kind: 'menu', width: 500, height: 400, panelClass: 'light-panel medals-panel' },
  );
}

/**
 * Shows the "You got a medal!" dialog unless the player already has the medal.
 * Returns whether it was shown.
 */
export function showMedalDialog(medal: MedalDef): boolean {
  if (hasMedal(medal)) return false;
  scenes.push(
    createDialog(
      [
        h('div', { class: 'medal-get-title', text: 'You got a medal!' }),
        h('div', { class: 'medal-get-visual' }, h('div', { class: 'medal-rays' }), image(medal.image)),
        h('div', { class: 'medal-get-name', text: medal.title }),
        button('I got it', closeTop),
      ],
      {
        kind: 'notice',
        width: 300,
        height: 300,
        panelClass: 'medal-get-panel',
        onResume: () => {
          audio.playSe('achievement');
          awardMedal(medal);
        },
      },
    ),
  );
  return true;
}
