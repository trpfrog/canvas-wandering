import { createSceneStack } from '../engine/scene';

/** The game's scene stack. */
export const scenes = createSceneStack();

/** Scenes the player can be sent back to. */
export type SceneTag = 'main-menu' | 'space';

/** Pops back to the scene with the given tag. */
export function backTo(tag: SceneTag): void {
  scenes.popUntil((scene) => scene.tag === tag);
}

/** Closes the scene on top, e.g. from a dialog's button. */
export const closeTop = (): void => scenes.pop();
