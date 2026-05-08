// MCP client transport over WebRTC. Implements the `Transport` interface
// from @modelcontextprotocol/sdk. Connects to one MCP server in the
// matching lobby site.

import { join } from './lib/transport.mjs';

export class WebRTCClientTransport {
  constructor({
    siteId,
    lobbyNamespace,
    signalUrl,
    pairTimeoutMs,
    dcOpenTimeoutMs,
  } = {}) {
    if (!siteId) throw new Error('WebRTCClientTransport: { siteId } is required');
    this._opts = { siteId, lobbyNamespace, signalUrl, pairTimeoutMs, dcOpenTimeoutMs };
    this._session = null;
    this.onclose = undefined;
    this.onerror = undefined;
    this.onmessage = undefined;
  }

  async start() {
    if (this._session) return;
    this._session = await join(this._opts);
    await this._session.ready;
    this._session.onMessage((data) => { this.onmessage?.(data); });
    this._session.onClose(() => {
      this._session = null;
      this.onclose?.();
    });
  }

  async send(message) {
    if (!this._session) throw new Error('WebRTCClientTransport: not connected');
    const ok = this._session.send(message);
    if (!ok) throw new Error('WebRTCClientTransport: send failed (channel closed?)');
  }

  async close() {
    if (this._session) { this._session.close(); this._session = null; }
    this.onclose?.();
  }
}
