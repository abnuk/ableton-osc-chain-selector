import { EventEmitter } from 'events';
import { MidiInputService } from './MidiInputService';
import { ChainManager } from '../chain/ChainManager';
import type { MidiPadConfig, MidiMessage, LearnTarget } from '@shared/types';

/**
 * Maps MIDI pad inputs to chain navigation (next/previous).
 * Supports learn mode for pad assignment.
 */
export class MidiChainNavigator extends EventEmitter {
  private config: MidiPadConfig = {
    prevNote: null,
    nextNote: null,
    prevChannel: 1,
    nextChannel: 1,
  };
  private learnTarget: LearnTarget | null = null;

  constructor(
    private midi: MidiInputService,
    private chainManager: ChainManager
  ) {
    super();
    this.midi.on('message', (msg: MidiMessage) => this.handleMidiMessage(msg));
  }

  getConfig(): MidiPadConfig {
    return { ...this.config };
  }

  setConfig(config: MidiPadConfig): void {
    this.config = { ...config };
  }

  /**
   * Start learn mode -- next Note On will be assigned to the target action.
   */
  startLearn(target: LearnTarget): void {
    this.learnTarget = target;
    this.emit('learnStarted', target);
  }

  stopLearn(): void {
    this.learnTarget = null;
    this.emit('learnStopped');
  }

  isLearning(): boolean {
    return this.learnTarget !== null;
  }

  private handleMidiMessage(msg: MidiMessage): void {
    // Only react to Note On
    if (msg.type !== 'note_on') return;

    // Learn mode: assign pad
    if (this.learnTarget) {
      if (this.learnTarget === 'prev') {
        this.config.prevNote = msg.note;
        this.config.prevChannel = msg.channel;
      } else {
        this.config.nextNote = msg.note;
        this.config.nextChannel = msg.channel;
      }
      const target = this.learnTarget;
      this.learnTarget = null;
      this.emit('learnComplete', target, this.config);
      return;
    }

    // Normal mode: check if this note matches prev/next
    if (
      this.config.prevNote !== null &&
      msg.note === this.config.prevNote &&
      msg.channel === this.config.prevChannel
    ) {
      this.chainManager.selectPrevious();
    } else if (
      this.config.nextNote !== null &&
      msg.note === this.config.nextNote &&
      msg.channel === this.config.nextChannel
    ) {
      this.chainManager.selectNext();
    }
  }
}
