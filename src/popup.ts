import { CarmentisSession, ConnectionStatus } from './session';
import { JsonRpc, type JsonRpcRequest, type JsonRpcSuccessResponse } from '@cmts-dev/carmentis-sdk-json-rpc';

export interface CarmentisPopupOptions {
  relayUrl: string;
  title?: string;
  onReady?: () => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onMessage?: (message: unknown) => void;
  onClose?: () => void;
}

const STYLES_ID = 'cmts-popup-styles';

const STYLES = `
.cmts-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.cmts-modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 24px;
  width: 100%;
  max-width: 400px;
  margin: 16px;
  animation: cmts-slide-up 0.25s ease;
}

@keyframes cmts-slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.cmts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.cmts-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  font-family: system-ui, sans-serif;
}

.cmts-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  font-size: 18px;
  line-height: 1;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
}

.cmts-close:hover { color: #111827; }

.cmts-status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.cmts-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background-color 0.3s;
}

.cmts-dot--pulse {
  animation: cmts-pulse 1.5s ease-in-out infinite;
}

@keyframes cmts-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.cmts-status-label {
  font-size: 14px;
  color: #374151;
  font-family: system-ui, sans-serif;
}

.cmts-info {
  font-size: 13px;
  color: #6b7280;
  font-family: system-ui, sans-serif;
  margin-bottom: 20px;
  line-height: 1.5;
}

.cmts-btn {
  display: inline-block;
  width: 100%;
  padding: 10px 20px;
  background: #1d4ed8;
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  font-family: system-ui, sans-serif;
  text-align: center;
  text-decoration: none;
  box-sizing: border-box;
  transition: background 0.15s;
  cursor: pointer;
}

.cmts-btn:hover { background: #1e40af; }
.cmts-btn--hidden { display: none !important; }
`;

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  unset:        'Initializing…',
  ready:        'Waiting for Carmentis Desk…',
  connected:    'Connected',
  disconnected: 'Disconnected',
};

const STATUS_INFO: Record<ConnectionStatus, string> = {
  unset:        'Creating session…',
  ready:        'Open the link in your Carmentis Desk app to continue.',
  connected:    'Carmentis Desk is connected. Processing your request…',
  disconnected: 'The session has been closed.',
};

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  unset:        '#9ca3af',
  ready:        '#f59e0b',
  connected:    '#10b981',
  disconnected: '#ef4444',
};

export class CarmentisPopup {
  private session: CarmentisSession;
  private options: CarmentisPopupOptions;
  private overlay: HTMLElement | null = null;
  private dot: HTMLElement | null = null;
  private statusLabel: HTMLElement | null = null;
  private infoEl: HTMLElement | null = null;
  private linkBtn: HTMLAnchorElement | null = null;

  constructor(options: CarmentisPopupOptions) {
    this.options = options;
    this.session = new CarmentisSession();
  }

  async open(): Promise<void> {
    this.injectStyles();
    this.buildDOM();

    await this.session.connect({
      relayUrl: this.options.relayUrl,

      onReady: () => {
        this.setStatus('ready');
        if (this.linkBtn) {
          this.linkBtn.href = this.session.getDeepLink();
          this.linkBtn.classList.remove('cmts-btn--hidden');
        }
        if (this.options.onReady) this.options.onReady();
      },

      onConnected: () => {
        this.setStatus('connected');
        if (this.linkBtn) this.linkBtn.classList.add('cmts-btn--hidden');
        if (this.options.onConnected) this.options.onConnected();
      },

      onDisconnected: () => {
        this.setStatus('disconnected');
        if (this.options.onDisconnected) this.options.onDisconnected();
      },

      onMessage: (message) => {
        if (this.options.onMessage) this.options.onMessage(message);
      },
    });
  }

