// WebRTC transport substrate. Both visitor (join) and host sides.
// Implements Layers 1–3 of ../../../../SPEC.md (transport, signaling,
// identity). RTCPeerConnection comes from ./platform.mjs (Node:
// node-datachannel/polyfill; browser: native via window). WebSocket and
// fetch are global in Node 22+ and in browsers.
//
// Pairing happens in a fixed lobby (`<lobbyNamespace>:<siteId>`). Each
// accepted pair-request returns an ephemeral room id used to negotiate
// the WebRTC offer/answer + ICE. After the data channel opens, all traffic
// flows peer-to-peer.

import { RTCPeerConnection } from './platform.mjs';
import { roomLobby } from './room-lobby.mjs';
import { pairRequestClient } from './pair-request.mjs';

const SIGNAL_BASE = 'https://signal.neevs.io';
const TURN_ENDPOINT = 'https://proxy.neevs.io/cloudflare/turn';
const STUN_FALLBACK = [{ urls: 'stun:stun.cloudflare.com:3478' }];
const DEFAULT_LOBBY_NAMESPACE = 'mcp';
const DEFAULT_PAIR_TIMEOUT_MS    = 30_000;
const DEFAULT_DC_OPEN_TIMEOUT_MS = 30_000;

async function fetchIceServers() {
  try {
    const r = await fetch(TURN_ENDPOINT, { method: 'POST' });
    if (!r.ok) throw new Error(`turn: ${r.status}`);
    const { iceServers } = await r.json();
    return [...STUN_FALLBACK, ...iceServers];
  } catch {
    return STUN_FALLBACK;
  }
}

function openRoomWs(room, myPeerId, signalUrl = SIGNAL_BASE) {
  const url = signalUrl.replace(/^http/, 'ws') + '/' + encodeURIComponent(room) + '/ws';
  const ws = new WebSocket(url);
  const listeners = new Set();
  const buffered = [];
  let resolveOpen;
  const opened = new Promise((r) => { resolveOpen = r; });

  ws.addEventListener('open', () => {
    while (buffered.length) {
      try { ws.send(buffered.shift()); } catch {}
    }
    resolveOpen();
  });
  ws.addEventListener('message', (e) => {
    let msg; try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.type !== 'signal' || msg.peer === myPeerId) return;
    for (const fn of listeners) {
      try { fn(msg); } catch (err) { console.warn('[mcp-rtc] ws listener', err); }
    }
  });

  return {
    opened,
    on(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    send(data) {
      const frame = JSON.stringify({ type: 'signal', peer: myPeerId, data });
      if (ws.readyState === 1) {
        try { ws.send(frame); } catch {}
      } else {
        buffered.push(frame);
      }
    },
    close() { listeners.clear(); try { ws.close(); } catch {} },
  };
}

// Visitor side. Sends one pair-request, awaits ephemeral room, dials WebRTC,
// returns a session whose `ready` resolves when the data channel opens.
export async function join({
  siteId,
  lobbyNamespace = DEFAULT_LOBBY_NAMESPACE,
  signalUrl = SIGNAL_BASE,
  pairTimeoutMs = DEFAULT_PAIR_TIMEOUT_MS,
  dcOpenTimeoutMs = DEFAULT_DC_OPEN_TIMEOUT_MS,
} = {}) {
  if (!siteId) throw new Error('join: { siteId } is required');

  const lobbyRoom = `${lobbyNamespace}:${siteId}`;
  const lobby = roomLobby({ room: lobbyRoom, signalUrl, sign: true });
  const pr = pairRequestClient({ app: lobbyNamespace, lobby, sign: true });

  let result;
  try {
    result = await pr.request({
      payload: { kind: 'visitor-hello' },
      timeoutMs: pairTimeoutMs,
    });
  } finally {
    lobby.close();
  }

  if (!result.accepted) throw new Error(`pair-request: ${result.reason || 'unknown'}`);
  const ephemeralRoom = result.data?.room;
  if (!ephemeralRoom) throw new Error('pair-request: response missing room');

  const myPeerId = 'visitor-' + Math.random().toString(36).slice(2, 8);
  const ws = openRoomWs(ephemeralRoom, myPeerId, signalUrl);
  const iceServers = await fetchIceServers();
  const pc = new RTCPeerConnection({ iceServers });
  const dc = pc.createDataChannel('mcp');

  pc.onicecandidate = (e) => { if (e.candidate) ws.send({ ice: e.candidate }); };
  ws.on(async (msg) => {
    if (msg.data?.answer) {
      try { await pc.setRemoteDescription(msg.data.answer); }
      catch (err) { console.warn('[mcp-rtc] setRemoteDescription', err); }
    } else if (msg.data?.ice) {
      try { await pc.addIceCandidate(msg.data.ice); } catch {}
    }
  });

  await ws.opened;
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  ws.send({ offer });

  return wrapSession({ pc, dc, ws, dcOpenTimeoutMs });
}

