import type { ImageKey } from '../../engine/assets';
import type { Scene } from '../../engine/scene';
import { scenes } from '../context';
import { TransitionScene } from '../transition';
import { createMiniGameStartDialog, createPauseDialog, type MiniGameInfo } from '../ui/dialogs';

/** The game-specific part of a mini game scene. */
export type MiniGame = Omit<Scene, 'opaque' | 'bgm' | 'tag' | 'element'>;

/** A mini game that can be reached from a star in space. */
export interface MiniGameEntry extends MiniGameInfo {
  readonly id: string;
  /** The layer of the space map the star is placed on. */
  readonly depth: number;
  readonly starImage: ImageKey;
  create(): MiniGame;
}

/** Wraps a mini game into a full-screen scene with the mini game BGM and Escape to pause. */
function toScene(g: MiniGame): Scene {
  return {
    opaque: true,
    bgm: 'mini-game',
    update: (dt) => g.update?.(dt),
    render: (ctx) => g.render?.(ctx),
    resume: (popped) => g.resume?.(popped),
    suspend: () => g.suspend?.(),
    dispose: () => g.dispose?.(),
    keyDown: (e) => {
      if (e.code === 'Escape' && !e.repeat) scenes().push(createPauseDialog(true));
      else g.keyDown?.(e);
    },
    keyUp: (e) => g.keyUp?.(e),
    pointerDown: (p) => g.pointerDown?.(p),
    pointerUp: (p) => g.pointerUp?.(p),
    pointerMove: (p) => g.pointerMove?.(p),
    click: (p) => g.click?.(p),
    wheel: (deltaY) => g.wheel?.(deltaY),
  };
}

/** Enters a mini game with the peephole transition and shows its start dialog on top. */
export function startMiniGame(entry: MiniGameEntry): void {
  scenes().push(TransitionScene.push(() => [toScene(entry.create()), createMiniGameStartDialog(entry)]));
}
