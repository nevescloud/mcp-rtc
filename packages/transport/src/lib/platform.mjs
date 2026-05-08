// Node platform module. Exports the runtime-specific bits the rest of
// the transport substrate needs:
//
//   - RTCPeerConnection: from node-datachannel/polyfill
//   - storage: file-backed JSON read/write at ~/.config/mcp-rtc/peer-key.json
//
// The browser sibling (platform.browser.mjs) exports the same shape using
// native RTCPeerConnection and localStorage. Bundlers / CDNs substitute the
// browser file via the package.json "browser" field.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { RTCPeerConnection as NDCRTCPeerConnection } from 'node-datachannel/polyfill';

export const RTCPeerConnection = NDCRTCPeerConnection;

const STORAGE_PATH = process.env.MCP_RTC_KEY_PATH || join(homedir(), '.config/mcp-rtc/peer-key.json');

export const storage = {
  async read() {
    try {
      const text = await readFile(STORAGE_PATH, 'utf-8');
      return JSON.parse(text);
    } catch { return null; }
  },
  async write(data) {
    try {
      await mkdir(dirname(STORAGE_PATH), { recursive: true });
      await writeFile(STORAGE_PATH, JSON.stringify(data));
    } catch { /* best-effort, like browser localStorage */ }
  },
};
