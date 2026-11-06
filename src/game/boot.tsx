import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { loadFonts, loadImages } from '../engine/assets';
import * as audio from '../engine/audio';
import type { Scene } from '../engine/scene';
import { isTouchScreen } from '../engine/touch-controls';
import { scenes } from './scenes';
import { createMainMenu } from './title';
import { mount } from './ui/dom';

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

type Progress = { state: 'loading'; fraction: number } | { state: 'ready' } | { state: 'failed' };

function message(progress: Progress): string {
  if (progress.state === 'loading') return `Now loading${'.'.repeat(Math.round(progress.fraction * 10))}`;
  return progress.state === 'ready' ? 'Click to start' : 'Failed to load the game. Please reload the page.';
}

/**
 * Loads every asset, then waits for a click: browsers only allow audio to start
 * from a user gesture.
 */
function BootScreen(): JSX.Element {
  const [progress, setProgress] = useState<Progress>({ state: 'loading', fraction: 0 });
  useEffect(() => {
    Promise.all([
      loadFonts(),
      audio.load(),
      loadImages((loaded, total) => setProgress({ state: 'loading', fraction: loaded / total })),
    ]).then(
      () => setProgress({ state: 'ready' }),
      (error: unknown) => {
        setProgress({ state: 'failed' });
        reportError(error);
      },
    );
  }, []);

  const ready = progress.state === 'ready';
  return (
    <div class={ready ? 'boot-screen ready' : 'boot-screen'} onClick={ready ? startGame : undefined}>
      <div class="title-font">Space Wandering!!</div>
      <div class="boot-message">{message(progress)}</div>
    </div>
  );
}

export function createBootScreen(): Scene {
  return { opaque: true, bgm: 'silence', element: mount(<BootScreen />) };
}
