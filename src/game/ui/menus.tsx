import type { JSX } from 'preact';
import * as audio from '../../engine/audio';
import type { Scene } from '../../engine/scene';
import { backTo, closeTop, scenes } from '../scenes';
import { createDialog } from './dialog';
import { Button } from './dom';

/** The pause menu for the scene currently on top. */
export function createPauseMenu(): Scene {
  const pausingSpace = scenes.top()?.tag === 'space';
  return createDialog(
    <>
      <div class="title-font dialog-title">Pause</div>
      <div class="button-list">
        <Button onClick={closeTop}>Resume</Button>
        <Button onClick={() => scenes.push(createSettingsMenu())}>Settings</Button>
        <Button onClick={() => backTo('main-menu')}>Back to Main Menu</Button>
        {!pausingSpace && <Button onClick={() => backTo('space')}>Back to Space</Button>}
      </div>
    </>,
    { kind: 'menu', width: 300, height: 200, panelClass: 'pause-panel' },
  );
}

function VolumeSlider(props: { label: string; value: number; onChange: (v: number) => void }): JSX.Element {
  return (
    <label class="volume-row">
      <span>{props.label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        defaultValue={String(Math.round(props.value * 100))}
        onInput={(e) => props.onChange(e.currentTarget.valueAsNumber / 100)}
      />
    </label>
  );
}

export function createSettingsMenu(): Scene {
  const { bgm, se } = audio.volume();
  return createDialog(
    <>
      <div class="title-font dialog-title settings-title">Settings</div>
      <fieldset class="volume-settings">
        <legend>Volume</legend>
        <VolumeSlider label="BGM" value={bgm} onChange={(v) => audio.setVolume({ bgm: v })} />
        <VolumeSlider label="SE" value={se} onChange={(v) => audio.setVolume({ se: v })} />
      </fieldset>
    </>,
    { kind: 'menu', width: 500, height: 400, panelClass: 'light-panel' },
  );
}
