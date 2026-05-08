// MCP server transport over WebRTC. Implements the `Transport` interface
// from @modelcontextprotocol/sdk. Single-session (V1) — accepts one client
// connection per transport instance. For multiple concurrent clients, run
// multiple transports (or a coordinator on top).

import { host } from './lib/transport.mjs';

export class WebRTCServerTransport {
  constructor({
    siteId,
    lobbyNamespace,
    signalUrl,
    dcOpenTimeoutMs,
  } = {}) {
    if (!siteId) throw new Error('WebRTCServerTransport: { siteId } is required');
    this._opts = { siteId, lobbyNamespace, signalUrl, dcOpenTimeoutMs };
    this._host = null;
    this._session = null;
    this.onclose = undefined;
    this.onerror = undefined;
    this.onmessage = undefined;
  }

  async start() {
    if (this._host) return;
    this._host = host(this._opts);

    this._host.onSession(async (session) => {
      try {
        await session.ready;
        if (this._session) {
          // V1: refuse subsequent clients; single connection.
          session.close();
          return;
        }
        this._session = session;
        session.onMessage((data) => { this.onmessage?.(data); });
        session.onClose(() => {
          if (this._session === session) {
            this._session = null;
            this.onclose?.();
          }
        });
      } catch (err) {
        this.onerror?.(err instanceof Error ? err : new Error(String(err)));
      }
    });

    this._host.onError((err) => {
      this.onerror?.(err instanceof Error ? err : new Error(String(err)));
    });
  }

  async send(message) {
    if (!this._session) throw new Error('WebRTCServerTransport: no client connected');
    const ok = this._session.send(message);
    if (!ok) throw new Error('WebRTCServerTransport: send failed (channel closed?)');
  }

  async close() {
    if (this._host) { this._host.close(); this._host = null; }
    if (this._session) { this._session.close(); this._session = null; }
    this.onclose?.();
  }
}
