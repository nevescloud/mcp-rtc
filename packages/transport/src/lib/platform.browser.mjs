// Browser platform module. Sibling of platform.mjs (Node). Same shape:
//
//   - RTCPeerConnection: native, from window
//   - storage: localStorage-backed, key 'mcp-rtc:peer-key', value = JSON
//
// Bundlers / CDNs pick this file over platform.mjs when resolving for a
// browser target, via the package.json "browser" field.

export const RTCPeerConnection = window.RTCPeerConnection;

const STORAGE_KEY = 'mcp-rtc:peer-key';

export const storage = {
  async read() {
    try {
      const text = window.localStorage.getItem(STORAGE_KEY);
      return text ? JSON.parse(text) : null;
    } catch { return null; }
  },
  async write(data) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* quota exceeded, private mode, etc. — best-effort */ }
  },
};
