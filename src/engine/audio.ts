/**
 * Background music and sound effects. Import as a namespace: `import * as audio from './audio'`.
 */
import { soundUrl, type SoundKey } from './assets';
import { loadJson, saveJson } from './storage';

type WithoutPrefix<T, Prefix extends string> = T extends `${Prefix}${infer Rest}` ? Rest : never;
export type BgmId = WithoutPrefix<SoundKey, 'bgm-'>;
export type SeId = WithoutPrefix<SoundKey, 'se-'>;
/** What should be playing: a track, or nothing. */
export type Music = BgmId | 'silence';

/** Where each sound jumps back to when it loops, in seconds. */
const LOOP_START: Record<SoundKey, number> = {
  'bgm-menu': 0,
  'bgm-space': 1.412,
  'bgm-mini-game': 21.176,
  'se-rocket': 8,
  'se-achievement': 0,
  'se-explosion': 0,
};

/** Needed right after the start screen; the other tracks load in the background. */
const ESSENTIAL: readonly SoundKey[] = ['bgm-menu', 'se-rocket', 'se-achievement', 'se-explosion'];
const DEFERRED: readonly SoundKey[] = ['bgm-space', 'bgm-mini-game'];

export interface Volume {
  bgm: number;
  se: number;
}

const isVolume = (v: unknown): v is Volume =>
  typeof v === 'object' &&
  v !== null &&
  'bgm' in v &&
  'se' in v &&
  typeof v.bgm === 'number' &&
  typeof v.se === 'number';

const ctx = new AudioContext();
const bgmGain = ctx.createGain();
const seGain = ctx.createGain();
bgmGain.connect(ctx.destination);
seGain.connect(ctx.destination);

const buffers = new Map<SoundKey, AudioBuffer>();
let currentVolume: Volume = loadJson('volume', { bgm: 0.2, se: 0.2 }, isVolume);
/** The requested music, which may still be loading. */
let wantedMusic: Music = 'silence';
let currentBgm: { id: BgmId; source: AudioBufferSourceNode } | undefined;
/** Each sound effect plays at most once at a time; playing it again restarts it. */
const playingSe = new Map<SeId, AudioBufferSourceNode>();

applyVolume();

/** Loads what the menu needs and keeps loading the rest in the background. */
export async function load(): Promise<void> {
  await Promise.all(ESSENTIAL.map(loadSound));
  for (const key of DEFERRED) {
    // The game works without these tracks, so a failure is only reported.
    loadSound(key).then(() => playBgm(wantedMusic), reportError);
  }
}

async function loadSound(key: SoundKey): Promise<void> {
  const res = await fetch(soundUrl(key));
  if (!res.ok) throw new Error(`Failed to load ${key}: HTTP ${res.status}`);
  buffers.set(key, await ctx.decodeAudioData(await res.arrayBuffer()));
}

/** Must be called from a user gesture so that the browser allows playback. */
export function unlock(): void {
  void ctx.resume();
}

export function volume(): Readonly<Volume> {
  return currentVolume;
}

export function setVolume(change: Partial<Volume>): void {
  currentVolume = { ...currentVolume, ...change };
  applyVolume();
  saveJson('volume', currentVolume);
}

function applyVolume(): void {
  bgmGain.gain.value = currentVolume.bgm;
  seGain.gain.value = currentVolume.se;
}

function createSource(key: SoundKey, output: AudioNode, loop: boolean): AudioBufferSourceNode | undefined {
  const buffer = buffers.get(key);
  if (!buffer) return undefined;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;
  source.loopStart = LOOP_START[key];
  source.loopEnd = buffer.duration;
  source.connect(output);
  return source;
}

/**
 * Switches the background music. Keeps playing if the same track is requested;
 * a track that is still loading starts as soon as it is ready.
 */
export function playBgm(music: Music): void {
  wantedMusic = music;
  if (currentBgm?.id === music) return;
  currentBgm?.source.stop();
  currentBgm = undefined;
  if (music === 'silence') return;
  const source = createSource(`bgm-${music}`, bgmGain, true);
  if (!source) return;
  source.start();
  currentBgm = { id: music, source };
}

/**
 * Plays a sound effect from the start, stopping it first if it is already playing.
 * `repeat` is how many extra times it plays, or `'forever'` until it is stopped.
 */
export function playSe(id: SeId, { repeat = 0 }: { repeat?: number | 'forever' } = {}): void {
  stopSe(id);
  const source = createSource(`se-${id}`, seGain, repeat !== 0);
  if (!source) return;
  source.start();
  if (typeof repeat === 'number' && repeat > 0) {
    source.stop(ctx.currentTime + (source.buffer?.duration ?? 0) * (repeat + 1));
  }
  source.addEventListener('ended', () => {
    if (playingSe.get(id) === source) playingSe.delete(id);
  });
  playingSe.set(id, source);
}

export function stopSe(id: SeId): void {
  playingSe.get(id)?.stop();
  playingSe.delete(id);
}
