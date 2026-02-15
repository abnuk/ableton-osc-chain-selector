import { EventEmitter } from 'events';
import { OscClient } from '../osc/OscClient';
import { OscMessageRouter } from '../osc/OscMessageRouter';
import type { Chain, ChainState, RackDevice } from '@shared/types';

/**
 * Manages chain state for a single rack device.
 * Handles device-enable/disable chain switching, next/prev navigation, and listener subscriptions.
 * Selecting a chain enables all devices on it and disables devices on the previous chain (saves CPU).
 */
export class ChainManager extends EventEmitter {
  private chains: Chain[] = [];
  private activeChainIndex = -1;
  private rack: RackDevice | null = null;
  private unsubscribers: (() => void)[] = [];

  constructor(
    private osc: OscClient,
    private router: OscMessageRouter
  ) {
    super();
  }

  getState(): ChainState {
    return {
      chains: [...this.chains],
      activeChainIndex: this.activeChainIndex,
      rack: this.rack,
    };
  }

  /**
   * Set the target rack device and load its chains.
   */
  async setRack(rack: RackDevice): Promise<void> {
    this.cleanup();
    this.rack = rack;
    await this.loadChains();
    this.subscribeListeners();
    this.emitState();
  }

  /**
   * Release listeners and clear state.
   */
  clearRack(): void {
    this.cleanup();
    this.rack = null;
    this.chains = [];
    this.activeChainIndex = -1;
    this.emitState();
  }

  /**
   * Select a chain by index (enable its devices, disable devices on the previous chain).
   */
  async selectChain(index: number): Promise<void> {
    if (!this.rack || index < 0 || index >= this.chains.length) return;
    const { trackId, deviceId } = this.rack;

    // Disable devices on previous chain, enable on new one
    if (this.activeChainIndex >= 0 && this.activeChainIndex !== index) {
      this.osc.send('/live/chain/set/devices_enabled', trackId, deviceId, this.activeChainIndex, 0);
    }
    this.osc.send('/live/chain/set/devices_enabled', trackId, deviceId, index, 1);
    this.osc.send('/live/device/set/selected_chain', trackId, deviceId, index);

    this.activeChainIndex = index;
    this.updateActiveStates(index);
    this.emitState();
  }

  /**
   * Select next chain (wraps around).
   */
  async selectNext(): Promise<void> {
    if (this.chains.length === 0) return;
    const next = (this.activeChainIndex + 1) % this.chains.length;
    await this.selectChain(next);
  }

  /**
   * Select previous chain (wraps around).
   */
  async selectPrevious(): Promise<void> {
    if (this.chains.length === 0) return;
    const prev = (this.activeChainIndex - 1 + this.chains.length) % this.chains.length;
    await this.selectChain(prev);
  }

  private async loadChains(): Promise<void> {
    if (!this.rack) return;
    const { trackId, deviceId } = this.rack;

    try {
      const [namesMsg, colorsMsg, selectedMsg] = await Promise.all([
        this.osc.request('/live/device/get/chains/name', trackId, deviceId),
        this.osc.request('/live/device/get/chains/color_index', trackId, deviceId),
        this.osc.request('/live/device/get/selected_chain', trackId, deviceId),
      ]);

      // args: [track_id, device_id, ...values]
      const names = namesMsg.args.slice(2).map((a) => a.value as string);
      const colors = colorsMsg.args.slice(2).map((a) => a.value as number);
      const selectedIndex = selectedMsg.args[2]?.value as number ?? 0;

      this.activeChainIndex = selectedIndex;

      this.chains = names.map((name, i) => ({
        index: i,
        name,
        colorIndex: colors[i] ?? 0,
        isActive: i === this.activeChainIndex,
      }));

      // Initialize device states: enable active chain, disable all others.
      // Also unsolo all chains to clean up any previous solo state.
      for (let i = 0; i < this.chains.length; i++) {
        this.osc.send('/live/chain/set/devices_enabled', trackId, deviceId, i, i === this.activeChainIndex ? 1 : 0);
        this.osc.send('/live/chain/set/solo', trackId, deviceId, i, 0);
      }
    } catch (err) {
      console.error('[ChainManager] Error loading chains:', err);
      this.chains = [];
      this.activeChainIndex = -1;
    }
  }

  private subscribeListeners(): void {
    if (!this.rack) return;
    const { trackId, deviceId } = this.rack;

    // Listen for chain list changes (add/remove)
    this.osc.send('/live/device/start_listen/chains', trackId, deviceId);
    const unsubChains = this.router.on('/live/device/get/chains', (msg) => {
      const msgTrack = msg.args[0]?.value as number;
      const msgDevice = msg.args[1]?.value as number;
      if (msgTrack === trackId && msgDevice === deviceId) {
        // Chain names changed -- reload
        this.loadChains().then(() => this.emitState());
      }
    });
    this.unsubscribers.push(unsubChains);

    // Listen for selected chain changes
    this.osc.send('/live/device/start_listen/selected_chain', trackId, deviceId);
    const unsubSelected = this.router.on('/live/device/get/selected_chain', (msg) => {
      const msgTrack = msg.args[0]?.value as number;
      const msgDevice = msg.args[1]?.value as number;
      const chainIndex = msg.args[2]?.value as number;
      if (msgTrack === trackId && msgDevice === deviceId) {
        this.activeChainIndex = chainIndex;
        this.updateActiveStates(chainIndex);
        this.emitState();
      }
    });
    this.unsubscribers.push(unsubSelected);
  }

  private cleanup(): void {
    if (this.rack) {
      const { trackId, deviceId } = this.rack;
      this.osc.send('/live/device/stop_listen/chains', trackId, deviceId);
      this.osc.send('/live/device/stop_listen/selected_chain', trackId, deviceId);
    }
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }

  private updateActiveStates(activeIndex: number): void {
    this.chains = this.chains.map((chain) => ({
      ...chain,
      isActive: chain.index === activeIndex,
    }));
  }

  private emitState(): void {
    this.emit('stateChanged', this.getState());
  }
}
