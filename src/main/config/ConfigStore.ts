import Store from 'electron-store';
import type { AppConfig, MidiPadConfig } from '@shared/types';

const DEFAULT_CONFIG: AppConfig = {
  oscSendPort: 11000,
  oscReceivePort: 11002,
  selectedTrackId: null,
  selectedDeviceId: null,
  selectedMidiDevice: null,
  midiPads: {
    prevNote: null,
    nextNote: null,
    prevChannel: 1,
    nextChannel: 1,
  },
  lastActiveChainIndex: 0,
  alwaysOnTop: false,
};

/**
 * Persistent config store wrapping electron-store.
 */
export class ConfigStore {
  private store: Store<AppConfig>;

  constructor() {
    this.store = new Store<AppConfig>({
      name: 'chain-selector-config',
      defaults: DEFAULT_CONFIG,
    });

    // Migrate from default 11001 to 11002 for multi-client support
    if (this.store.get('oscReceivePort') === 11001) {
      this.store.set('oscReceivePort', 11002);
    }
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.store.get(key);
  }

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.store.set(key, value);
  }

  getAll(): AppConfig {
    return this.store.store;
  }

  update(partial: Partial<AppConfig>): void {
    for (const [key, value] of Object.entries(partial)) {
      this.store.set(key as keyof AppConfig, value);
    }
  }

  getMidiPads(): MidiPadConfig {
    return this.store.get('midiPads');
  }

  setMidiPads(pads: MidiPadConfig): void {
    this.store.set('midiPads', pads);
  }
}
