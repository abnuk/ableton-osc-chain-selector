import { EventEmitter } from 'events';
import type { MidiDevice, MidiMessage, ConnectionStatus } from '@shared/types';

/**
 * MIDI input service using jzz.
 * Handles device enumeration, connection, and message parsing.
 */
export class MidiInputService extends EventEmitter {
  private jzz: any = null;
  private midiIn: any = null;
  private _status: ConnectionStatus = 'disconnected';
  private _deviceName: string | null = null;

  get status(): ConnectionStatus {
    return this._status;
  }

  get deviceName(): string | null {
    return this._deviceName;
  }

  async initialize(): Promise<void> {
    try {
      const JZZ = (await import('jzz')).default;
      this.jzz = await JZZ();
      console.log('[MIDI] JZZ initialized');
    } catch (err) {
      console.error('[MIDI] Failed to initialize JZZ:', err);
    }
  }

  getDevices(): MidiDevice[] {
    if (!this.jzz) return [];

    try {
      const info = this.jzz.info();
      return (info.inputs || []).map((input: any) => ({
        name: input.name,
        id: input.name,
      }));
    } catch (err) {
      console.error('[MIDI] Error listing devices:', err);
      return [];
    }
  }

  async selectDevice(deviceName: string): Promise<boolean> {
    await this.closeDevice();

    try {
      this._status = 'connecting';
      this.emit('statusChanged', this._status);

      const JZZ = (await import('jzz')).default;
      this.midiIn = await JZZ().openMidiIn(deviceName);
      this._deviceName = deviceName;
      this._status = 'connected';
      this.emit('statusChanged', this._status);

      this.midiIn.connect((msg: any) => {
        this.handleMidiMessage(msg);
      });

      console.log(`[MIDI] Connected to: ${deviceName}`);
      return true;
    } catch (err) {
      console.error(`[MIDI] Failed to open device ${deviceName}:`, err);
      this._status = 'disconnected';
      this._deviceName = null;
      this.emit('statusChanged', this._status);
      return false;
    }
  }

  async closeDevice(): Promise<void> {
    if (this.midiIn) {
      try {
        this.midiIn.close();
      } catch {
        // ignore
      }
      this.midiIn = null;
    }
    this._deviceName = null;
    this._status = 'disconnected';
    this.emit('statusChanged', this._status);
  }

  private handleMidiMessage(msg: any): void {
    const data = msg.slice ? msg.slice() : [msg[0], msg[1], msg[2]];
    const status = data[0];
    const type = status & 0xf0;
    const channel = (status & 0x0f) + 1;

    let midiMessage: MidiMessage | null = null;

    switch (type) {
      case 0x90: // Note On
        midiMessage = {
          type: data[2] > 0 ? 'note_on' : 'note_off',
          note: data[1],
          velocity: data[2],
          channel,
        };
        break;
      case 0x80: // Note Off
        midiMessage = {
          type: 'note_off',
          note: data[1],
          velocity: 0,
          channel,
        };
        break;
      case 0xb0: // CC
        midiMessage = {
          type: 'cc',
          note: data[1],
          velocity: data[2],
          channel,
        };
        break;
    }

    if (midiMessage) {
      this.emit('message', midiMessage);
    }
  }
}
