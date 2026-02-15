import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import { join } from 'path';
import { OscClient } from './osc/OscClient';
import { OscMessageRouter } from './osc/OscMessageRouter';
import { ChainDiscovery } from './chain/ChainDiscovery';
import { ChainManager } from './chain/ChainManager';
import { MidiInputService } from './midi/MidiInputService';
import { MidiChainNavigator } from './midi/MidiChainNavigator';
import { ConfigStore } from './config/ConfigStore';
import { registerIpcHandlers } from './ipc-handlers';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// ── Services ──────────────────────────────────────────────────────

const config = new ConfigStore();
const osc = new OscClient('127.0.0.1', config.get('oscSendPort'), config.get('oscReceivePort'));
const router = new OscMessageRouter(osc);
const discovery = new ChainDiscovery(osc);
const chainManager = new ChainManager(osc, router);
const midi = new MidiInputService();
const navigator = new MidiChainNavigator(midi, chainManager);

// ── Window Creation ───────────────────────────────────────────────

function createWindow(): void {
  // Set app icon
  let appIcon: Electron.NativeImage | undefined;
  try {
    appIcon = nativeImage.createFromPath(getAppIconPath());
    if (appIcon.isEmpty()) appIcon = undefined;
  } catch {
    appIcon = undefined;
  }

  mainWindow = new BrowserWindow({
    width: 480,
    height: 700,
    minWidth: 360,
    minHeight: 500,
    title: 'Chain Selector',
    backgroundColor: '#1a1a2e',
    icon: appIcon,
    alwaysOnTop: config.get('alwaysOnTop'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Register IPC handlers
  registerIpcHandlers(mainWindow, osc, discovery, chainManager, midi, navigator, config);

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Tray ──────────────────────────────────────────────────────────

function getTrayIconPath(): string {
  // In development, use build/ directory; in production, use resources/
  if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL) {
    return join(__dirname, '../../build/tray-icon.png');
  }
  return join(process.resourcesPath, 'tray-icon.png');
}

function getAppIconPath(): string {
  if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL) {
    return join(__dirname, '../../build/icon.png');
  }
  return join(process.resourcesPath, 'icon.png');
}

function createTray(): void {
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(getTrayIconPath());
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon);
  tray.setToolTip('Chain Selector');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: config.get('alwaysOnTop'),
      click: (menuItem) => {
        const value = menuItem.checked;
        config.set('alwaysOnTop', value);
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(value);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

// ── App Lifecycle ─────────────────────────────────────────────────

async function initializeServices(): Promise<void> {
  // Connect OSC
  osc.connect();

  // Initialize MIDI
  await midi.initialize();

  // Restore MIDI device from config
  const savedMidiDevice = config.get('selectedMidiDevice');
  if (savedMidiDevice) {
    await midi.selectDevice(savedMidiDevice);
  }

  // Restore pad config
  const padConfig = config.getMidiPads();
  navigator.setConfig(padConfig);

  // When OSC connects, try to restore the saved rack
  osc.on('statusChanged', async (status) => {
    if (status === 'connected') {
      const trackId = config.get('selectedTrackId');
      const deviceId = config.get('selectedDeviceId');
      if (trackId !== null && deviceId !== null) {
        try {
          await chainManager.setRack({
            trackId,
            deviceId,
            trackName: '',
            deviceName: '',
          });
          // Restore the last active chain
          const lastChain = config.get('lastActiveChainIndex');
          if (lastChain >= 0) {
            await chainManager.selectChain(lastChain);
          }
        } catch (err) {
          console.warn('[Main] Could not restore saved rack:', err);
        }
      }
    }
  });
}

app.whenReady().then(async () => {
  createWindow();
  createTray();
  await initializeServices();
});

app.on('window-all-closed', () => {
  // Keep running in tray on macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  osc.disconnect();
  midi.closeDevice();
});
