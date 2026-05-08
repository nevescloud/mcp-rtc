// Node port of pip-relay's pair-request.js. Lobby is required (no fallback
// to discover/), since this client is for joining specific rooms.

import { getMyPubkeyB64 } from './peer-key.mjs';

const DEFAULT_REQUEST_TTL_MS  = 30_000;
const DEFAULT_RESPONSE_TTL_MS = 30_000;
const DEFAULT_TIMEOUT_MS      = 30_000;
const MAX_HANDLED_NONCES      = 1000;

export function pairRequestClient({ app, sign = true, lobby = null } = {}) {
  if (!app) throw new Error('pairRequestClient: app namespace required');
  if (!lobby) throw new Error('pairRequestClient: lobby required');

  const REQUEST_APP  = app + '-request';
  const RESPONSE_APP = app + '-response';

  let _myPubkey = null;
  async function _ensureMyPubkey() {
    if (!_myPubkey) _myPubkey = await getMyPubkeyB64();
    return _myPubkey;
  }

  const _pendingInitiations = new Map();
  const _handledInboundNonces = new Set();
  const _handledInboundOrder = [];
  function _markHandled(nonce) {
    if (_handledInboundNonces.has(nonce)) return;
    _handledInboundNonces.add(nonce);
    _handledInboundOrder.push(nonce);
    if (_handledInboundOrder.length > MAX_HANDLED_NONCES) {
      const drop = _handledInboundOrder.splice(0, MAX_HANDLED_NONCES / 2);
      for (const n of drop) _handledInboundNonces.delete(n);
    }
  }

  let _matchFn = null, _handlerFn = null, _errorFn = null;

  let _subscriptionActive = false;
  function _ensureSubscription() {
    if (_subscriptionActive) return;
    _subscriptionActive = true;
    lobby.onChange((ads) => {
      for (const ad of ads || []) {
        const d = ad.data;
        if (!d) continue;
        if (d.app === RESPONSE_APP) _dispatchResponse(ad);
        else if (d.app === REQUEST_APP) _dispatchRequest(ad);
      }
    });
  }

  function _dispatchResponse(ad) {
    const d = ad.data;
    if (!_myPubkey || d.target !== _myPubkey) return;
    const pending = _pendingInitiations.get(d.nonce);
    if (!pending) return;
    _pendingInitiations.delete(d.nonce);
    clearTimeout(pending.timer);
    try { lobby.remove(REQUEST_APP + ':' + d.nonce); } catch {}
    const { accepted, target: _t, nonce: _n, app: _a, ...rest } = d;
    pending.resolve(accepted
      ? { accepted: true, data: rest }
      : { accepted: false, reason: 'denied', data: rest });
  }

  function _dispatchRequest(ad) {
    const d = ad.data;
    if (!_handlerFn || !d.nonce || _handledInboundNonces.has(d.nonce)) return;
    if (_matchFn && !_matchFn(ad)) return;
    _markHandled(d.nonce);
    const senderPubkey = d._pubkey || null;
    const { app: _a, nonce: _n, _pubkey: _p, _sig: _s, ...payload } = d;
    const req = {
      senderPubkey,
      payload,
      accept: (resp = {}) => _publishResponse(true, senderPubkey, d.nonce, resp),
      deny:   (resp = {}) => _publishResponse(false, senderPubkey, d.nonce, resp),
    };
    Promise.resolve()
      .then(() => _handlerFn(req))
      .catch((err) => {
        try { _publishResponse(false, senderPubkey, d.nonce, { reason: 'error' }); } catch {}
        if (_errorFn) { try { _errorFn(err, req); } catch {} }
        throw err;
      });
  }

  function _publishResponse(accepted, targetPubkey, nonce, payload) {
    return lobby.publish(RESPONSE_APP + ':' + nonce, {
      app: RESPONSE_APP,
      target: targetPubkey,
      nonce,
      accepted: !!accepted,
      ...payload,
    }, DEFAULT_RESPONSE_TTL_MS);
  }

  async function request({ payload = {}, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    await _ensureMyPubkey();
    _ensureSubscription();
    const nonce = crypto.randomUUID();
    const p = new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (!_pendingInitiations.has(nonce)) return;
        _pendingInitiations.delete(nonce);
        try { lobby.remove(REQUEST_APP + ':' + nonce); } catch {}
        resolve({ accepted: false, reason: 'timeout', timedOut: true });
      }, timeoutMs);
      _pendingInitiations.set(nonce, { resolve, timer });
    });
    try {
      lobby.publish(REQUEST_APP + ':' + nonce, {
        app: REQUEST_APP, nonce, ...payload,
      }, DEFAULT_REQUEST_TTL_MS);
    } catch (err) {
      const pending = _pendingInitiations.get(nonce);
      if (pending) {
        _pendingInitiations.delete(nonce);
        clearTimeout(pending.timer);
        pending.resolve({ accepted: false, reason: 'error', error: err });
      }
    }
    return p;
  }

  function onRequest(handler, { match = null, onError = null } = {}) {
    _ensureMyPubkey().catch(() => {});
    _matchFn = match; _handlerFn = handler; _errorFn = onError;
    _ensureSubscription();
  }

  return { request, onRequest };
}
