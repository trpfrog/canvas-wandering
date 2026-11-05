import { describe, expect, it, vi } from 'vite-plus/test';
import { SceneStack, type Scene } from './scene';

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

function createStack() {
  const onChange = vi.fn();
  const onEmpty = vi.fn();
  return { stack: new SceneStack({ onChange, onEmpty }), onChange, onEmpty };
}

describe('SceneStack', () => {
  it('suspends the covered scene and resumes it when the top is popped', () => {
    const { stack } = createStack();
    const a = fakeScene('a', true);
    const b = fakeScene('b', false);
    stack.push(a);
    stack.push(b);
    stack.pop();
    expect(a.log).toEqual(['a:resume', 'a:suspend', 'a:resume']);
    expect(b.log).toEqual(['b:resume', 'b:suspend', 'b:dispose']);
  });

  it('only resumes the topmost of scenes pushed together', () => {
    const { stack } = createStack();
    const game = fakeScene('game', true);
    const dialog = fakeScene('dialog', false);
    stack.push(game, dialog);
    expect(game.log).toEqual([]);
    expect(dialog.log).toEqual(['dialog:resume']);
  });

  it('shows the topmost opaque scene and everything above it', () => {
    const { stack } = createStack();
    const a = fakeScene('a', true);
    const b = fakeScene('b', true);
    const c = fakeScene('c', false);
    stack.push(a);
    stack.push(b);
    stack.push(c);
    expect(stack.visibleScenes()).toEqual([b, c]);
  });

  it('lets the topmost opaque scene or scene with its own music pick the BGM', () => {
    const { stack, onChange } = createStack();
    stack.push(fakeScene('space', true, 'space'));
    stack.push(fakeScene('dialog', false));
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Array), 'space');
    stack.push(fakeScene('game', true, 'mini-game'));
    expect(onChange).toHaveBeenLastCalledWith(expect.any(Array), 'mini-game');
  });

  it('pops until a predicate holds and reports when it becomes empty', () => {
    const { stack, onEmpty } = createStack();
    const menu = { ...fakeScene('menu', true), tag: 'main-menu' as const };
    stack.push(menu);
    stack.push(fakeScene('space', true));
    stack.push(fakeScene('pause', false));
    stack.popUntil((s) => s.tag === 'main-menu');
    expect(stack.top()).toBe(menu);
    stack.pop();
    expect(onEmpty).toHaveBeenCalledOnce();
  });
});
