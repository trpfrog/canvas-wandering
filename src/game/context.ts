import type { Scene, SceneStack } from '../engine/scene';

let sceneStack: SceneStack | undefined;

export function setSceneStack(stack: SceneStack): void {
  sceneStack = stack;
}

/** The game's scene stack, set up once in main.ts. */
export function scenes(): SceneStack {
  if (sceneStack === undefined) throw new Error('The scene stack is not initialized yet');
  return sceneStack;
}

/** Tags of the scenes the player can return to. */
export const SceneTag = {
  mainMenu: 'main-menu',
  space: 'space',
} as const;

export const hasTag =
  (tag: string) =>
  (scene: Scene): boolean =>
    scene.tag === tag;
