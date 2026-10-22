import QRCode from 'qrcode';
import { CarmentisSession, ConnectionStatus } from './session';
import { JsonRpc, type JsonRpcRequest, type JsonRpcSuccessResponse } from '@cmts-dev/carmentis-sdk-json-rpc';

export type CarmentisExtraContent = HTMLElement | (() => HTMLElement);

export interface CarmentisPopupOptions {
  relayUrl: string;
  /**
   * Title to display above the popup.
   */
  title?: string;
  /** Display the deep link as text below the QR code. */
  showTechnicalDetails?: boolean;
  /** Custom element displayed between the QR code and the action button. */
  extraContent?: CarmentisExtraContent;
  onReady?: () => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onMessage?: (message: unknown) => void;
  onClose?: () => void;
}

const STYLES_ID = 'cmts-popup-styles';

const STYLES = `
@keyframes cmts-slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes cmts-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes cmts-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}

.cmts-overlay,
.cmts-overlay *,
.cmts-overlay *::before,
.cmts-overlay *::after {
  box-sizing: border-box;
}

.cmts-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
  animation: cmts-fade-in 200ms cubic-bezier(0.4, 0, 0.2, 1);
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.cmts-modal {
  background: #ffffff;
  color: #1a1a1a;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  animation: cmts-slide-up 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Header */
.cmts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
}

.cmts-header-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.cmts-logo {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  opacity: 0.8;
  transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.cmts-logo:hover { opacity: 1; }

.cmts-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: -0.5px;
  margin: 0;
}

.cmts-close {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #6b7280;
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.cmts-close:hover { background-color: #f3f4f6; color: #1a1a1a; }
.cmts-close:focus { outline: none; box-shadow: 0 0 0 3px rgba(6, 181, 123, 0.1); }
.cmts-close:active { transform: scale(0.95); }

/* Content */
.cmts-content { padding: 24px; }

/* Status */
.cmts-status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 16px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.cmts-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.cmts-dot--unset {
  background-color: #d1d5db;
  animation: cmts-pulse 2s infinite;
}

.cmts-dot--ready {
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  animation: cmts-pulse 2s infinite;
}

.cmts-dot--connected {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
}

.cmts-dot--disconnected {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.cmts-status-label {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  letter-spacing: 0.3px;
}

.cmts-info {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.6;
  color: #6b7280;
}

.cmts-info:empty { display: none; }

/* QR code */
.cmts-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.cmts-qr-img {
  width: 200px;
  height: 200px;
}

.cmts-qr-hint {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

/* Technical details */
.cmts-tech {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.cmts-tech-label {
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cmts-tech-code {
  font-size: 12px;
  word-break: break-all;
  user-select: all;
}

/* Request details panel (extra content) */
.cmts-event-info {
  margin-bottom: 24px;
  padding: 16px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.cmts-event-info h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: 0.3px;
}

.cmts-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.cmts-info-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.cmts-info-label {
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cmts-info-value {
  font-size: 13px;
  color: #1a1a1a;
  word-break: break-all;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: rgba(6, 181, 123, 0.05);
  padding: 8px;
  border-radius: 6px;
  overflow-x: auto;
}

/* Action */
.cmts-action {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.cmts-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 140px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #06b57b 0%, #059669 100%);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.cmts-btn:hover {
  background: linear-gradient(135deg, #05a366 0%, #047857 100%);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.cmts-btn:focus { outline: none; box-shadow: 0 0 0 3px rgba(6, 181, 123, 0.1); }
.cmts-btn:active { transform: scale(0.98); }

.cmts-btn--disabled,
.cmts-btn--disabled:hover,
.cmts-btn--disabled:active {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
  transform: none;
}

.cmts-hidden { display: none !important; }

@media (max-width: 640px) {
  .cmts-overlay { padding: 12px; }
  .cmts-modal { max-width: 100%; max-height: 95vh; border-radius: 12px; }
  .cmts-header { padding: 16px; }
  .cmts-title { font-size: 16px; }
  .cmts-logo { width: 24px; height: 24px; }
  .cmts-content { padding: 16px; }
  .cmts-action { flex-direction: column; }
  .cmts-btn { width: 100%; padding: 14px 20px; font-size: 13px; }
}

@media (prefers-color-scheme: dark) {
  .cmts-overlay { background: rgba(0, 0, 0, 0.6); }
  .cmts-modal { background: #1f2937; color: #f3f4f6; }
  .cmts-header {
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    border-bottom-color: #374151;
  }
  .cmts-title { color: #f9fafb; }
  .cmts-close { color: #9ca3af; }
  .cmts-close:hover { background-color: #374151; color: #f3f4f6; }
  .cmts-status-row,
  .cmts-event-info {
    background: #374151;
    border-color: #4b5563;
  }
  .cmts-status-label,
  .cmts-info,
  .cmts-qr-hint { color: #d1d5db; }
  .cmts-event-info h3 { color: #f9fafb; }
  .cmts-info-item { border-bottom-color: #4b5563; }
  .cmts-info-value { background-color: rgba(6, 181, 123, 0.1); color: #d1d5db; }
  .cmts-qr-img { background: #ffffff; border-radius: 8px; }
  .cmts-btn--disabled { background: #4b5563; }
}

@media print {
  .cmts-overlay { background: transparent; backdrop-filter: none; }
  .cmts-modal { box-shadow: none; border: 1px solid #e5e7eb; }
}
`;

