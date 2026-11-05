import { loadFonts, loadImages } from '../engine/assets';
import { audio } from '../engine/audio';
import type { Scene } from '../engine/scene';
import { scenes } from './context';
import { MainMenuScene } from './main-menu';
import { h } from './ui/dom';

/**
 * Loads every asset, then waits for a click: browsers only allow audio to start
 * from a user gesture.
 */
export class BootScene implements Scene {
  readonly opaque = true;
  readonly bgm = null;
  readonly element: HTMLElement;
  private readonly message = h('div', { class: 'boot-message', text: 'Now loading' });

  constructor() {
    this.element = h(
      'div',
      { class: 'boot-screen' },
      h('div', { class: 'title-font', text: 'Space Wandering!!' }),
      this.message,
    );
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      await Promise.all([
        loadFonts(),
        audio.load(),
        loadImages((loaded, total) => {
          this.message.textContent = `Now loading${'.'.repeat(Math.round((loaded / total) * 10))}`;
        }),
      ]);
    } catch (error) {
      this.message.textContent = 'Failed to load the game. Please reload the page.';
      throw error;
    }
    this.message.textContent = 'Click to start';
    this.element.classList.add('ready');
    this.element.addEventListener(
      'click',
      () => {
        audio.unlock();
        scenes().reset(new MainMenuScene());
      },
      { once: true },
    );
  }
}
