// MCP server transport over WebRTC. Implements the `Transport` interface
// from @modelcontextprotocol/sdk. Single-session — accepts one *live*
// client connection per transport instance. A new dial that arrives while
// an old session is dead-but-not-yet-cleaned-up replaces it; otherwise
// the new dial is refused.

import { host } from '@nevescloud/stoa';

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
    // Inbound messages may arrive at session.onMessage *before* the SDK
    // has attached its handler at this.onmessage. We buffer in that
    // window and drain once the handler exists. Without this, the very
    // first MCP message from the client (typically `initialize`) gets
    // dropped, and the client's connect() times out — a known bug noted
    // in confer's CLAUDE.md as the "race-condition gotcha."
    this._earlyBuffer = [];
    this.onclose = undefined;
    this.onerror = undefined;
    this.onmessage = undefined;
  }

  // Internal: whenever onmessage is set (by the SDK during connect), drain
  // anything we buffered before the handler existed. Uses a property
  // setter so the SDK's `transport.onmessage = handler` triggers the drain
  // automatically.
  set onmessage(handler) {
    this._onmessage = handler;
    if (typeof handler === 'function') {
      while (this._earlyBuffer.length) handler(this._earlyBuffer.shift());
    }
  }
  get onmessage() { return this._onmessage; }

  async start() {
    if (this._host) return;
    this._host = host(this._opts);

    this._host.onSession(async (session) => {
      try {
        await session.ready;

        // Drop a stale session whose data channel is no longer open. The
        // peer's connectionstatechange / onClose can take several seconds
        // to fire after a hard drop; if a fresh dial arrives in that
        // window, we'd otherwise refuse it. Distinguishing live from
        // dead lets reconnects succeed promptly.
        if (this._session && !this._session.isAlive()) {
          try { this._session.close(); } catch {}
          this._session = null;
        }
        if (this._session) {
          // Existing live session — refuse the new dial.
          session.close();
          return;
        }
        this._session = session;
        session.onMessage((data) => {
          if (typeof this._onmessage === 'function') this._onmessage(data);
          else this._earlyBuffer.push(data);
        });
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
