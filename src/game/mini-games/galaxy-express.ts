import { img } from '../../engine/assets';
import { randomInt } from '../../engine/random';
import type { Scene } from '../../engine/scene';
import { HEIGHT, WIDTH } from '../../engine/stage';
import { every } from '../../engine/timing';
import { scenes } from '../scenes';
import { createDialog } from '../ui/dialog';
import { button, h } from '../ui/dom';
import type { MiniGame, MiniGameEntry, MiniGameSession } from './mini-game';

interface Train {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Count the trains that drift across the screen, then answer how many there were. */
function start({ end }: MiniGameSession): MiniGame {
  const trains: Train[] = Array.from({ length: randomInt(10) + 10 }, () => {
    const w = randomInt(90) + 30;
    return { x: Math.random() * (WIDTH / 2), y: Math.random() * (HEIGHT / 2), w, h: (w * 2) / 3 };
  });
  /** The trains drift for 0.8 s per train; then the player is asked. */
  let driftSteps = 0;
  let asked = false;
  const drift = every(100, () => {
    driftSteps++;
    for (const t of trains) {
      t.x += Math.random() * 5;
      t.y += Math.random() * 5;
    }
    if (driftSteps > trains.length * 8 && !asked) {
      asked = true;
      scenes.push(createAnswerDialog(trains.length, end));
    }
  });

  return {
    update: drift,
    render(ctx) {
      ctx.drawImage(img('galaxy-express/background'), 0, 0);
      for (const t of trains) ctx.drawImage(img('galaxy-express/train'), t.x, t.y, t.w, t.h);
    },
  };
}

/** Asks for the number of trains; the closer the answer, the higher the score. */
function createAnswerDialog(correctAnswer: number, onScore: (score: number) => void): Scene {
  const field = h('input', { class: 'answer-input', attrs: { type: 'number', inputmode: 'numeric', min: '0' } });
  const submit = () => {
    if (Number.isNaN(field.valueAsNumber)) {
      field.focus();
      return;
    }
    const answer = Math.trunc(field.valueAsNumber);
    onScore(Math.max(0, 100 - 5 * Math.abs(answer - correctAnswer)));
  };
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });

  return createDialog(
    [
      h(
        'div',
        { class: 'answer-message' },
        h('p', { text: '電車はいくつあった？' }),
        h('p', { text: '正解との差がすくないほど点が高いよ' }),
      ),
      h('div', { class: 'answer-form' }, field, button('OK', submit)),
    ],
    { kind: 'blocking', width: WIDTH - 70, height: HEIGHT - 80, panelClass: 'answer-panel' },
  );
}

export const galaxyExpress: MiniGameEntry = {
  depth: 0,
  title: 'Galaxy Express',
  creator: 'わくわくぎんがだん',
  description: ['電車の数をおしえてあげよう！'],
  howToPlay: [
    'わくわくぎんがだんのボスです',
    '最近ものわすれがひどく、出発させた電車の数を忘れてしまいました...',
    'お願いします！わたしたちをたすけて！',
    '数を間違えると電車が脱線するかもしれません',
  ],
  starImage: 'galaxy-express/star',
  result: { title: 'Game Over', background: 'blue' },
  start,
};
