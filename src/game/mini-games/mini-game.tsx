import type { ImageKey } from '../../engine/assets';
import type { Scene } from '../../engine/scene';
import { isTouchScreen } from '../../engine/touch-controls';
import type { MedalDef } from '../medals';
import { backTo, closeTop, scenes } from '../scenes';
import { transitionTo } from '../transition';
import { createDialog } from '../ui/dialog';
import { Button, Image, Lines } from '../ui/dom';
import { showMedalDialog } from '../ui/medal-dialogs';
import { createPauseMenu } from '../ui/menus';

/** The parts of a scene a mini game provides; the rest is the same for every mini game. */
export type MiniGame = Pick<
  Scene,
  'update' | 'render' | 'dispose' | 'keyDown' | 'pointerDown' | 'pointerUp' | 'pointerMove' | 'click' | 'touchControls'
>;

/** What a running mini game can ask of the game around it. */
export interface MiniGameSession {
  /** Ends the game and shows the result. Only the first call counts. */
  end: (score: number) => void;
  isOver: () => boolean;
}

/** How a mini game shows its score. */
export interface ResultScreen {
  title: string;
  /** Background of the result panel (CSS color). */
  background: string;
  /** A medal given for reaching `minScore`. */
  medal?: { def: MedalDef; minScore: number };
}

/** A mini game that can be reached from a star in space. */
export interface MiniGameEntry {
  title: string;
  creator: string;
  description: readonly string[];
  howToPlay: readonly string[];
  /** Render the rules as preformatted text (for ASCII art). */
  preformattedRules?: boolean;
  starImage: ImageKey;
  /** The layer of the space map the star is placed on. */
  depth: number;
  /** Omitted for games without a score. */
  result?: ResultScreen;
  start: (session: MiniGameSession) => MiniGame;
}

function createMiniGameScene(entry: MiniGameEntry): Scene {
  let over = false;
  const game = entry.start({
    isOver: () => over,
    end(score) {
      if (over) return;
      over = true;
      if (!entry.result) return;
      const { medal } = entry.result;
      scenes.push(createResultDialog(entry.result, score));
      if (medal && score >= medal.minScore) showMedalDialog(medal.def);
    },
  });
  return { ...game, opaque: true, bgm: 'mini-game', pauseMenu: createPauseMenu };
}

/** Enters a mini game with the peephole transition and shows its start dialog on top. */
export function startMiniGame(entry: MiniGameEntry): void {
  scenes.push(transitionTo(() => [createMiniGameScene(entry), createStartDialog(entry)]));
}

function createStartDialog(entry: MiniGameEntry): Scene {
  const rulesClass = entry.preformattedRules === true ? 'start-rules preformatted' : 'start-rules';
  return createDialog(
    <>
      <Image src={entry.starImage} class="start-star" />
      <div class="start-title">{entry.title}</div>
      <div class="start-creator">{entry.creator}</div>
      <div class="start-description">
        <Lines lines={entry.description} />
      </div>
      <div class="start-rules-title">ルール</div>
      <div class={rulesClass}>
        <Lines lines={entry.howToPlay} />
      </div>
      <Button onClick={closeTop}>Start</Button>
    </>,
    // Wider on touch screens, where the rules are set in a larger font.
    { kind: 'notice', width: isTouchScreen() ? 820 : 600, height: 400, panelClass: 'start-panel' },
  );
}

function createResultDialog({ title, background }: ResultScreen, score: number): Scene {
  return createDialog(
    <>
      <div class="gameover-title">{title}</div>
      <div class="gameover-score">{score}</div>
      <div class="button-list">
        <Button onClick={() => backTo('main-menu')}>Back to Main Menu</Button>
        <Button onClick={() => backTo('space')}>Back to Space</Button>
      </div>
    </>,
    { kind: 'blocking', width: 300, height: 200, panelClass: 'gameover-panel', panelBackground: background },
  );
}
