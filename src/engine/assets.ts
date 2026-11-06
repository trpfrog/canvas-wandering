/**
 * Asset registry. Vite resolves every file under `src/assets` to a hashed URL at
 * build time; the keys below are the paths relative to `assets/img` without extension.
 */
const imageUrls = import.meta.glob<string>('../assets/img/**/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const soundUrls = import.meta.glob<string>('../assets/sound/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

export type ImageKey =
  | `menu/background-${1 | 2 | 3 | 4}`
  | `space/background-${0 | 1 | 2}`
  | 'space/rocket'
  | 'space/rocket-stop'
  | 'space/rocket-invincible'
  | 'space/rocket-invincible-stop'
  | 'space/medal'
  | 'space/star-bright'
  | 'space/star-dark'
  | `galaxy-express/${'star' | 'train' | 'background'}`
  | `race-game/${'star' | 'car'}`
  | `shooting-star/${'star' | 'hug' | 'looking' | 'heart'}`
  | `moons-work/${'star' | 'background' | 'earth' | 'rocket' | 'meteorite' | 'life' | 'life-lost' | 'explosion'}`
  | `macho/${'star' | 'upper-arm' | 'forearm'}`
  | `stardust/${'star' | 'cup' | 'kozou'}`;

export type SoundKey = `bgm-${'menu' | 'space' | 'mini-game'}` | `se-${'rocket' | 'achievement' | 'explosion'}`;

function resolve(urls: Record<string, string>, path: string): string {
  const url = urls[path];
  if (url === undefined) throw new Error(`Missing asset: ${path}`);
  return url;
}

export const imageUrl = (key: ImageKey): string => resolve(imageUrls, `../assets/img/${key}.webp`);
export const soundUrl = (key: SoundKey): string => resolve(soundUrls, `../assets/sound/${key}.mp3`);

const images = new Map<string, HTMLImageElement>();

/** Returns a decoded image. Only valid after {@link loadImages} has finished. */
export function img(key: ImageKey): HTMLImageElement {
  const image = images.get(key);
  if (image === undefined) throw new Error(`Image not loaded: ${key}`);
  return image;
}

export async function loadImages(onProgress: (loaded: number, total: number) => void): Promise<void> {
  const entries = Object.entries(imageUrls);
  let loaded = 0;
  await Promise.all(
    entries.map(async ([path, url]) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      images.set(path.replace('../assets/img/', '').replace(/\.webp$/u, ''), image);
      loaded += 1;
      onProgress(loaded, entries.length);
    }),
  );
}

export const FONT_DIGITAL = "'DSEG7 Classic'";
export const FONT_TITLE = "'Bungee Shade'";

/** Fonts are declared in CSS; make sure they are ready before drawing text on the canvas. */
export async function loadFonts(): Promise<void> {
  await Promise.all([document.fonts.load(`bold 20px ${FONT_DIGITAL}`), document.fonts.load(`20px ${FONT_TITLE}`)]);
}
