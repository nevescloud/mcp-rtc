// Node port of pip-relay's room-lobby.js. WebSocket and crypto.subtle are
// global in Node 22+.

import { getMyPubkeyB64, signBytes, verifyBytes, canonical } from './peer-key.mjs';

const DEFAULT_SIGNAL_URL = 'https://signal.neevs.io';
const RECONNECT_BASE_MS = 1500;
const RECONNECT_MAX_MS  = 30_000;
const HEARTBEAT_MS      = 20_000;
const REPUBLISH_MS      = 25_000;
const PRUNE_MS          = 5_000;

async function _envelopeForPublish(id, data) {
  const pubkey = await getMyPubkeyB64();
  const bytes = new TextEncoder().encode(canonical({ id, data, pubkey }));
  const sig = await signBytes(bytes);
  return { ...data, _pubkey: pubkey, _sig: sig };
}

// Reject incoming ads whose signature doesn't match the claimed pubkey.
// Without this, any peer in the lobby could forge pair-responses on our
// nonce and redirect our WebRTC dial. Cache verifies — same ad replays
// on every onChange while it's live.
const _verifyCache = new Map();
const VERIFY_CACHE_MAX = 256;
async function _verifyAd(ad) {
  const data = ad && ad.data;
  if (!data || !data._sig || !data._pubkey) return false;
  const cacheKey = ad.id + '|' + data._sig;
  if (_verifyCache.has(cacheKey)) return _verifyCache.get(cacheKey);
  const { _sig, _pubkey, ...rest } = data;
  const bytes = new TextEncoder().encode(canonical({ id: ad.id, data: rest, pubkey: _pubkey }));
  const ok = await verifyBytes(bytes, _sig, _pubkey);
  if (_verifyCache.size >= VERIFY_CACHE_MAX) {
    _verifyCache.delete(_verifyCache.keys().next().value);
  }
  _verifyCache.set(cacheKey, ok);
  return ok;
}

class RoomLobbyClient {
  constructor(opts = {}) {
    if (!opts.room) throw new Error('roomLobby: { room } required');
    const base = (opts.signalUrl || DEFAULT_SIGNAL_URL).replace(/^http/, 'ws');
    this._url = base + '/' + encodeURIComponent(opts.room) + '/ws';
    this._sign = !!opts.sign;
    this._myPeerId = opts.peerId || ('lobby-' + Math.random().toString(36).slice(2, 10));
    this._ws = null;
    this._listeners = new Set();
    this._foreign = new Map();
    this._myAds = new Map();
    this._reconnectDelay = RECONNECT_BASE_MS;
    this._reconnectTimer = null;
    this._heartbeatTimer = null;
    this._republishTimer = null;
    this._pruneTimer = setInterval(() => this._pruneAndNotify(), PRUNE_MS);
    this._closed = false;
    this._connect();
  }

  _connect() {
    if (this._closed) return;
    try { this._ws = new WebSocket(this._url); }
    catch { this._scheduleReconnect(); return; }

    this._ws.addEventListener('open', () => {
      this._reconnectDelay = RECONNECT_BASE_MS;
      for (const [id, payload] of this._myAds) {
        this._sendPublish(id, payload.data, payload.ttl);
      }
      this._startHeartbeat();
      this._startRepublish();
    });
    this._ws.addEventListener('message', (e) => this._onMessage(e));
    this._ws.addEventListener('close', () => {
      this._stopHeartbeat();
      this._stopRepublish();
      this._scheduleReconnect();
    });
    this._ws.addEventListener('error', () => {});
  }

  async _onMessage(e) {
    let msg; try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.type !== 'signal') return;
    const peerId = msg.peer;
    if (!peerId || peerId === this._myPeerId) return;
    const d = msg.data;
    if (!d || typeof d !== 'object') return;

