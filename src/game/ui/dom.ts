type Child = Node | string | null | undefined | false;

interface Props {
  class?: string;
  text?: string;
  style?: Partial<CSSStyleDeclaration>;
  onClick?: () => void;
  attrs?: Record<string, string>;
}

/** Tiny helper for building DOM trees. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  const { class: className, text, style, onClick, attrs = {} } = props;
  if (className !== undefined) el.className = className;
  if (text !== undefined) el.textContent = text;
  if (style !== undefined) Object.assign(el.style, style);
  if (onClick !== undefined) el.addEventListener('click', () => onClick());
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) el.append(child);
  }
  return el;
}

export function button(label: string, onClick: () => void): HTMLButtonElement {
  return h('button', { class: 'btn', text: label, onClick, attrs: { type: 'button' } });
}
