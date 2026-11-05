import type { ImageKey } from '../engine/assets';
import { loadJson, saveJson } from '../engine/storage';

export interface MedalDef {
  /** Stable identifier. Medals are compared by this, not by title or image. */
  id: string;
  title: string;
  image: ImageKey;
}

export const MEDALS = {
  zodiac: { id: 'zodiac', title: '星座巡り', image: 'space/medal' },
  shootingStar: { id: 'shooting-star', title: "Don't show shooting stars!", image: 'shooting-star/star' },
  moonsWork: { id: 'moons-work', title: "Moon's work", image: 'moons-work/star' },
  macho: { id: 'macho', title: 'KIN NIKU MUSCLE', image: 'macho/star' },
} as const satisfies Record<string, MedalDef>;

const ALL_MEDALS: readonly MedalDef[] = Object.values(MEDALS);

interface StoredMedal {
  id: string;
  acquiredAt: number;
}

const isStoredMedal = (v: unknown): v is StoredMedal =>
  typeof v === 'object' &&
  v !== null &&
  'id' in v &&
  'acquiredAt' in v &&
  typeof v.id === 'string' &&
  typeof v.acquiredAt === 'number';

const isStoredMedalList = (v: unknown): v is StoredMedal[] => Array.isArray(v) && v.every(isStoredMedal);

/** The medals the player has, persisted in localStorage. */
const acquired: StoredMedal[] = loadJson('medals', [], isStoredMedalList).filter((m) =>
  ALL_MEDALS.some((def) => def.id === m.id),
);

export const hasMedal = (medal: MedalDef): boolean => acquired.some((m) => m.id === medal.id);

export const medalCount = (): number => acquired.length;

export function awardMedal(medal: MedalDef): void {
  if (hasMedal(medal)) return;
  acquired.push({ id: medal.id, acquiredAt: Date.now() });
  saveJson('medals', acquired);
}

export function acquiredMedals(): { medal: MedalDef; acquiredAt: Date }[] {
  return acquired.flatMap((m) => {
    const medal = ALL_MEDALS.find((def) => def.id === m.id);
    return medal ? [{ medal, acquiredAt: new Date(m.acquiredAt) }] : [];
  });
}
