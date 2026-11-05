import type { Scene } from '../../engine/scene';
import { scenes } from '../context';
import { h } from './dom';

export interface DialogOptions {
  tag?: Scene['tag'];
  /** Size of the dialog panel in logical pixels. */
  width: number;
  height: number;
  /** Extra class for the panel, used for its look. */
  panelClass: string;
  /** Blur what is behind the dialog. */
  rich?: boolean;
  /** Close the dialog by clicking outside of it. */
  clickToClose?: boolean;
  /** Close the dialog with the Escape key. */
  escToClose?: boolean;
  onResume?: () => void;
  onSuspend?: () => void;
}

/** A dialog shown above the current scene with a darkened (optionally blurred) background. */
export class DialogScene implements Scene {
  readonly opaque = false;
  readonly tag: Scene['tag'];
  readonly element: HTMLElement;
  readonly panel: HTMLElement;

  constructor(
    content: HTMLElement[],
    private readonly options: DialogOptions,
  ) {
    this.tag = options.tag;
    this.panel = h('div', { class: `dialog-panel ${options.panelClass}` }, ...content);
    this.panel.style.width = `${options.width}px`;
    this.panel.style.minHeight = `${options.height}px`;
    this.element = h('div', { class: `dialog-backdrop${options.rich === true ? ' rich' : ''}` }, this.panel);

    this.element.addEventListener('click', (e) => {
      if (e.target === this.element && this.options.clickToClose === true) this.close();
    });
  }

  /** Closes this dialog if it is on top. */
  close(): void {
    if (scenes().top() === this) scenes().pop();
  }

  keyDown(e: KeyboardEvent): void {
    if (e.code === 'Escape' && !e.repeat && this.options.escToClose === true) this.close();
  }

  resume(): void {
    // Focus the first control so the dialog works from the keyboard. The element is
    // attached to the page right after this call, hence the next frame.
    requestAnimationFrame(() => this.panel.querySelector<HTMLElement>('input, button')?.focus());
    this.options.onResume?.();
  }

  suspend(): void {
    // Keep keys pressed while covered (e.g. Enter) from reaching this dialog.
    if (document.activeElement instanceof HTMLElement && this.panel.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    this.options.onSuspend?.();
  }
}
