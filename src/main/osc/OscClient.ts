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
  private _registered = false;

  constructor(
    private sendHost: string = '127.0.0.1',
    private sendPort: number = 11000,
    private receivePort: number = 11002
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
      if (msg.address === '/live/api/register_listener' || msg.address === '/live/test') {
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
      this.register();
      this.startHeartbeat();
    });

    this.udpPort.open();
  }

  disconnect(): void {
    this.unregister();
    this.stopHeartbeat();
    if (this.udpPort) {
      this.udpPort.close();
      this.udpPort = null;
    }
    this.setStatus('disconnected');
  }

  /**
   * Register with AbletonOSC for multi-client listener support.
   * Sends the receive port so the server knows where to deliver events to this client.
   * Called on every UDP ready so the server routes responses (including heartbeats) to our port.
   */
  private register(): void {
    console.log(`[OSC] Registering as listener on port ${this.receivePort}`);
    this.send('/live/api/register_listener', this.receivePort);
    this._registered = true;
  }

  /**
   * Unregister from AbletonOSC multi-client support.
   * The server will stop sending listener events to this client.
   */
  private unregister(): void {
    if (!this._registered) return;
    console.log('[OSC] Unregistering listener');
    this.send('/live/api/unregister_listener');
    this._registered = false;
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

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      if (this._status === 'connected' && this.lastHeartbeatResponse > 0 && now - this.lastHeartbeatResponse > 10000) {
        this._registered = false;
        this.setStatus('disconnected');
      }
      // Use register_listener as heartbeat — its response routes through
      // _resolve_response_addr and arrives on our registered port (11002).
      // Also keeps the registration alive.
      this.send('/live/api/register_listener', this.receivePort);
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
