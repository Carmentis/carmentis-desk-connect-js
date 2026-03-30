import { Initiator } from '@cmts-dev/carmentis-relay-client';

export type ConnectionStatus = 'unset' | 'ready' | 'connected' | 'disconnected';

export interface CarmentisSessionOptions {
  relayUrl: string;
  onReady?: () => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onMessage?: (message: unknown) => void;
}

export class CarmentisSession {
  private initiator: Initiator | null = null;
  private _sessionId: string = '';
  private _symKey: string = '';
  private _connectionStatus: ConnectionStatus = 'unset';
  private _relayUrl: string = '';
  private _messages: unknown[] = [];

  get sessionId(): string { return this._sessionId; }
  get symKey(): string { return this._symKey; }
  get connectionStatus(): ConnectionStatus { return this._connectionStatus; }
  get messages(): unknown[] { return this._messages; }

  async connect(options: CarmentisSessionOptions): Promise<void> {
    this._relayUrl = options.relayUrl;
    this.initiator = await Initiator.createSession(options.relayUrl);
    await this.initiator.init();

    this._connectionStatus = 'ready';
    this._sessionId = this.initiator.getSessionId();
    this._symKey = this.initiator.getKey();

    if (options.onReady) options.onReady();

    this.initiator.onMessage((message: unknown) => {
      this._messages.push(message);
      if (options.onMessage) options.onMessage(message);
    });

    this.initiator.onSessionReady(() => {
      this._connectionStatus = 'connected';
      if (options.onConnected) options.onConnected();
    });

    this.initiator.onClose(() => {
      this._connectionStatus = 'disconnected';
      if (options.onDisconnected) options.onDisconnected();
    });
  }

  send(request: unknown): void {
    if (!this.initiator) throw new Error('Session not initialized. Call connect() first.');
    this.initiator.send(request);
  }

  getDeepLink(): string {
    return `cmts://connect/carmentis-relay?relay=${encodeURIComponent(this._relayUrl)}&sessionId=${this._sessionId}&symKey=${this._symKey}`;
  }
}

export function createCarmentisSession(): CarmentisSession {
  return new CarmentisSession();
}
