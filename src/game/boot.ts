import { loadFonts, loadImages } from '../engine/assets';
import * as audio from '../engine/audio';
import type { Scene } from '../engine/scene';
import { isTouchScreen } from '../engine/touch-controls';
import { scenes } from './scenes';
import { createMainMenu } from './title';
import { h } from './ui/dom';

/** On phones, use the whole screen where the browser allows it (not on iPhone). */
async function enterFullscreen(): Promise<void> {
  if (!isTouchScreen() || !document.fullscreenEnabled) return;
  await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
}

function startGame(): void {
  enterFullscreen().catch(() => {
    // Fullscreen is a nicety; the game fits any window.
  });
  audio.unlock();
  scenes.reset(createMainMenu());
}

/**
 * Loads every asset, then waits for a click: browsers only allow audio to start
 * from a user gesture.
 */
export function createBootScreen(): Scene {
  const message = h('div', { class: 'boot-message', text: 'Now loading' });
  const element = h(
    'div',
    { class: 'boot-screen' },
    h('div', { class: 'title-font', text: 'Space Wandering!!' }),
    message,
  );

  async function load(): Promise<void> {
    await Promise.all([
      loadFonts(),
      audio.load(),
      loadImages((loaded, total) => {
        message.textContent = `Now loading${'.'.repeat(Math.round((loaded / total) * 10))}`;
      }),
    ]);
    message.textContent = 'Click to start';
    element.classList.add('ready');
    element.addEventListener('click', startGame, { once: true });
  }

  load().catch((error: unknown) => {
    message.textContent = 'Failed to load the game. Please reload the page.';
    reportError(error);
  });

  return { opaque: true, bgm: 'silence', element };
}