// Host side. Opens the lobby, accepts incoming pair-requests, spins up one
// peer connection per visitor. Returns { onSession, onError, sessions, close }.
export function host({
  siteId,
  lobbyNamespace = DEFAULT_LOBBY_NAMESPACE,
  signalUrl = SIGNAL_BASE,
  dcOpenTimeoutMs = DEFAULT_DC_OPEN_TIMEOUT_MS,
} = {}) {
  if (!siteId) throw new Error('host: { siteId } is required');

  const lobbyRoom = `${lobbyNamespace}:${siteId}`;
  const lobby = roomLobby({ room: lobbyRoom, signalUrl, sign: true });
  const pr = pairRequestClient({ app: lobbyNamespace, lobby, sign: true });
  const sessionListeners = new Set();
  const errorListeners = new Set();
  const sessions = new Set();
  let closed = false;

  pr.onRequest(async (req) => {
    if (closed) return;
    if (req.payload?.kind !== 'visitor-hello') {
      await req.deny({ reason: 'unknown kind' });
      return;
    }
    const ephemeralRoom = `mcp-session-${crypto.randomUUID()}`;
    const myPeerId = 'host-' + Math.random().toString(36).slice(2, 8);
    await req.accept({ room: ephemeralRoom, hostPeerId: myPeerId });

    const ws = openRoomWs(ephemeralRoom, myPeerId, signalUrl);
    const iceServers = await fetchIceServers();
    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (e) => { if (e.candidate) ws.send({ ice: e.candidate }); };
    pc.ondatachannel = (e) => {
      const session = wrapSession({ pc, dc: e.channel, ws, dcOpenTimeoutMs, visitorPubkey: req.senderPubkey });
      sessions.add(session);
      session.onClose(() => sessions.delete(session));
      for (const fn of sessionListeners) {
        try { fn(session); } catch (err) { console.warn('[mcp-rtc] session listener', err); }
      }
    };

    ws.on(async (msg) => {
      try {
        if (msg.data?.offer) {
          await pc.setRemoteDescription(msg.data.offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send({ answer });
        } else if (msg.data?.ice) {
          try { await pc.addIceCandidate(msg.data.ice); } catch {}
        }
      } catch (err) {
        for (const fn of errorListeners) { try { fn(err); } catch {} }
      }
    });
  });

  return {
    onSession(cb) { sessionListeners.add(cb); return () => sessionListeners.delete(cb); },
    onError(cb)   { errorListeners.add(cb);   return () => errorListeners.delete(cb); },
    sessions: () => [...sessions],
    close() {
      if (closed) return;
      closed = true;
      lobby.close();
      for (const s of sessions) s.close();
    },
  };
}

function wrapSession({ pc, dc, ws, dcOpenTimeoutMs, visitorPubkey = null }) {
  const messageListeners = new Set();
  const closeListeners = new Set();
  let closed = false;

  const ready = new Promise((resolve, reject) => {
    if (dc.readyState === 'open') { resolve(); return; }
    const timer = setTimeout(() => reject(new Error('data channel open timeout')), dcOpenTimeoutMs);
    dc.addEventListener('open',  () => { clearTimeout(timer); resolve(); }, { once: true });
    dc.addEventListener('error', (e) => { clearTimeout(timer); reject(e); }, { once: true });
  });

  dc.addEventListener('message', (e) => {
    let payload;
    try { payload = JSON.parse(e.data); }
    catch { payload = { kind: 'text', text: String(e.data) }; }
    for (const fn of messageListeners) {
      try { fn(payload); } catch (err) { console.warn('[mcp-rtc] message listener', err); }
    }
  });

  function close() {
    if (closed) return;
    closed = true;
    try { dc.close(); } catch {}
    try { pc.close(); } catch {}
    try { ws.close(); } catch {}
    for (const fn of closeListeners) { try { fn(); } catch {} }
  }

  pc.addEventListener('connectionstatechange', () => {
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) close();
  });

  return {
    ready,
    visitorPubkey,
    send(msg) {
      if (closed || dc.readyState !== 'open') return false;
      const payload = typeof msg === 'string' ? msg : JSON.stringify(msg);
      try { dc.send(payload); return true; } catch { return false; }
    },
    onMessage(cb) { messageListeners.add(cb); return () => messageListeners.delete(cb); },
    onClose(cb)   { closeListeners.add(cb);   return () => closeListeners.delete(cb); },
    close,
  };
}
