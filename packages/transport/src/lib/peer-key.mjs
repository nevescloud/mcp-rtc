// Persistent device key + sign/verify primitives.
// Node: file at ~/.config/mcp-rtc/peer-key.json (override with MCP_RTC_KEY_PATH env).
// crypto.subtle, btoa, atob, TextEncoder are global in Node 22+.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

const STORAGE_PATH = process.env.MCP_RTC_KEY_PATH || join(homedir(), '.config/mcp-rtc/peer-key.json');

let _keyPair = null;
let _pubkeyB64 = null;
let _loadPromise = null;

function _b64encode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function _b64decode(s) {
  const base = (s || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = base.length % 4 === 0 ? base : base + '='.repeat(4 - (base.length % 4));
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function _readStored() {
  try {
    const text = await readFile(STORAGE_PATH, 'utf-8');
    return JSON.parse(text);
  } catch { return null; }
}

async function _writeStored(data) {
  try {
    await mkdir(dirname(STORAGE_PATH), { recursive: true });
    await writeFile(STORAGE_PATH, JSON.stringify(data));
  } catch { /* best-effort, like browser localStorage */ }
}

async function _loadOrCreate() {
  const stored = await _readStored();
  if (stored) {
    try {
      const privateKey = await crypto.subtle.importKey(
        'jwk', stored.privateKey,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false, ['sign']
      );
      const publicKey = await crypto.subtle.importKey(
        'jwk', stored.publicKey,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true, ['verify']
      );
      return { privateKey, publicKey };
    } catch { /* corrupted — regenerate */ }
  }
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true, ['sign', 'verify']
  );
  try {
    const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    await _writeStored({ privateKey: privateJwk, publicKey: publicJwk });
  } catch { /* persist best-effort */ }
  return pair;
}

export async function getMyKeyPair() {
  if (_keyPair) return _keyPair;
  if (!_loadPromise) _loadPromise = _loadOrCreate();
  _keyPair = await _loadPromise;
  return _keyPair;
}

export async function getMyPubkeyB64() {
  if (_pubkeyB64) return _pubkeyB64;
  const { publicKey } = await getMyKeyPair();
  const raw = await crypto.subtle.exportKey('raw', publicKey);
  _pubkeyB64 = _b64encode(raw);
  return _pubkeyB64;
}

export async function signBytes(bytes) {
  const { privateKey } = await getMyKeyPair();
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey, bytes
  );
  return _b64encode(sig);
}

export async function verifyBytes(bytes, sigB64, pubkeyB64) {
  try {
    const raw = _b64decode(pubkeyB64);
    const pubkey = await crypto.subtle.importKey(
      'raw', raw,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['verify']
    );
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pubkey, _b64decode(sigB64), bytes
    );
  } catch {
    return false;
  }
}

export function canonical(obj) {
  if (obj === null || obj === undefined) return JSON.stringify(obj);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonical).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(obj[k])).join(',') + '}';
}
