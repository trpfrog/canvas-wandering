import type { Scene } from '../../engine/scene';
import { scenes } from '../scenes';
import { h } from './dom';

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
export function createDialog(content: readonly HTMLElement[], options: DialogOptions): Scene {
  const { kind, width, height, panelClass, panelBackground = '', onResume } = options;
  const panel = h('div', { class: `dialog-panel ${panelClass}` }, ...content);
  Object.assign(panel.style, { width: `${width}px`, minHeight: `${height}px`, background: panelBackground });
  const element = h('div', { class: `dialog-backdrop ${kind}` }, panel);

  const dialog: Scene = {
    opaque: false,
    element,
    keyDown(e) {
      if (e.code === 'Escape' && !e.repeat && kind === 'menu') scenes.remove(dialog);
    },
    resume() {
      // Focus the first control so that the dialog also works from the keyboard.
      panel.querySelector<HTMLElement>('input, button')?.focus();
      onResume?.();
    },
  };
  element.addEventListener('click', (e) => {
    if (e.target === element && kind !== 'blocking') scenes.remove(dialog);
  });
  return dialog;
}

/** Joins lines with <br> elements. */
export const withLineBreaks = (lines: readonly string[]): (string | HTMLElement)[] =>
  lines.flatMap((line, i) => (i === 0 ? [line] : [h('br'), line]));
