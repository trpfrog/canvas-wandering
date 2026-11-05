import { soundUrl, type SoundKey } from './assets';
import { loadJson, saveJson } from './storage';

export type BgmId = 'menu' | 'space' | 'mini-game';
export type SeId = 'rocket' | 'achievement' | 'explosion';
type SoundId = `bgm-${BgmId}` | `se-${SeId}`;

/** Where each sound jumps back to when it loops, in seconds. */
const LOOP_START = {
  'bgm-menu': 0,
  'bgm-space': 1.412,
  'bgm-mini-game': 21.176,
  'se-rocket': 8,
  'se-achievement': 0,
  'se-explosion': 0,
} as const satisfies Record<SoundId & SoundKey, number>;

/** Needed right after the start screen; the other tracks load in the background. */
const ESSENTIAL: readonly SoundId[] = ['bgm-menu', 'se-rocket', 'se-achievement', 'se-explosion'];
const DEFERRED: readonly SoundId[] = ['bgm-space', 'bgm-mini-game'];

interface Volume {
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

class AudioManager {
  private readonly ctx = new AudioContext();
  private readonly bgmGain = this.ctx.createGain();
  private readonly seGain = this.ctx.createGain();
  private readonly buffers = new Map<SoundId, AudioBuffer>();
  private volume: Volume = loadJson('volume', { bgm: 0.2, se: 0.2 }, isVolume);

  /** The requested music, which may still be loading. */
  private wantedBgm: BgmId | null = null;
  private currentBgm: { id: BgmId; source: AudioBufferSourceNode } | null = null;
  /** Each sound effect plays at most once at a time; playing it again restarts it. */
  private readonly playingSe = new Map<SeId, AudioBufferSourceNode>();

  constructor() {
    this.bgmGain.connect(this.ctx.destination);
    this.seGain.connect(this.ctx.destination);
    this.applyVolume();
  }

  /** Loads what the menu needs and keeps loading the rest in the background. */
  async load(): Promise<void> {
    await Promise.all(ESSENTIAL.map(async (id) => this.loadSound(id)));
    for (const id of DEFERRED) void this.loadSound(id).then(() => this.playBgm(this.wantedBgm));
  }

  private async loadSound(id: SoundId): Promise<void> {
    const res = await fetch(soundUrl(id));
    this.buffers.set(id, await this.ctx.decodeAudioData(await res.arrayBuffer()));
  }

  /** Must be called from a user gesture so that the browser allows playback. */
  unlock(): void {
    void this.ctx.resume();
  }

  getVolume(): Readonly<Volume> {
    return this.volume;
  }

  setVolume(volume: Partial<Volume>): void {
    this.volume = { ...this.volume, ...volume };
    this.applyVolume();
    saveJson('volume', this.volume);
  }

  private applyVolume(): void {
    this.bgmGain.gain.value = this.volume.bgm;
    this.seGain.gain.value = this.volume.se;
  }

  private createSource(id: SoundId, output: AudioNode, loop: boolean): AudioBufferSourceNode | null {
    const buffer = this.buffers.get(id);
    if (!buffer) return null;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.loopStart = LOOP_START[id];
    source.loopEnd = buffer.duration;
    source.connect(output);
    return source;
  }

  /**
   * Switches the background music. Keeps playing if the same track is requested;
   * a track that is still loading starts as soon as it is ready.
   */
  playBgm(id: BgmId | null): void {
    this.wantedBgm = id;
    if (this.currentBgm?.id === id) return;
    this.currentBgm?.source.stop();
    this.currentBgm = null;
    if (id === null) return;
    const source = this.createSource(`bgm-${id}`, this.bgmGain, true);
    if (!source) return;
    source.start();
    this.currentBgm = { id, source };
  }

  /**
   * Plays a sound effect from the start, stopping it first if it is already playing.
   * @param loop `true` to loop until stopped, or the number of extra repetitions
   */
  playSe(id: SeId, { loop = false }: { loop?: boolean | number } = {}): void {
    this.stopSe(id);
    const source = this.createSource(`se-${id}`, this.seGain, loop !== false);
    if (!source) return;
    source.start();
    if (typeof loop === 'number') {
      source.stop(this.ctx.currentTime + (source.buffer?.duration ?? 0) * (loop + 1));
    }
    source.addEventListener('ended', () => {
      if (this.playingSe.get(id) === source) this.playingSe.delete(id);
    });
    this.playingSe.set(id, source);
  }

  stopSe(id: SeId): void {
    this.playingSe.get(id)?.stop();
    this.playingSe.delete(id);
  }
}

export const audio = new AudioManager();
