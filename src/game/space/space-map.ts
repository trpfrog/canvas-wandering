import type { ImageKey } from '../../engine/assets';
import { circle, place, type Shape } from '../../engine/geometry';
import { poisson, randomInt, sparsePoints } from '../../engine/random';
import type { Point } from '../../engine/stage';
import type { MiniGameEntry } from '../mini-games/mini-game';

export const CHUNK_SIZE = 128;
export const CHUNKS = 24;
/** Width and height of each layer of space. */
export const MAP_SIZE = CHUNK_SIZE * CHUNKS;
export const MAP_DEPTH = 10;

/** The original generated each background star with this probability per pixel. */
const STAR_DENSITY = 0.000005;

export interface MiniGameStar {
  readonly kind: 'mini-game';
  x: number;
  y: number;
  readonly entry: MiniGameEntry;
}

export interface ZodiacStar {
  readonly kind: 'zodiac';
  readonly x: number;
  readonly y: number;
  readonly sign: ZodiacSign;
  touched: boolean;
  image: ImageKey;
  /** Half of the drawn image size. */
  imageRadius: number;
}

export type EventStar = MiniGameStar | ZodiacStar;

export const MINI_GAME_STAR_RADIUS = 50;
const ZODIAC_STAR_RADIUS = 35 / 2;

export function eventStarHitBox(star: EventStar): Shape {
  const r = star.kind === 'mini-game' ? MINI_GAME_STAR_RADIUS : ZODIAC_STAR_RADIUS;
  return place(circle(r), star.x, star.y);
}

export class Layer {
  readonly backgroundStars: Point[] = [];
  readonly eventStars: EventStar[] = [];
  zodiac: ZodiacSign | null = null;

  constructor(readonly background: ImageKey) {
    const count = poisson(MAP_SIZE * MAP_SIZE * STAR_DENSITY);
    for (let i = 0; i < count; i++) {
      this.backgroundStars.push({ x: randomInt(MAP_SIZE), y: randomInt(MAP_SIZE) });
    }
  }

  isWithin(x: number, y: number): boolean {
    return x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE;
  }
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
export class ZodiacSign {
  readonly stars: ZodiacStar[];
  readonly lines: ZodiacLine[] = [];
  lineColor = 'rgba(179,179,179,0.25)';

  constructor(range: { x: number; y: number; w: number; h: number }, count: number) {
    this.stars = sparsePoints({ x: 0, y: 0, w: range.w, h: range.h }, 200, count).map((p) => ({
      kind: 'zodiac',
      x: p.x + range.x,
      y: p.y + range.y,
      sign: this,
      touched: false,
      image: 'space/star-dark',
      imageRadius: 35,
    }));

    const shorten = 50;
    for (const [a, b] of consecutivePairs(this.stars)) {
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const dx = Math.cos(angle) * shorten;
      const dy = Math.sin(angle) * shorten;
      this.lines.push({ x0: a.x + dx, y0: a.y + dy, x1: b.x - dx, y1: b.y - dy });
    }
  }

  /**
   * Called while the rocket touches one of the stars.
   * @returns whether every star has been lit up
   */
  touch(star: ZodiacStar): boolean {
    const allTouched = this.stars.every((s) => s.touched);
    const index = this.stars.indexOf(star);
    const inOrder = this.stars.slice(0, index).every((s) => s.touched);

    // The lines get brighter the further along the constellation the rocket is.
    const progress = inOrder ? (index + 1) / this.stars.length : 0;
    this.lineColor = allTouched ? '#fff' : `rgba(179,179,179,${0.25 + 0.5 * progress})`;
    if (allTouched || star.touched) return allTouched;

    if (inOrder) {
      star.touched = true;
      star.image = 'space/star-bright';
      star.imageRadius = 30;
    } else {
      for (const s of this.stars) {
        s.touched = false;
        s.image = 'space/star-dark';
        s.imageRadius = 30;
      }
    }
    return false;
  }
}

const BACKGROUNDS: readonly ImageKey[] = [
  'space/background-0',
  'space/background-1',
  'space/background-2',
  'space/background-3',
  'space/background-4',
];

function consecutivePairs<T>(items: readonly T[]): [T, T][] {
  return items.slice(1).flatMap((item, i): [T, T][] => {
    const previous = items.at(i);
    return previous === undefined ? [] : [[previous, item]];
  });
}

export class SpaceMap {
  readonly layers: Layer[] = [];
  private readonly miniGameStars: MiniGameStar[];

  constructor(miniGames: readonly MiniGameEntry[]) {
    for (let i = 0; i < MAP_DEPTH; i++) {
      this.layers.push(new Layer(BACKGROUNDS.at(i % BACKGROUNDS.length) ?? 'space/background-0'));
    }

    this.miniGameStars = miniGames.map((entry) => ({ kind: 'mini-game', x: 0, y: 0, entry }));
    for (const star of this.miniGameStars) this.layer(star.entry.depth).eventStars.push(star);

    const zodiacLayer = this.layer(1);
    zodiacLayer.zodiac = new ZodiacSign({ x: 500, y: 500, w: 2000, h: 2000 }, 12);
    zodiacLayer.eventStars.push(...zodiacLayer.zodiac.stars);

    this.redistributeMiniGameStars();
  }

  layer(depth: number): Layer {
    const layer = this.layers.at(depth);
    if (layer === undefined) throw new RangeError(`No layer at depth ${depth}`);
    return layer;
  }

  /** Moves the mini game stars to new random places that are far enough apart. */
  redistributeMiniGameStars(): void {
    const margin = 100;
    const points = sparsePoints(
      { x: margin, y: margin, w: MAP_SIZE - 2 * margin, h: MAP_SIZE - 2 * margin },
      500,
      this.miniGameStars.length,
    );
    this.miniGameStars.forEach((star, i) => Object.assign(star, points[i]));
  }
}