const LOGO_SVG = `
<svg class="cmts-logo" viewBox="0 0 196 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g clip-path="url(#cmts-logo-clip)">
    <path d="M9.85159 16.8375L4.23731 22.4501L0.974794 19.1886C-0.323141 17.8894 -0.323141 15.7857 0.974794 14.4865L4.23731 11.225L9.85159 16.8375Z" fill="#0A043C"/>
    <path d="M15.4645 22.452L9.85071 28.0641L15.4645 33.6762L21.0783 28.0641L15.4645 22.452Z" fill="#0A043C"/>
    <path d="M18.7284 14.4865C20.0263 15.7857 20.0263 17.8894 18.7284 19.1886L15.4659 22.4501L9.85159 28.0626L4.2373 22.4501L9.85159 16.8375L4.2373 11.225L9.85159 5.61243L15.4659 11.225L18.7284 14.4865Z" fill="#06B57B"/>
    <path d="M15.4666 0.000478883L9.85278 5.61255L15.4666 11.2246L21.0804 5.61255L15.4666 0.000478883Z" fill="#0A043C"/>
    <path d="M29.6438 16.6543C29.6438 11.5045 31.2498 6.68799 38.7344 6.68799C45.3099 6.68799 47.6129 10.3837 47.6129 14.6247H42.6434C42.3403 12.0801 41.401 10.7169 38.7344 10.7169C35.1891 10.7169 34.6133 13.3524 34.6133 16.6543C34.6133 19.9562 35.1588 22.5916 38.7344 22.5916C41.4313 22.5916 42.3403 21.289 42.6434 18.6536H47.6432C47.6432 23.1369 45.3402 26.6205 38.7344 26.6205C31.2195 26.6205 29.6438 21.804 29.6438 16.6543Z" fill="#0A043C"/>
    <path d="M55.461 6.96228H61.6427L68.4909 26.3496H63.3396L62.279 23.0174H54.8247L53.7641 26.3496H48.6128L55.461 6.96228ZM61.2184 19.4109L58.5215 11.2319L55.8853 19.4109H61.2184Z" fill="#0A043C"/>
    <path d="M70.2484 6.96228H77.6724C85.1267 6.96228 85.8539 10.9003 85.8539 13.4449C85.8539 15.5957 85.1267 18.9582 80.4905 19.2308L86.7024 26.3496H80.7026L75.1573 19.0187V26.3496H70.2484V6.96228ZM77.6118 15.8666C80.3087 15.8666 80.8844 14.564 80.8844 13.4432C80.8844 12.2315 80.3087 10.9592 77.6118 10.9592H75.1573V15.8666H77.6118Z" fill="#0A043C"/>
    <path d="M89.0054 6.96228H96.0657L100.308 19.352C100.581 20.1396 100.823 21.0483 100.914 21.4422C101.005 21.0483 101.187 20.1396 101.459 19.352L105.823 6.96228H112.823V26.3496H107.884V13.0511L103.278 26.3496H98.5808L93.884 13.0511V26.3496H89.0054V6.96228Z" fill="#0A043C"/>
    <path d="M116.732 6.96228H130.762V10.9609H121.61V14.5657H129.852V18.3523H121.61V22.3509H130.762V26.3496H116.732V6.96228Z" fill="#0A043C"/>
    <path d="M133.911 6.96228H139.941L147.123 19.3217V6.96228H152.062V26.3496H146.274L138.881 14.0508V26.3496H133.911V6.96228Z" fill="#0A043C"/>
    <path d="M159.335 10.9592H154.456V6.96057H169.062V10.9592H164.183V26.3478H159.335V10.9592Z" fill="#0A043C"/>
    <path d="M171.395 6.96228H176.304V26.3496H171.395V6.96228Z" fill="#0A043C"/>
    <path d="M179.576 19.4715H184.455C184.546 21.4405 185.303 22.7431 188.122 22.7431C190.637 22.7431 191.243 21.7131 191.243 20.8043C191.243 16.8057 179.91 20.047 179.91 12.5648C179.91 9.59608 181.697 6.68799 187.849 6.68799C194 6.68799 195.697 9.59608 195.788 13.5341H190.94C190.849 11.8983 190.364 10.5654 187.637 10.5654C185.364 10.5654 184.788 11.4742 184.788 12.2921C184.788 15.8364 196 12.8677 196 20.5317C196 23.3186 194.515 26.6205 187.849 26.6205C181.819 26.6205 179.576 23.9245 179.576 19.4715Z" fill="#0A043C"/>
  </g>
  <defs>
    <clipPath id="cmts-logo-clip"><rect width="196" height="33.677" fill="white"/></clipPath>
  </defs>
</svg>
`;

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  unset:        'Initializing...',
  ready:        'Waiting for connection...',
  connected:    'Connected',
  disconnected: 'Disconnected',
};

