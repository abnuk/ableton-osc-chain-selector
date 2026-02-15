import { OscClient, OscMessage } from './OscClient';

type MessageHandler = (msg: OscMessage) => void;

/**
 * Routes incoming OSC messages to registered handlers by address pattern.
 */
export class OscMessageRouter {
  private handlers = new Map<string, MessageHandler[]>();

  constructor(private client: OscClient) {
    this.client.on('message', (msg: OscMessage) => this.route(msg));
  }

  /**
   * Register a handler for a specific OSC address.
   * Returns an unsubscribe function.
   */
  on(address: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(address)) {
      this.handlers.set(address, []);
    }
    this.handlers.get(address)!.push(handler);

    return () => {
      const handlers = this.handlers.get(address);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
        if (handlers.length === 0) this.handlers.delete(address);
      }
    };
  }

  private route(msg: OscMessage): void {
    const handlers = this.handlers.get(msg.address);
    if (handlers) {
      for (const handler of handlers) {
        handler(msg);
      }
    }
  }
}
