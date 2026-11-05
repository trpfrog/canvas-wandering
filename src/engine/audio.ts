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
} as const satisfies Record<SoundId, number>;

const SOUND_IDS: readonly (SoundId & SoundKey)[] = [
  'bgm-menu',
  'bgm-space',
  'bgm-mini-game',
  'se-rocket',
  'se-achievement',
  'se-explosion',
];

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

export interface SoundHandle {
  stop(): void;
}

class AudioManager {
  private readonly ctx = new AudioContext();
  private readonly bgmGain = this.ctx.createGain();
  private readonly seGain = this.ctx.createGain();
  private readonly buffers = new Map<SoundId, AudioBuffer>();
  private volume: Volume = loadJson('volume', { bgm: 0.2, se: 0.2 }, isVolume);

  private currentBgm: { id: BgmId; source: AudioBufferSourceNode } | null = null;
  private readonly exclusive = new Map<SeId, SoundHandle>();

  constructor() {
    this.bgmGain.connect(this.ctx.destination);
    this.seGain.connect(this.ctx.destination);
    this.applyVolume();
  }

  async load(): Promise<void> {
    await Promise.all(
      SOUND_IDS.map(async (id) => {
        const res = await fetch(soundUrl(id));
        const buffer = await this.ctx.decodeAudioData(await res.arrayBuffer());
        this.buffers.set(id, buffer);
      }),
    );
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

  /** Switches the background music. Keeps playing if the same track is requested. */
  playBgm(id: BgmId | null): void {
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
   * Plays a sound effect.
   * @param options.loop `true` to loop forever, or the number of extra repetitions
   * @param options.exclusive stop the previous instance of the same sound first
   */
  playSe(
    id: SeId,
    { loop = false, exclusive = false }: { loop?: boolean | number; exclusive?: boolean } = {},
  ): SoundHandle {
    if (exclusive) this.exclusive.get(id)?.stop();

    const source = this.createSource(`se-${id}`, this.seGain, loop !== false);
    if (!source) return { stop() {} };
    source.start();
    if (typeof loop === 'number') {
      source.stop(this.ctx.currentTime + (source.buffer?.duration ?? 0) * (loop + 1));
    }

    let stopped = false;
    const handle: SoundHandle = {
      stop() {
        if (stopped) return;
        stopped = true;
        source.stop();
      },
    };
    source.addEventListener('ended', () => {
      stopped = true;
    });
    if (exclusive) this.exclusive.set(id, handle);
    return handle;
  }

  stopSe(id: SeId): void {
    this.exclusive.get(id)?.stop();
  }
}

export const audio = new AudioManager();
