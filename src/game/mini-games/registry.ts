import { galaxyExpress } from './galaxy-express';
import { macho } from './macho';
import type { MiniGameEntry } from './mini-game';
import { moonsWork } from './moons-work';
import { raceGame } from './race-game';
import { shootingStar } from './shooting-star';
import { stardust } from './stardust';

/** Every mini game gets its own star in space. Add a game here to put it on the map. */
export const MINI_GAMES: readonly MiniGameEntry[] = [moonsWork, raceGame, shootingStar, galaxyExpress, stardust, macho];
