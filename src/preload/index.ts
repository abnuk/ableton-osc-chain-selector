import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/types';
import type {
  ChainState,
  ConnectionState,
  MidiDevice,
  MidiPadConfig,
  MidiMessage,
  LearnTarget,
  RackDevice,
  AppConfig,
} from '../shared/types';

export interface ElectronAPI {
  chain: {
    discover: () => Promise<RackDevice[]>;
    list: () => Promise<ChainState>;
    select: (index: number) => Promise<void>;
    next: () => Promise<void>;
    prev: () => Promise<void>;
    onStateChanged: (callback: (state: ChainState) => void) => () => void;
  };
  connection: {
    getStatus: () => Promise<ConnectionState>;
    onStatusChanged: (callback: (state: ConnectionState) => void) => () => void;
  };
  midi: {
    getDevices: () => Promise<MidiDevice[]>;
    selectDevice: (name: string) => Promise<boolean>;
    getConfig: () => Promise<MidiPadConfig>;
    learnStart: (target: LearnTarget) => Promise<void>;
    learnStop: () => Promise<void>;
    onLearnComplete: (callback: (config: MidiPadConfig) => void) => () => void;
    onMessage: (callback: (msg: MidiMessage) => void) => () => void;
  };
  rack: {
    select: (rack: RackDevice) => Promise<void>;
    clear: () => Promise<void>;
  };
  config: {
    get: () => Promise<AppConfig>;
    update: (partial: Partial<AppConfig>) => Promise<void>;
  };
  window: {
    setAlwaysOnTop: (value: boolean) => Promise<void>;
  };
}

contextBridge.exposeInMainWorld('api', {
  chain: {
    discover: () => ipcRenderer.invoke(IPC.CHAIN_DISCOVER),
    list: () => ipcRenderer.invoke(IPC.CHAIN_LIST),
    select: (index: number) => ipcRenderer.invoke(IPC.CHAIN_SELECT, index),
    next: () => ipcRenderer.invoke(IPC.CHAIN_NEXT),
    prev: () => ipcRenderer.invoke(IPC.CHAIN_PREV),
    onStateChanged: (callback: (state: ChainState) => void) => {
      const handler = (_: unknown, state: ChainState) => callback(state);
      ipcRenderer.on(IPC.CHAIN_STATE_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC.CHAIN_STATE_CHANGED, handler);
    },
  },
  connection: {
    getStatus: () => ipcRenderer.invoke(IPC.CONNECTION_STATUS),
    onStatusChanged: (callback: (state: ConnectionState) => void) => {
      const handler = (_: unknown, state: ConnectionState) => callback(state);
      ipcRenderer.on(IPC.CONNECTION_STATUS_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC.CONNECTION_STATUS_CHANGED, handler);
    },
  },
  midi: {
    getDevices: () => ipcRenderer.invoke(IPC.MIDI_GET_DEVICES),
    selectDevice: (name: string) => ipcRenderer.invoke(IPC.MIDI_SELECT_DEVICE, name),
    getConfig: () => ipcRenderer.invoke(IPC.MIDI_GET_CONFIG),
    learnStart: (target: LearnTarget) => ipcRenderer.invoke(IPC.MIDI_LEARN_START, target),
    learnStop: () => ipcRenderer.invoke(IPC.MIDI_LEARN_STOP),
    onLearnComplete: (callback: (config: MidiPadConfig) => void) => {
      const handler = (_: unknown, config: MidiPadConfig) => callback(config);
      ipcRenderer.on(IPC.MIDI_LEARN_COMPLETE, handler);
      return () => ipcRenderer.removeListener(IPC.MIDI_LEARN_COMPLETE, handler);
    },
    onMessage: (callback: (msg: MidiMessage) => void) => {
      const handler = (_: unknown, msg: MidiMessage) => callback(msg);
      ipcRenderer.on(IPC.MIDI_MESSAGE, handler);
      return () => ipcRenderer.removeListener(IPC.MIDI_MESSAGE, handler);
    },
  },
  rack: {
    select: (rack: RackDevice) => ipcRenderer.invoke('rack:select', rack),
    clear: () => ipcRenderer.invoke('rack:clear'),
  },
  config: {
    get: () => ipcRenderer.invoke(IPC.CONFIG_GET),
    update: (partial: Partial<AppConfig>) => ipcRenderer.invoke(IPC.CONFIG_UPDATE, partial),
  },
  window: {
    setAlwaysOnTop: (value: boolean) => ipcRenderer.invoke(IPC.WINDOW_SET_ALWAYS_ON_TOP, value),
  },
} satisfies ElectronAPI);

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