  close(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
    }
    if (this.options.onClose) this.options.onClose();
  }

  send(request: unknown): void {
    this.session.send(request);
  }

  getSession(): CarmentisSession {
    return this.session;
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.dot) {
      this.dot.style.backgroundColor = STATUS_COLOR[status];
      if (status === 'ready') {
        this.dot.classList.add('cmts-dot--pulse');
      } else {
        this.dot.classList.remove('cmts-dot--pulse');
      }
    }
    if (this.statusLabel) this.statusLabel.textContent = STATUS_LABEL[status];
    if (this.infoEl) this.infoEl.textContent = STATUS_INFO[status];
  }

  private buildDOM(): void {
    // overlay
    this.overlay = el('div', 'cmts-overlay');

    // modal
    const modal = el('div', 'cmts-modal');

    // header
    const header = el('div', 'cmts-header');
    const title = el('h2', 'cmts-title');
    title.textContent = this.options.title ?? 'Connect to Carmentis Desk';
    const closeBtn = el('button', 'cmts-close');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => this.close());
    header.append(title, closeBtn);

    // status row
    const statusRow = el('div', 'cmts-status-row');
    this.dot = el('span', 'cmts-dot');
    this.dot.style.backgroundColor = STATUS_COLOR['unset'];
    this.statusLabel = el('span', 'cmts-status-label');
    this.statusLabel.textContent = STATUS_LABEL['unset'];
    statusRow.append(this.dot, this.statusLabel);

    // info text
    this.infoEl = el('p', 'cmts-info');
    this.infoEl.textContent = STATUS_INFO['unset'];

    // deep link button (hidden until ready)
    this.linkBtn = document.createElement('a');
    this.linkBtn.className = 'cmts-btn cmts-btn--hidden';
    this.linkBtn.textContent = 'Open Carmentis Desk';
    this.linkBtn.target = '_blank';
    this.linkBtn.rel = 'noopener noreferrer';

    modal.append(header, statusRow, this.infoEl, this.linkBtn);
    this.overlay.appendChild(modal);
    document.body.appendChild(this.overlay);

    // close on overlay click (outside modal)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  }

  private injectStyles(): void {
    if (document.getElementById(STYLES_ID)) return;
    const style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = STYLES;
    document.head.appendChild(style);
  }
}

export function createCarmentisPopup(options: CarmentisPopupOptions): CarmentisPopup {
  return new CarmentisPopup(options);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

// ─── JSON-RPC popup ───────────────────────────────────────────────────────────

export interface CarmentisJsonRpcPopupOptions {
  relayUrl: string;
  request: JsonRpcRequest;
  title?: string;
  onReady?: () => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onResponse?: (response: JsonRpcSuccessResponse) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

export class CarmentisJsonRpcPopup {
  private popup: CarmentisPopup;

  constructor(options: CarmentisJsonRpcPopupOptions) {
    this.popup = new CarmentisPopup({
      relayUrl: options.relayUrl,
      title: options.title,
      onReady: options.onReady,
      onConnected: () => {
        this.popup.send(options.request);
        if (options.onConnected) options.onConnected();
      },
      onDisconnected: options.onDisconnected,
      onMessage: (message) => {
        if (JsonRpc.isSuccessResponse(message)) {
          if (options.onResponse) options.onResponse(message);
        } else if (JsonRpc.isErrorResponse(message)) {
          if (options.onError) options.onError(new Error(`JSON-RPC error ${message.error.code}: ${message.error.message}`));
        } else {
          if (options.onError) options.onError(new Error('Invalid response format'));
        }
      },
      onClose: options.onClose,
    });
  }

  async open(): Promise<void> {
    return this.popup.open();
  }

  close(): void {
    this.popup.close();
  }

  getSession(): CarmentisSession {
    return this.popup.getSession();
  }
}

export function createCarmentisJsonRpcPopup(options: CarmentisJsonRpcPopupOptions): CarmentisJsonRpcPopup {
  return new CarmentisJsonRpcPopup(options);
}