const STATUS_INFO: Record<ConnectionStatus, string> = {
  unset:        '',
  ready:        'Click the button below to open Carmentis Desk and complete your request.',
  connected:    'Connection established. Please check Carmentis Desk to continue.',
  disconnected: 'Connection closed.',
};

const STATUSES: ConnectionStatus[] = ['unset', 'ready', 'connected', 'disconnected'];

export class CarmentisPopup {
  private session: CarmentisSession;
  private options: CarmentisPopupOptions;
  private status: ConnectionStatus = 'unset';
  private overlay: HTMLElement | null = null;
  private dot: HTMLElement | null = null;
  private statusLabel: HTMLElement | null = null;
  private infoEl: HTMLElement | null = null;
  private qrSection: HTMLElement | null = null;
  private qrImg: HTMLImageElement | null = null;
  private techSection: HTMLElement | null = null;
  private techCode: HTMLElement | null = null;
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
        const deepLink = this.session.getDeepLink();
        if (this.linkBtn) this.linkBtn.href = deepLink;
        if (this.techCode) this.techCode.textContent = deepLink;
        if (this.options.showTechnicalDetails && this.techSection) {
          this.techSection.classList.remove('cmts-hidden');
        }
        void this.showQrCode(deepLink);
        if (this.options.onReady) this.options.onReady();
      },

      onConnected: () => {
        this.setStatus('connected');
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
    this.status = status;
    if (this.dot) {
      for (const s of STATUSES) this.dot.classList.toggle(`cmts-dot--${s}`, s === status);
    }
    if (this.statusLabel) this.statusLabel.textContent = STATUS_LABEL[status];
    if (this.infoEl) this.infoEl.textContent = STATUS_INFO[status];

    // The button is usable only while a session exists on the relay.
    if (this.linkBtn) {
      const usable = status === 'ready' || status === 'connected';
      this.linkBtn.classList.toggle('cmts-btn--disabled', !usable);
      this.linkBtn.setAttribute('aria-disabled', String(!usable));
    }

    // The QR code and deep link are only relevant while waiting for Carmentis Desk.
    if (status !== 'ready') this.hideLink();
  }

  private async showQrCode(deepLink: string): Promise<void> {
    const dataUrl = await QRCode.toDataURL(deepLink, { width: 200, margin: 1 });
    // The popup may have been closed or the status may have changed while the QR code was generated.
    if (!this.overlay || this.status !== 'ready' || !this.qrImg || !this.qrSection) return;
    this.qrImg.src = dataUrl;
    this.qrSection.classList.remove('cmts-hidden');
  }

  private hideLink(): void {
    if (this.qrSection) this.qrSection.classList.add('cmts-hidden');
    if (this.qrImg) this.qrImg.removeAttribute('src');
    if (this.techSection) this.techSection.classList.add('cmts-hidden');
  }

  private buildDOM(): void {
    this.overlay = el('div', 'cmts-overlay');
    const modal = el('div', 'cmts-modal');

    // header
    const header = el('div', 'cmts-header');
    const headerMain = el('div', 'cmts-header-main');
    const logo = el('span', 'cmts-logo-wrap');
    logo.innerHTML = LOGO_SVG;
    const title = el('h2', 'cmts-title');
    title.textContent = this.options.title ?? 'Connect to Carmentis Desk';
    headerMain.append(logo, title);
    const closeBtn = el('button', 'cmts-close');
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => this.close());
    header.append(headerMain, closeBtn);

    const content = el('div', 'cmts-content');

    // status row
    const statusRow = el('div', 'cmts-status-row');
    this.dot = el('span', 'cmts-dot');
    this.statusLabel = el('span', 'cmts-status-label');
    statusRow.append(this.dot, this.statusLabel);

    // info text
    this.infoEl = el('p', 'cmts-info');

    // QR code (hidden until ready)
    this.qrSection = el('div', 'cmts-qr cmts-hidden');
    this.qrImg = el('img', 'cmts-qr-img');
    this.qrImg.alt = 'QR code to connect Carmentis Desk';
    const qrHint = el('p', 'cmts-qr-hint');
    qrHint.textContent = 'Or scan this QR code with Carmentis Desk';
    this.qrSection.append(this.qrImg, qrHint);

    // technical details (hidden until ready)
    this.techSection = el('div', 'cmts-tech cmts-hidden');
    const techLabel = el('span', 'cmts-tech-label');
    techLabel.textContent = 'Deep link:';
    this.techCode = el('code', 'cmts-tech-code');
    this.techSection.append(techLabel, this.techCode);

    content.append(statusRow, this.infoEl, this.qrSection, this.techSection);

    // extra content
    if (this.options.extraContent) {
      const extra = typeof this.options.extraContent === 'function'
        ? this.options.extraContent()
        : this.options.extraContent;
      content.append(extra);
    }

    // deep link button
    const action = el('div', 'cmts-action');
    this.linkBtn = document.createElement('a');
    this.linkBtn.className = 'cmts-btn';
    this.linkBtn.textContent = 'Open Carmentis Desk';
    this.linkBtn.target = '_blank';
    this.linkBtn.rel = 'noopener noreferrer';
    action.append(this.linkBtn);
    content.append(action);

    modal.append(header, content);
    this.overlay.appendChild(modal);
    document.body.appendChild(this.overlay);

    this.setStatus('unset');

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
  showTechnicalDetails?: boolean;
  extraContent?: CarmentisExtraContent;
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
      showTechnicalDetails: options.showTechnicalDetails,
      extraContent: options.extraContent,
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

