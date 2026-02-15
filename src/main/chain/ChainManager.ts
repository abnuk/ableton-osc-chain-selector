import { EventEmitter } from 'events';
import { OscClient } from '../osc/OscClient';
import { OscMessageRouter } from '../osc/OscMessageRouter';
import type { Chain, ChainState, RackDevice } from '@shared/types';

/**
 * Manages chain state for a single rack device.
 * Handles solo-based chain switching, next/prev navigation, and listener subscriptions.
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
   * Select a chain by index (solo it).
   */
  async selectChain(index: number): Promise<void> {
    if (!this.rack || index < 0 || index >= this.chains.length) return;
    const { trackId, deviceId } = this.rack;

    // Unsolo previous chain, then solo the new one (LOM doesn't auto-unsolo)
    if (this.activeChainIndex >= 0 && this.activeChainIndex !== index) {
      this.osc.send('/live/chain/set/solo', trackId, deviceId, this.activeChainIndex, 0);
    }
    this.osc.send('/live/chain/set/solo', trackId, deviceId, index, 1);
    this.osc.send('/live/device/set/selected_chain', trackId, deviceId, index);

    this.activeChainIndex = index;
    this.updateSoloStates(index);
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
      const [namesMsg, colorsMsg, soloMsg, selectedMsg] = await Promise.all([
        this.osc.request('/live/device/get/chains/name', trackId, deviceId),
        this.osc.request('/live/device/get/chains/color_index', trackId, deviceId),
        this.osc.request('/live/device/get/chains/solo', trackId, deviceId),
        this.osc.request('/live/device/get/selected_chain', trackId, deviceId),
      ]);

      // args: [track_id, device_id, ...values]
      const names = namesMsg.args.slice(2).map((a) => a.value as string);
      const colors = colorsMsg.args.slice(2).map((a) => a.value as number);
      const solos = soloMsg.args.slice(2).map((a) => a.value as number);

      this.chains = names.map((name, i) => ({
        index: i,
        name,
        colorIndex: colors[i] ?? 0,
        isSoloed: solos[i] === 1,
      }));

      // Determine active chain from solo states or selected_chain
      const soloedIndex = solos.findIndex((s) => s === 1);
      const selectedIndex = selectedMsg.args[2]?.value as number ?? 0;
      this.activeChainIndex = soloedIndex >= 0 ? soloedIndex : selectedIndex;
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
        this.updateSoloStates(chainIndex);
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

  private updateSoloStates(activeIndex: number): void {
    this.chains = this.chains.map((chain) => ({
      ...chain,
      isSoloed: chain.index === activeIndex,
    }));
  }

  private emitState(): void {
    this.emit('stateChanged', this.getState());
  }
}
