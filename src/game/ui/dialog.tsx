import { createRef, type ComponentChildren } from 'preact';
import type { Scene } from '../../engine/scene';
import { scenes } from '../scenes';
import { mount } from './dom';

/**
 * - `menu`: blurs the background; Escape or a click outside closes it (pause, settings, …)
 * - `notice`: a click outside closes it (start screens, medals)
 * - `blocking`: can only be left with its own buttons (results)
 */
export type DialogKind = 'menu' | 'notice' | 'blocking';

export interface DialogOptions {
  kind: DialogKind;
  /** Size of the panel in logical pixels (the height grows with the content). */
  width: number;
  height: number;
  /** Extra class for the panel, used for its look. */
  panelClass: string;
  panelBackground?: string;
  onResume?: () => void;
}

/** A dialog shown above the current scene with a darkened background. */
export function createDialog(content: ComponentChildren, options: DialogOptions): Scene {
  const { kind, width, height, panelClass, panelBackground, onResume } = options;
  const panel = createRef<HTMLDivElement>();
  const close = () => scenes.remove(dialog);

  const dialog: Scene = {
    opaque: false,
    element: mount(
      <div
        class={`dialog-backdrop ${kind}`}
        onClick={(e) => {
          if (e.target === e.currentTarget && kind !== 'blocking') close();
        }}
      >
        <div
          ref={panel}
          class={`dialog-panel ${panelClass}`}
          tabIndex={-1}
          style={{ width, minHeight: height, background: panelBackground }}
        >
          {content}
        </div>
      </div>,
    ),
    keyDown(e) {
      if (e.code === 'Escape' && !e.repeat && kind === 'menu') close();
    },
    resume() {
      // Focus a control so that the dialog also works from the keyboard. Buttons of a blocking
      // dialog are left alone, so that a key pressed twice cannot pick one by accident.
      const control = panel.current?.querySelector<HTMLElement>(kind === 'blocking' ? 'input' : 'input, button');
      (control ?? panel.current)?.focus();
      onResume?.();
    },
  };
  return dialog;
}