// ─── Authentication popup ─────────────────────────────────────────────────────

export interface CarmentisAuthPopupOptions extends Omit<CarmentisJsonRpcPopupOptions, 'request'> {
  /** Base64-encoded challenge to be signed by the wallet. */
  challenge: string;
}

export function createCarmentisAuthPopup(options: CarmentisAuthPopupOptions): CarmentisJsonRpcPopup {
  const { challenge, ...rest } = options;
  return new CarmentisJsonRpcPopup({
    ...rest,
    title: rest.title ?? 'Authenticate with Carmentis Desk',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'wr-auth-pk',
      params: { base64EncodedChallenge: challenge },
    },
  });
}

// ─── Approval popup ───────────────────────────────────────────────────────────

export interface CarmentisApprovalPopupOptions extends Omit<CarmentisJsonRpcPopupOptions, 'request'> {
  anchorRequestId: string;
  serverUrl: string;
}

export function createCarmentisApprovalPopup(options: CarmentisApprovalPopupOptions): CarmentisJsonRpcPopup {
  const { anchorRequestId, serverUrl, ...rest } = options;
  return new CarmentisJsonRpcPopup({
    ...rest,
    title: rest.title ?? 'Approve Event',
    extraContent: rest.extraContent ?? (() => buildRequestDetails([
      ['Anchor Request ID:', anchorRequestId],
      ['Server URL:', serverUrl],
    ])),
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'wr-data-approval',
      params: { anchorRequestId, serverUrl },
    },
  });
}

function buildRequestDetails(rows: [label: string, value: string][]): HTMLElement {
  const panel = el('div', 'cmts-event-info');
  const heading = document.createElement('h3');
  heading.textContent = 'Request Details';
  panel.append(heading);
  for (const [label, value] of rows) {
    const item = el('div', 'cmts-info-item');
    const labelEl = el('span', 'cmts-info-label');
    labelEl.textContent = label;
    const valueEl = el('span', 'cmts-info-value');
    valueEl.textContent = value;
    item.append(labelEl, valueEl);
    panel.append(item);
  }
  return panel;
}
