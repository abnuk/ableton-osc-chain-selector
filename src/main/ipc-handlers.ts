import { ipcMain, BrowserWindow } from 'electron';
import { OscClient } from './osc/OscClient';
import { ChainDiscovery } from './chain/ChainDiscovery';
import { ChainManager } from './chain/ChainManager';
import { MidiInputService } from './midi/MidiInputService';
import { MidiChainNavigator } from './midi/MidiChainNavigator';
import { ConfigStore } from './config/ConfigStore';
import { IPC } from '@shared/types';
import type { LearnTarget, RackDevice } from '@shared/types';

export function registerIpcHandlers(
  win: BrowserWindow,
  osc: OscClient,
  discovery: ChainDiscovery,
  chainManager: ChainManager,
  midi: MidiInputService,
  navigator: MidiChainNavigator,
  config: ConfigStore
): void {
  // ── Chain ───────────────────────────────────────────────────────

  ipcMain.handle(IPC.CHAIN_DISCOVER, async () => {
    return discovery.discover();
  });

  ipcMain.handle(IPC.CHAIN_LIST, () => {
    return chainManager.getState();
  });

  ipcMain.handle(IPC.CHAIN_SELECT, async (_e, index: number) => {
    await chainManager.selectChain(index);
    config.set('lastActiveChainIndex', index);
  });

  ipcMain.handle(IPC.CHAIN_NEXT, async () => {
    await chainManager.selectNext();
    const state = chainManager.getState();
    config.set('lastActiveChainIndex', state.activeChainIndex);
  });

  ipcMain.handle(IPC.CHAIN_PREV, async () => {
    await chainManager.selectPrevious();
    const state = chainManager.getState();
    config.set('lastActiveChainIndex', state.activeChainIndex);
  });

  // Forward chain state changes to renderer
  chainManager.on('stateChanged', (state) => {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.CHAIN_STATE_CHANGED, state);
    }
  });

  // ── Connection ──────────────────────────────────────────────────

  ipcMain.handle(IPC.CONNECTION_STATUS, () => {
    return {
      osc: osc.status,
      midi: midi.status,
      midiDeviceName: midi.deviceName,
    };
  });

  // Forward connection changes to renderer
  osc.on('statusChanged', (status) => {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.CONNECTION_STATUS_CHANGED, {
        osc: status,
        midi: midi.status,
        midiDeviceName: midi.deviceName,
      });
    }
  });

  midi.on('statusChanged', () => {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.CONNECTION_STATUS_CHANGED, {
        osc: osc.status,
        midi: midi.status,
        midiDeviceName: midi.deviceName,
      });
    }
  });

  // ── MIDI ────────────────────────────────────────────────────────

  ipcMain.handle(IPC.MIDI_GET_DEVICES, () => {
    return midi.getDevices();
  });

  ipcMain.handle(IPC.MIDI_SELECT_DEVICE, async (_e, deviceName: string) => {
    const success = await midi.selectDevice(deviceName);
    if (success) {
      config.set('selectedMidiDevice', deviceName);
    }
    return success;
  });

  ipcMain.handle(IPC.MIDI_GET_CONFIG, () => {
    return navigator.getConfig();
  });

  ipcMain.handle(IPC.MIDI_LEARN_START, (_e, target: LearnTarget) => {
    navigator.startLearn(target);
  });

  ipcMain.handle(IPC.MIDI_LEARN_STOP, () => {
    navigator.stopLearn();
  });

  navigator.on('learnComplete', (_target, padConfig) => {
    config.setMidiPads(padConfig);
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.MIDI_LEARN_COMPLETE, padConfig);
    }
  });

  // Forward MIDI messages to renderer (for monitor/debug)
  midi.on('message', (msg) => {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.MIDI_MESSAGE, msg);
    }
  });

  // ── Config ──────────────────────────────────────────────────────

  ipcMain.handle(IPC.CONFIG_GET, () => {
    return config.getAll();
  });

  ipcMain.handle(IPC.CONFIG_UPDATE, (_e, partial: Record<string, unknown>) => {
    config.update(partial);
  });

  // ── Rack selection from renderer ────────────────────────────────

  ipcMain.handle('rack:select', async (_e, rack: RackDevice) => {
    config.set('selectedTrackId', rack.trackId);
    config.set('selectedDeviceId', rack.deviceId);
    await chainManager.setRack(rack);
  });

  ipcMain.handle('rack:clear', () => {
    config.set('selectedTrackId', null);
    config.set('selectedDeviceId', null);
    chainManager.clearRack();
  });

  // ── Window ──────────────────────────────────────────────────────

  ipcMain.handle(IPC.WINDOW_SET_ALWAYS_ON_TOP, (_e, value: boolean) => {
    win.setAlwaysOnTop(value);
    config.set('alwaysOnTop', value);
  });
}
