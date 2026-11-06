import * as audio from '../../engine/audio';
import type { Scene } from '../../engine/scene';
import { acquiredMedals, awardMedal, hasMedal, type MedalDef } from '../medals';
import { closeTop, scenes } from '../scenes';
import { createDialog } from './dialog';
import { Button, Image, Lines } from './dom';

const dateFormat = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFormat = new Intl.DateTimeFormat('ja-JP', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function createMedalCollection(): Scene {
  const medals = acquiredMedals();
  return createDialog(
    <>
      <div class="title-font medals-title">Medal Collections</div>
      {medals.length > 0 ? (
        <ul class="medal-list">
          {medals.map(({ medal, acquiredAt }) => (
            <li key={medal.id}>
              <Image src={medal.image} />
              <span class="medal-title">{medal.title}</span>
              <span class="medal-date">
                <Lines lines={[dateFormat.format(acquiredAt), timeFormat.format(acquiredAt)]} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div class="no-medals">You have no medals yet.</div>
      )}
      <Button onClick={closeTop}>Close</Button>
    </>,
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
      <>
        <div class="medal-get-title">You got a medal!</div>
        <div class="medal-get-visual">
          <div class="medal-rays" />
          <Image src={medal.image} />
        </div>
        <div class="medal-get-name">{medal.title}</div>
        <Button onClick={closeTop}>I got it</Button>
      </>,
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
