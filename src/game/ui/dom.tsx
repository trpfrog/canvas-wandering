import { render, type ComponentChildren, type JSX } from 'preact';
import { imageUrl, type ImageKey } from '../../engine/assets';

/** Renders `view` into a new element, to be used as a scene's DOM layer. */
export function mount(view: ComponentChildren): HTMLElement {
  const layer = document.createElement('div');
  render(view, layer);
  return layer;
}

export function Image({ src, class: className }: { src: ImageKey; class?: string }): JSX.Element {
  return <img src={imageUrl(src)} class={className} alt="" />;
}

export function Button({ onClick, children }: { onClick: () => void; children: ComponentChildren }): JSX.Element {
  return (
    <button type="button" class="btn" onClick={() => onClick()}>
      {children}
    </button>
  );
}

/** Lines of text separated by <br>. */
export function Lines({ lines }: { lines: readonly string[] }): JSX.Element {
  return <>{lines.flatMap((line, i) => (i === 0 ? [line] : [<br key={i} />, line]))}</>;
}
