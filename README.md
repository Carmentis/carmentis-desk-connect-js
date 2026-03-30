# @cmts-dev/carmentis-desk-connect-js

Framework-agnostic JavaScript/TypeScript SDK for connecting web applications to [Carmentis Desk](https://carmentis.io).

It wraps [`@cmts-dev/carmentis-relay-client`](https://www.npmjs.com/package/@cmts-dev/carmentis-relay-client) to provide a simple API for creating relay sessions and communicating with the Carmentis Desk mobile application.

## How it works

```
Your Web App
    │
    ├─ Creates a session via the relay server
    ├─ Generates a deep link → user opens Carmentis Desk
    │
Relay Server (WebSocket bridge)
    │
Carmentis Desk (mobile app)
    │
    └─ Sends back signed responses (auth, approval, …)
```

## Installation

```bash
npm install @cmts-dev/carmentis-desk-connect-js
# or
pnpm add @cmts-dev/carmentis-desk-connect-js
```

## Usage

### JSON-RPC popup (recommended)

The simplest way to integrate — `createCarmentisJsonRpcPopup` injects a modal overlay directly into the DOM, handles the connection lifecycle, automatically sends your JSON-RPC 2.0 request when Carmentis Desk connects, and resolves with a typed response.

```ts
import { createCarmentisJsonRpcPopup } from '@cmts-dev/carmentis-desk-connect-js';

const popup = createCarmentisJsonRpcPopup({
  relayUrl: 'https://relay.testnet.carmentis.io',
  title: 'Authenticate with Carmentis Desk', // optional
  request: {
    jsonrpc: '2.0',
    id: 1,
    method: 'wr-auth-pk',
    params: { base64EncodedChallenge: 'dGVzdA==' },
  },

  onResponse(response) {
    console.log('Success:', response.result);
    popup.close();
  },

  onError(err) {
    console.error('JSON-RPC error:', err.message);
    popup.close();
  },

  onClose() {
    console.log('Popup dismissed');
  },
});

await popup.open();
```

### Low-level popup

If you need full control over what is sent (e.g. for non-JSON-RPC messages), use `createCarmentisPopup` directly:

```ts
import { createCarmentisPopup } from '@cmts-dev/carmentis-desk-connect-js';

const popup = createCarmentisPopup({
  relayUrl: 'https://relay.testnet.carmentis.io',
  title: 'Authenticate with Carmentis Desk', // optional

  onConnected() {
    // Carmentis Desk has joined — send your request
    popup.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'wr-auth-pk',
      params: { base64EncodedChallenge: 'dGVzdA==' },
    });
  },

  onMessage(message) {
    console.log('Response:', message);
    popup.close();
  },

  onClose() {
    console.log('Popup dismissed');
  },
});

await popup.open();
```

The popup goes through four visual states automatically:

| State | Indicator | Info text |
|-------|-----------|-----------|
| Initializing | Grey dot | Creating session… |
| Ready | Pulsing amber dot | Waiting for Carmentis Desk — link shown |
| Connected | Green dot | Processing request… |
| Disconnected | Red dot | Session closed |

You can also access the underlying session at any time:

```ts
const session = popup.getSession();
console.log(session.connectionStatus);
console.log(session.getDeepLink());
```

---

### Basic session

```ts
import { createCarmentisSession } from '@cmts-dev/carmentis-desk-connect-js';

const session = createCarmentisSession();

await session.connect({
  relayUrl: 'https://relay.testnet.carmentis.io',

  onReady() {
    // Session created on the relay — show the deep link / QR code to the user
    const deepLink = session.getDeepLink();
    console.log('Open in Carmentis Desk:', deepLink);
  },

  onConnected() {
    // Carmentis Desk has joined the session — send your request
    session.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'wr-auth-pk',
      params: { base64EncodedChallenge: 'dGVzdA==' },
    });
  },

  onMessage(message) {
    console.log('Response from Carmentis Desk:', message);
  },

  onDisconnected() {
    console.log('Session closed');
  },
});
```

### Deep link / QR code

Once the session is `ready`, call `getDeepLink()` to obtain the URL to share with the user (e.g. as a QR code):

```ts
const deepLink = session.getDeepLink();
// cmts://connect/carmentis-relay?relay=...&sessionId=...&symKey=...
```

### Sending a request

After the session reaches the `connected` state (Carmentis Desk has scanned the QR code), send a JSON-RPC 2.0 request:

```ts
session.send({
  jsonrpc: '2.0',
  id: 1,
  method: 'wr-data-approval',
  params: {
    anchorRequestId: '1234',
    serverUrl: 'https://server.testnet.carmentis.io',
  },
});
```

### Connection status

The `connectionStatus` property reflects the current state:

| Value          | Meaning                                      |
|----------------|----------------------------------------------|
| `'unset'`      | `connect()` has not been called yet          |
| `'ready'`      | Session created on the relay, waiting for Desk |
| `'connected'`  | Carmentis Desk has joined                    |
| `'disconnected'` | Session closed                             |

```ts
console.log(session.connectionStatus); // 'ready' | 'connected' | …
```

## API

### `createCarmentisJsonRpcPopup(options): CarmentisJsonRpcPopup`

Factory function returning a new `CarmentisJsonRpcPopup` instance. Sends the JSON-RPC request automatically when Carmentis Desk connects and handles response parsing. `options`:

| Property        | Type                                    | Description                                      |
|-----------------|-----------------------------------------|--------------------------------------------------|
| `relayUrl`      | `string`                                | URL of the Carmentis relay server                |
| `request`       | `JsonRpcRequest`                        | JSON-RPC 2.0 request to send on connect          |
| `title`         | `string?`                               | Modal title (optional)                           |
| `onReady`       | `() => void`                            | Called when the session is ready                 |
| `onConnected`   | `() => void`                            | Called when Desk joins the session               |
| `onDisconnected`| `() => void`                            | Called when the session closes                   |
| `onResponse`    | `(response: JsonRpcSuccessResponse) => void` | Called on a successful JSON-RPC response    |
| `onError`       | `(error: Error) => void`                | Called on a JSON-RPC error or invalid response   |
| `onClose`       | `() => void`                            | Called when the modal is closed                  |

### `jsonRpcPopup.open(): Promise<void>`

Injects the modal into `document.body` and starts the relay session.

### `jsonRpcPopup.close(): void`

Removes the modal from the DOM and calls `onClose`.

### `jsonRpcPopup.getSession(): CarmentisSession`

Returns the underlying `CarmentisSession` instance.

---

### `createCarmentisPopup(options): CarmentisPopup`

Factory function returning a new `CarmentisPopup` instance. `options`:

| Property        | Type                        | Description                          |
|-----------------|-----------------------------|--------------------------------------|
| `relayUrl`      | `string`                    | URL of the Carmentis relay server    |
| `title`         | `string?`                   | Modal title (optional)               |
| `onReady`       | `() => void`                | Called when the session is ready     |
| `onConnected`   | `() => void`                | Called when Desk joins the session   |
| `onDisconnected`| `() => void`                | Called when the session closes       |
| `onMessage`     | `(message: unknown) => void`| Called on each message from Desk     |
| `onClose`       | `() => void`                | Called when the modal is closed      |

### `popup.open(): Promise<void>`

Injects the modal into `document.body` and starts the relay session.

### `popup.close(): void`

Removes the modal from the DOM and calls `onClose`.

### `popup.send(request: unknown): void`

Sends a request to Carmentis Desk. Must be called after `onConnected`.

### `popup.getSession(): CarmentisSession`

Returns the underlying `CarmentisSession` instance.

---

### `createCarmentisSession(): CarmentisSession`

Factory function returning a new `CarmentisSession` instance.

### `session.connect(options): Promise<void>`

Opens a relay session. `options`:

| Property        | Type                        | Description                          |
|-----------------|-----------------------------|--------------------------------------|
| `relayUrl`      | `string`                    | URL of the Carmentis relay server    |
| `onReady`       | `() => void`                | Called when the session is ready     |
| `onConnected`   | `() => void`                | Called when Desk joins the session   |
| `onDisconnected`| `() => void`                | Called when the session closes       |
| `onMessage`     | `(message: unknown) => void`| Called on each message from Desk     |

### `session.send(request: unknown): void`

Sends a request to Carmentis Desk. Must be called after `onConnected`.

### `session.getDeepLink(): string`

Returns the deep link URL to open in Carmentis Desk. Available after `onReady`.

### `session.sessionId: string`

Relay session identifier.

### `session.symKey: string`

Symmetric encryption key for the session.

### `session.connectionStatus: ConnectionStatus`

Current connection state: `'unset' | 'ready' | 'connected' | 'disconnected'`.

### `session.messages: unknown[]`

All messages received from Carmentis Desk during the session.

## License

Apache-2.0
