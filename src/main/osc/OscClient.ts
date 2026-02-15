import osc, { UDPPort } from 'osc';
import { EventEmitter } from 'events';
import type { ConnectionStatus } from '@shared/types';

export interface OscMessage {
  address: string;
  args: OscArg[];
}

export type OscArg = { type: 'i'; value: number } | { type: 'f'; value: number } | { type: 's'; value: string };

/**
 * Bidirectional UDP OSC client.
 * Sends to Ableton on sendPort (11000), receives responses on receivePort (11002).
 */
export class OscClient extends EventEmitter {
  private udpPort: UDPPort | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeatResponse = 0;
  private _status: ConnectionStatus = 'disconnected';

  constructor(
    private sendHost: string = '127.0.0.1',
    private sendPort: number = 11000,
    private receivePort: number = 11001
  ) {
    super();
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  connect(): void {
    if (this.udpPort) {
      this.disconnect();
    }

    this.setStatus('connecting');

    this.udpPort = new osc.UDPPort({
      localAddress: '127.0.0.1',
      localPort: this.receivePort,
      remoteAddress: this.sendHost,
      remotePort: this.sendPort,
      metadata: true,
    });

    this.udpPort.on('message', (msg: OscMessage) => {
      if (msg.address === '/live/test') {
        this.lastHeartbeatResponse = Date.now();
        if (this._status !== 'connected') {
          this.setStatus('connected');
        }
      }
      this.emit('message', msg);
    });

    this.udpPort.on('error', (err: Error) => {
      console.error('[OSC] Error:', err.message);
    });

    this.udpPort.on('ready', () => {
      console.log(`[OSC] Listening on port ${this.receivePort}, sending to ${this.sendHost}:${this.sendPort}`);
      this.startHeartbeat();
    });

    this.udpPort.open();
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.udpPort) {
      this.udpPort.close();
      this.udpPort = null;
    }
    this.setStatus('disconnected');
  }

  send(address: string, ...args: (number | string | boolean)[]): void {
    if (!this.udpPort) return;

    const oscArgs: OscArg[] = args.map((arg) => {
      if (typeof arg === 'boolean') {
        return { type: 'i', value: arg ? 1 : 0 };
      } else if (typeof arg === 'number') {
        return { type: Number.isInteger(arg) ? 'i' : 'f', value: arg } as OscArg;
      } else {
        return { type: 's', value: String(arg) };
      }
    });

    this.udpPort.send({ address, args: oscArgs }, this.sendHost, this.sendPort);
  }

  /**
   * Send a request and wait for a response matching the same address.
   */
  request(address: string, ...args: (number | string | boolean)[]): Promise<OscMessage> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener('message', handler);
        reject(new Error(`OSC request timeout: ${address}`));
      }, 5000);

      const handler = (msg: OscMessage) => {
        if (msg.address === address) {
          clearTimeout(timeout);
          this.removeListener('message', handler);
          resolve(msg);
        }
      };

      this.on('message', handler);
      this.send(address, ...args);
    });
  }

  private startHeartbeat(): void {
    this.lastHeartbeatResponse = 0;
    this.send('/live/test');

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      if (this._status === 'connected' && this.lastHeartbeatResponse > 0 && now - this.lastHeartbeatResponse > 10000) {
        this.setStatus('disconnected');
      }
      this.send('/live/test');
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.emit('statusChanged', status);
    }
  }
}
