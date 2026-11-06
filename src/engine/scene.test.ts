import { describe, expect, it, vi } from 'vite-plus/test';
import { createSceneStack, type Scene } from './scene';

function fakeScene(name: string, opaque: boolean, bgm?: Scene['bgm']): Scene & { log: string[] } {
  const log: string[] = [];
  return {
    opaque,
    bgm,
    log,
    resume: () => log.push(`${name}:resume`),
    suspend: () => log.push(`${name}:suspend`),
    dispose: () => log.push(`${name}:dispose`),
  };
}

function setup() {
  const stack = createSceneStack();
  const onChange = vi.fn();
  stack.onChange(onChange);
  return { stack, onChange };
}

describe('createSceneStack', () => {
  it('suspends the covered scene and resumes it when the top is popped', () => {
    const { stack } = setup();
    const a = fakeScene('a', true);
    const b = fakeScene('b', false);
    stack.push(a);
    stack.push(b);
    stack.pop();
    expect(a.log).toEqual(['a:resume', 'a:suspend', 'a:resume']);
    expect(b.log).toEqual(['b:resume', 'b:suspend', 'b:dispose']);
  });

  it('only resumes the topmost of scenes pushed together', () => {
    const { stack } = setup();
    const game = fakeScene('game', true);
    const dialog = fakeScene('dialog', false);
    stack.push(game, dialog);
    expect(game.log).toEqual([]);
    expect(dialog.log).toEqual(['dialog:resume']);
  });

  it('shows the topmost opaque scene and everything above it', () => {
    const { stack } = setup();
    const a = fakeScene('a', true);
    const b = fakeScene('b', true);
    const c = fakeScene('c', false);
    stack.push(a);
    stack.push(b);
    stack.push(c);
    expect(stack.visibleScenes()).toEqual([b, c]);
  });

  it('lets the topmost opaque scene or scene with its own music pick the BGM', () => {
    const { stack, onChange } = setup();
    stack.push(fakeScene('space', true, 'space'));
    stack.push(fakeScene('dialog', false));
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Array), 'space');
    stack.push(fakeScene('game', true, 'mini-game'));
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Array), 'mini-game');
    stack.push(fakeScene('quiet', true));
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Array), 'silence');
  });

  it('pops until a predicate holds', () => {
    const { stack } = setup();
    const menu = { ...fakeScene('menu', true), tag: 'main-menu' };
    stack.push(menu);
    stack.push(fakeScene('space', true));
    stack.push(fakeScene('pause', false));
    stack.popUntil((s) => s.tag === 'main-menu');
    expect(stack.top()).toBe(menu);
  });

  it('removes a scene only while it is on top', () => {
    const { stack } = setup();
    const a = fakeScene('a', true);
    const b = fakeScene('b', false);
    stack.push(a, b);
    stack.remove(a);
    expect(stack.top()).toBe(b);
    stack.remove(b);
    expect(stack.top()).toBe(a);
  });
});

describe('createSceneStack without resuming in between', () => {
  it('replaces the top without resuming the scene below', () => {
    const { stack } = setup();
    const below = fakeScene('below', true);
    const old = fakeScene('old', false);
    const next = fakeScene('next', true);
    stack.push(below);
    stack.push(old);
    stack.replaceTop(next);
    expect(below.log).toEqual(['below:resume', 'below:suspend']);
    expect(next.log).toEqual(['next:resume']);
    expect(stack.visibleScenes()).toEqual([next]);
  });

  it('resumes only the scene popUntil stops at', () => {
    const { stack } = setup();
    const menu = { ...fakeScene('menu', true), tag: 'main-menu' };
    const space = fakeScene('space', true);
    stack.push(menu);
    stack.push(space);
    stack.push(fakeScene('pause', false));
    stack.popUntil((s) => s.tag === 'main-menu');
    expect(space.log).toEqual(['space:resume', 'space:suspend', 'space:dispose']);
    expect(stack.top()).toBe(menu);
    expect(menu.log).toEqual(['menu:resume', 'menu:suspend', 'menu:resume']);
  });
});
