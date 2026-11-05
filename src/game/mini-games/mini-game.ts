import type { ImageKey } from '../../engine/assets';
import type { Scene } from '../../engine/scene';
import { scenes } from '../context';
import type { MedalDef } from '../medals';
import { TransitionScene } from '../transition';
import { createGameOverDialog, createMiniGameStartDialog, createPauseDialog, pushMedalWindow } from '../ui/dialogs';
import type { MiniGameInfo } from '../ui/dialogs';

/** A mini game that can be reached from a star in space. */
export interface MiniGameEntry extends MiniGameInfo {
  /** The layer of the space map the star is placed on. */
  readonly depth: number;
  readonly starImage: ImageKey;
  create(): Scene;
}

/** How a mini game shows its result. */
export interface ResultScreen {
  title: string;
  /** Background of the result panel (CSS color). */
  background: string;
  /** A medal given for reaching `minScore`. */
  medal?: { def: MedalDef; minScore: number };
}

/** Base for mini game scenes: full screen, mini game music, pausable, ends once. */
export abstract class MiniGameScene implements Scene {
  readonly opaque = true;
  readonly bgm = 'mini-game';
  private ended = false;

  protected constructor(private readonly resultScreen: ResultScreen) {}

  pauseMenu(): Scene {
    return createPauseDialog();
  }

  protected get isOver(): boolean {
    return this.ended;
  }

  /** Ends the game and shows the score, plus the medal if it was earned. Only the first call counts. */
  protected end(score: number): void {
    if (this.ended) return;
    this.ended = true;
    const { title, background, medal } = this.resultScreen;
    scenes().push(createGameOverDialog(title, score, background));
    if (medal && score >= medal.minScore) pushMedalWindow(medal.def);
  }
}

/** Enters a mini game with the peephole transition and shows its start dialog on top. */
export function startMiniGame(entry: MiniGameEntry): void {
  scenes().push(TransitionScene.push(() => [entry.create(), createMiniGameStartDialog(entry)]));
}
