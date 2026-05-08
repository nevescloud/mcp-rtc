// Runtime-agnostic platform module. Exposes the bits the rest of the
// transport substrate needs (RTCPeerConnection, key-pair storage) and
// resolves them lazily based on the runtime.
//
// Node: RTCPeerConnection from node-datachannel/polyfill; key-pair stored
//   at ~/.config/mcp-rtc/peer-key.json (override with MCP_RTC_KEY_PATH).
// Browser: native window.RTCPeerConnection; key-pair stored in
//   localStorage under 'mcp-rtc:peer-key'.
//
// Node deps are gated behind `typeof window === 'undefined'` so bundlers
// targeting browsers eliminate the branch and never try to resolve
// node:fs / node-datachannel.

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

let _RTCPeerConnection;
let _storage;

if (isBrowser) {
  _RTCPeerConnection = window.RTCPeerConnection;
  _storage = {
    async read() {
      try {
        const text = window.localStorage.getItem('mcp-rtc:peer-key');
        return text ? JSON.parse(text) : null;
      } catch { return null; }
    },
    async write(data) {
      try { window.localStorage.setItem('mcp-rtc:peer-key', JSON.stringify(data)); }
      catch { /* quota / private mode — best-effort */ }
    },
  };
} else {
  const { RTCPeerConnection: NDC } = await import('node-datachannel/polyfill');
  const { readFile, writeFile, mkdir } = await import('node:fs/promises');
  const { homedir } = await import('node:os');
  const { join, dirname } = await import('node:path');
  const STORAGE_PATH = process.env.MCP_RTC_KEY_PATH || join(homedir(), '.config/mcp-rtc/peer-key.json');
  _RTCPeerConnection = NDC;
  _storage = {
    async read() {
      try { return JSON.parse(await readFile(STORAGE_PATH, 'utf-8')); }
      catch { return null; }
    },
    async write(data) {
      try {
        await mkdir(dirname(STORAGE_PATH), { recursive: true });
        await writeFile(STORAGE_PATH, JSON.stringify(data));
      } catch { /* best-effort, like browser localStorage */ }
    },
  };
}

export const RTCPeerConnection = _RTCPeerConnection;
export const storage = _storage;