    if (d.kind === 'lobby-ad') {
      if (!d.id) return;
      if (this._sign && !(await _verifyAd({ id: d.id, data: d.data }))) return;
      let table = this._foreign.get(peerId);
      if (!table) { table = new Map(); this._foreign.set(peerId, table); }
      const expiresAt = d.ttl ? Date.now() + d.ttl : 0;
      table.set(d.id, { data: d.data, expiresAt });
      this._notify();
    } else if (d.kind === 'lobby-remove') {
      const table = this._foreign.get(peerId);
      if (!table) return;
      table.delete(d.id);
      if (table.size === 0) this._foreign.delete(peerId);
      this._notify();
    }
  }

  _scheduleReconnect() {
    if (this._closed || this._reconnectTimer) return;
    const delay = this._reconnectDelay + Math.random() * 1000;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._reconnectDelay = Math.min(this._reconnectDelay * 2, RECONNECT_MAX_MS);
      this._connect();
    }, delay);
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      if (this._ws && this._ws.readyState === 1) {
        try { this._ws.send(JSON.stringify({ type: 'ping' })); } catch {}
      }
    }, HEARTBEAT_MS);
  }
  _stopHeartbeat() {
    if (this._heartbeatTimer) { clearInterval(this._heartbeatTimer); this._heartbeatTimer = null; }
  }

  _startRepublish() {
    this._stopRepublish();
    this._republishTimer = setInterval(() => {
      if (!this._ws || this._ws.readyState !== 1) return;
      for (const [id, payload] of this._myAds) {
        this._sendPublish(id, payload.data, payload.ttl);
      }
    }, REPUBLISH_MS);
  }
  _stopRepublish() {
    if (this._republishTimer) { clearInterval(this._republishTimer); this._republishTimer = null; }
  }

  async _sendPublish(id, data, ttl) {
    if (!this._ws || this._ws.readyState !== 1) return;
    let payload = data;
    if (this._sign) {
      try { payload = await _envelopeForPublish(id, data); }
      catch { return; }
      if (!this._ws || this._ws.readyState !== 1) return;
    }
    try {
      this._ws.send(JSON.stringify({
        type: 'signal',
        peer: this._myPeerId,
        data: { kind: 'lobby-ad', id, data: payload, ttl },
      }));
    } catch {}
  }

  _pruneAndNotify() {
    const now = Date.now();
    let dirty = false;
    for (const [peerId, table] of this._foreign) {
      for (const [id, ad] of table) {
        if (ad.expiresAt && ad.expiresAt < now) { table.delete(id); dirty = true; }
      }
      if (table.size === 0) this._foreign.delete(peerId);
    }
    for (const [id, ad] of this._myAds) {
      if (ad.expiresAt && ad.expiresAt < now) { this._myAds.delete(id); dirty = true; }
    }
    if (dirty) this._notify();
  }

  _ads() {
    const out = [];
    for (const [id, ad] of this._myAds) out.push({ id, data: ad.data });
    for (const table of this._foreign.values()) {
      for (const [id, ad] of table) out.push({ id, data: ad.data });
    }
    return out;
  }

  _notify() {
    const ads = this._ads();
    for (const fn of this._listeners) {
      try { fn(ads); } catch {}
    }
  }

  publish(id, data, ttlMs) {
    const expiresAt = ttlMs ? Date.now() + ttlMs : 0;
    this._myAds.set(id, { data, ttl: ttlMs, expiresAt });
    this._sendPublish(id, data, ttlMs);
    this._notify();
  }

  remove(id) {
    if (!this._myAds.has(id)) return;
    this._myAds.delete(id);
    if (this._ws && this._ws.readyState === 1) {
      try {
        this._ws.send(JSON.stringify({
          type: 'signal',
          peer: this._myPeerId,
          data: { kind: 'lobby-remove', id },
        }));
      } catch {}
    }
    this._notify();
  }

  onChange(cb) {
    this._listeners.add(cb);
    try { cb(this._ads()); } catch {}
    return () => this._listeners.delete(cb);
  }

  ads() { return this._ads(); }

  close() {
    this._closed = true;
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    this._stopHeartbeat();
    this._stopRepublish();
    if (this._pruneTimer) { clearInterval(this._pruneTimer); this._pruneTimer = null; }
    if (this._ws) { try { this._ws.close(); } catch {} this._ws = null; }
    this._listeners.clear();
    this._foreign.clear();
    this._myAds.clear();
  }
}

export function roomLobby(opts) { return new RoomLobbyClient(opts); }
