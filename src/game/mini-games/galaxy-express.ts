import { img } from '../../engine/assets';
import { randomInt } from '../../engine/random';
import { HEIGHT, WIDTH } from '../../engine/stage';
import { scenes } from '../context';
import { DialogScene } from '../ui/dialog';
import { button, h } from '../ui/dom';
import { MiniGameScene, type MiniGameEntry } from './mini-game';

interface Train {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Count the trains that drift across the screen, then answer how many there were. */
class GalaxyExpress extends MiniGameScene {
  private readonly trains: Train[];
  private counter = 0;
  private elapsed = 0;
  private asked = false;

  constructor() {
    super({ title: 'Game Over', background: 'blue' });
    this.trains = Array.from({ length: randomInt(10) + 10 }, () => {
      const w = randomInt(90) + 30;
      return { x: Math.random() * (WIDTH / 2), y: Math.random() * (HEIGHT / 2), w, h: Math.trunc((w * 2) / 3) };
    });
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed < 100) return;
    this.elapsed -= 100;

    this.counter++;
    for (const t of this.trains) {
      t.x += Math.random() * 5;
      t.y += Math.random() * 5;
    }
    if (this.counter > this.trains.length * 8 && !this.asked) {
      this.asked = true;
      scenes().push(createAnswerDialog(this.trains.length, (score) => this.end(score)));
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(img('galaxy-express/background'), 0, 0);
    for (const t of this.trains) ctx.drawImage(img('galaxy-express/train'), Math.trunc(t.x), Math.trunc(t.y), t.w, t.h);
  }
}

/** Asks for the number of trains; the closer the answer, the higher the score. */
function createAnswerDialog(correctAnswer: number, onScore: (score: number) => void): DialogScene {
  const field = h('input', { class: 'answer-input', attrs: { type: 'number', inputmode: 'numeric', min: '0' } });
  const submit = () => {
    const answer = Number.parseInt(field.value, 10);
    if (Number.isNaN(answer)) {
      field.focus();
      return;
    }
    onScore(Math.max(0, 100 - 5 * Math.abs(answer - correctAnswer)));
  };
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });

  return new DialogScene(
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
  create: () => new GalaxyExpress(),
};
