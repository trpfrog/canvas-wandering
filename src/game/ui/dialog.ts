import type { Scene } from '../../engine/scene';
import { scenes } from '../context';
import { h } from './dom';

/**
 * - `menu`: blurs the background; Escape or a click outside closes it (pause, settings, …)
 * - `notice`: a click outside closes it (start screens, medals)
 * - `blocking`: can only be left with its own buttons (results)
 */
export type DialogKind = 'menu' | 'notice' | 'blocking';

export interface DialogOptions {
  kind: DialogKind;
  /** Size of the dialog panel in logical pixels (the height grows with the content). */
  width: number;
  height: number;
  /** Extra class for the panel, used for its look. */
  panelClass: string;
  panelBackground?: string;
  onResume?: () => void;
}

/** A dialog shown above the current scene with a darkened background. */
export class DialogScene implements Scene {
  readonly opaque = false;
  readonly element: HTMLElement;
  private readonly panel: HTMLElement;

  constructor(
    content: HTMLElement[],
    private readonly options: DialogOptions,
  ) {
    this.panel = h('div', { class: `dialog-panel ${options.panelClass}` }, ...content);
    Object.assign(this.panel.style, {
      width: `${options.width}px`,
      minHeight: `${options.height}px`,
      background: options.panelBackground ?? '',
    });
    this.element = h('div', { class: `dialog-backdrop ${options.kind}` }, this.panel);
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element && options.kind !== 'blocking') this.close();
    });
  }

  /** Closes this dialog if it is on top. */
  close(): void {
    if (scenes().top() === this) scenes().pop();
  }

  keyDown(e: KeyboardEvent): void {
    if (e.code === 'Escape' && !e.repeat && this.options.kind === 'menu') this.close();
  }

  resume(): void {
    // Focus the first control so that the dialog also works from the keyboard.
    this.panel.querySelector<HTMLElement>('input, button')?.focus();
    this.options.onResume?.();
  }
}
