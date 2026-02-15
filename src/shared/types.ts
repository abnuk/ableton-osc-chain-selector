// ── Chain & Rack types ──────────────────────────────────────────────

export interface Chain {
  index: number;
  name: string;
  colorIndex: number;
  isActive: boolean;
}

export interface RackDevice {
  trackId: number;
  trackName: string;
  deviceId: number;
  deviceName: string;
}

export interface ChainState {
  chains: Chain[];
  activeChainIndex: number;
  rack: RackDevice | null;
}

// ── Connection ──────────────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface ConnectionState {
  osc: ConnectionStatus;
  midi: ConnectionStatus;
  midiDeviceName: string | null;
}

// ── MIDI ────────────────────────────────────────────────────────────

export interface MidiPadConfig {
  prevNote: number | null;
  nextNote: number | null;
  prevChannel: number;
  nextChannel: number;
}

export interface MidiDevice {
  name: string;
  id: string;
}

export type LearnTarget = 'prev' | 'next';

export interface MidiMessage {
  type: 'note_on' | 'note_off' | 'cc';
  note: number;
  velocity: number;
  channel: number;
}

// ── Config (persisted) ──────────────────────────────────────────────

export interface AppConfig {
  oscSendPort: number;
  oscReceivePort: number;
  selectedTrackId: number | null;
  selectedDeviceId: number | null;
  selectedMidiDevice: string | null;
  midiPads: MidiPadConfig;
  lastActiveChainIndex: number;
  alwaysOnTop: boolean;
}

// ── IPC channel names ───────────────────────────────────────────────

export const IPC = {
  // Chain
  CHAIN_DISCOVER: 'chain:discover',
  CHAIN_LIST: 'chain:list',
  CHAIN_SELECT: 'chain:select',
  CHAIN_NEXT: 'chain:next',
  CHAIN_PREV: 'chain:prev',
  CHAIN_STATE_CHANGED: 'chain:stateChanged',

  // Connection
  CONNECTION_STATUS: 'connection:status',
  CONNECTION_STATUS_CHANGED: 'connection:statusChanged',

  // MIDI
  MIDI_GET_DEVICES: 'midi:getDevices',
  MIDI_SELECT_DEVICE: 'midi:selectDevice',
  MIDI_GET_CONFIG: 'midi:getConfig',
  MIDI_LEARN_START: 'midi:learnStart',
  MIDI_LEARN_STOP: 'midi:learnStop',
  MIDI_LEARN_COMPLETE: 'midi:learnComplete',
  MIDI_MESSAGE: 'midi:message',

  // Config
  CONFIG_GET: 'config:get',
  CONFIG_UPDATE: 'config:update',

  // Window
  WINDOW_SET_ALWAYS_ON_TOP: 'window:setAlwaysOnTop',
} as const;
