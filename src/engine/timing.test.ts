import { describe, expect, it, vi } from 'vite-plus/test';
import { every, lazy } from './timing';

describe('every', () => {
  it('fires once per full interval and carries the remainder over', () => {
    const fn = vi.fn();
    const tick = every(20, fn);
    tick(10);
    expect(fn).not.toHaveBeenCalled();
    tick(10);
    expect(fn).toHaveBeenCalledOnce();
    tick(45);
    expect(fn).toHaveBeenCalledTimes(3);
    tick(15);
    expect(fn).toHaveBeenCalledTimes(4);
  });
});

describe('lazy', () => {
  it('creates the value once', () => {
    const create = vi.fn(() => ({}));
    const get = lazy(create);
    expect(get()).toBe(get());
    expect(create).toHaveBeenCalledOnce();
  });
});
