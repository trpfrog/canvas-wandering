import type { ImageKey } from '../../engine/assets';
import { circle, place, type Point, type Shape } from '../../engine/geometry';
import { poisson, randomInt, sparsePoints } from '../../engine/random';
import type { MiniGameEntry } from '../mini-games/mini-game';

export const CHUNK_SIZE = 128;
export const CHUNKS = 24;
/** Width and height of each layer of space. */
export const MAP_SIZE = CHUNK_SIZE * CHUNKS;
/** Layer 0 holds the mini game stars, layer 1 the hidden constellation; layer 2 is open space. */
export const MAP_DEPTH = 3;

/** Background stars per square pixel. */
const STAR_DENSITY = 0.000005;

export interface MiniGameStar {
  kind: 'mini-game';
  x: number;
  y: number;
  entry: MiniGameEntry;
}

export interface ZodiacStar {
  kind: 'zodiac';
  x: number;
  y: number;
  touched: boolean;
}

export type EventStar = MiniGameStar | ZodiacStar;

export const MINI_GAME_STAR_RADIUS = 50;
const ZODIAC_STAR_RADIUS = 35 / 2;

export function eventStarHitBox(star: EventStar): Shape {
  const r = star.kind === 'mini-game' ? MINI_GAME_STAR_RADIUS : ZODIAC_STAR_RADIUS;
  return place(circle(r), star.x, star.y);
}

export interface ZodiacLine {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * A constellation hidden in space. Touch its stars in order to light them up;
 * touching them all gives a medal.
 */
export interface ZodiacSign {
  stars: ZodiacStar[];
  lines: ZodiacLine[];
  lineColor: string;
}

export interface Layer {
  background: ImageKey;
  backgroundStars: Point[];
  eventStars: EventStar[];
  zodiac?: ZodiacSign;
}

export const isOnMap = ({ x, y }: Point): boolean => x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE;

function createLayer(background: ImageKey): Layer {
  const backgroundStars = Array.from({ length: poisson(MAP_SIZE * MAP_SIZE * STAR_DENSITY) }, () => ({
    x: randomInt(MAP_SIZE),
    y: randomInt(MAP_SIZE),
  }));
  return { background, backgroundStars, eventStars: [] };
}

function createZodiacSign(range: { x: number; y: number; w: number; h: number }, count: number): ZodiacSign {
  const stars = sparsePoints({ x: 0, y: 0, w: range.w, h: range.h }, 200, count).map((p): ZodiacStar => ({
    kind: 'zodiac',
    x: p.x + range.x,
    y: p.y + range.y,
    touched: false,
  }));
  const shorten = 50;
  const lines = consecutivePairs(stars).map(([a, b]) => {
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const dx = Math.cos(angle) * shorten;
    const dy = Math.sin(angle) * shorten;
    return { x0: a.x + dx, y0: a.y + dy, x1: b.x - dx, y1: b.y - dy };
  });
  return { stars, lines, lineColor: 'rgba(179,179,179,0.25)' };
}

/** Called while the rocket touches one of the sign's stars. Returns whether every star is lit up. */
export function touchZodiacStar(sign: ZodiacSign, star: ZodiacStar): boolean {
  const { stars } = sign;
  const allTouched = stars.every((s) => s.touched);
  const index = stars.indexOf(star);
  const inOrder = stars.slice(0, index).every((s) => s.touched);

  // The lines get brighter the further along the constellation the rocket is.
  const progress = inOrder ? (index + 1) / stars.length : 0;
  sign.lineColor = allTouched ? '#fff' : `rgba(179,179,179,${0.25 + 0.5 * progress})`;
  if (allTouched || star.touched) return allTouched;

  if (inOrder) star.touched = true;
  else for (const s of stars) s.touched = false;
  return false;
}

const BACKGROUNDS: readonly ImageKey[] = ['space/background-0', 'space/background-1', 'space/background-2'];

function consecutivePairs<T>(items: readonly T[]): [T, T][] {
  return items.slice(1).flatMap((item, i): [T, T][] => {
    const previous = items.at(i);
    return previous === undefined ? [] : [[previous, item]];
  });
}

export interface SpaceMap {
  layerAt: (depth: number) => Layer;
  /** Moves the mini game stars to new random places that are far enough apart. */
  scatterMiniGameStars: () => void;
}

export function createSpaceMap(miniGames: readonly MiniGameEntry[]): SpaceMap {
  const layers = Array.from({ length: MAP_DEPTH }, (_, i) =>
    createLayer(BACKGROUNDS.at(i % BACKGROUNDS.length) ?? 'space/background-0'),
  );
  const layerAt = (depth: number): Layer => {
    const layer = layers.at(depth);
    if (layer === undefined) throw new RangeError(`No layer at depth ${depth}`);
    return layer;
  };

  const miniGameStars = miniGames.map((entry): MiniGameStar => ({ kind: 'mini-game', x: 0, y: 0, entry }));
  for (const star of miniGameStars) layerAt(star.entry.depth).eventStars.push(star);

  const zodiacLayer = layerAt(1);
  // A compact constellation around the middle of the map, right below where the rocket starts.
  const zodiacSize = 1200;
  const zodiacCorner = (MAP_SIZE - zodiacSize) / 2;
  zodiacLayer.zodiac = createZodiacSign({ x: zodiacCorner, y: zodiacCorner, w: zodiacSize, h: zodiacSize }, 12);
  zodiacLayer.eventStars.push(...zodiacLayer.zodiac.stars);

  function scatterMiniGameStars(): void {
    const margin = 100;
    const area = { x: margin, y: margin, w: MAP_SIZE - 2 * margin, h: MAP_SIZE - 2 * margin };
    const points = sparsePoints(area, 500, miniGameStars.length);
    miniGameStars.forEach((star, i) => Object.assign(star, points[i]));
  }
  scatterMiniGameStars();

  return { layerAt, scatterMiniGameStars };
}
