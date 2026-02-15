declare module 'osc' {
  interface UDPPortOptions {
    localAddress?: string;
    localPort?: number;
    remoteAddress?: string;
    remotePort?: number;
    metadata?: boolean;
  }

  class UDPPort {
    constructor(options: UDPPortOptions);
    open(): void;
    close(): void;
    send(msg: { address: string; args: any[] }, host?: string, port?: number): void;
    on(event: string, callback: (...args: any[]) => void): void;
  }

  export { UDPPort };

  const osc: {
    UDPPort: typeof UDPPort;
  };
  export default osc;
}
