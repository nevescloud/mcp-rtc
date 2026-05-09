// @jonasneves/mcp-rtc-bridge-tab — browser-side library that takes a remote
// MCP server reachable via @jonasneves/mcp-rtc and re-exposes its tools via
// WebMCP in the local tab. Result: any local Claude that a WebMCP consumer
// surfaces tools to (Claude.ai / Desktop with the Anthropic Chrome extension,
// Claude Code / Cursor via hatch, future implementations) can call the remote
// server's tools — no Node process on the user's machine, no public URL.
//
// Requires: a Chromium-based browser with `navigator.modelContext`
// (W3C-CG WebMCP draft, April 2026 +), and a WebMCP consumer attached.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WebRTCClientTransport } from '@jonasneves/mcp-rtc';

/**
 * Connect to a remote mcp-rtc server, discover its tools, and register
 * each one as a WebMCP tool in the current tab. Returns a handle with an
 * `unmount()` for cleanup.
 *
 * @param {object} opts
 * @param {string} opts.siteId            — rendezvous string for the remote peer.
 * @param {string} [opts.lobbyNamespace]  — defaults to 'mcp' (spec recommendation).
 * @param {string} [opts.namePrefix]      — prepended to each remote tool's
 *                                           name when registering with WebMCP.
 *                                           Defaults to ''.
 * @param {string} [opts.clientName]      — label this bridge announces to the
 *                                           remote peer. Defaults to
 *                                           'mcp-rtc-bridge-tab'.
 * @returns {Promise<{ siteId, tools, unmount }>} — `tools` is the array of
 *   registered WebMCP tool names; `unmount()` aborts registration and
 *   closes the WebRTC connection.
 */
export async function mountBridge({
  siteId,
  lobbyNamespace,
  namePrefix = '',
  clientName = 'mcp-rtc-bridge-tab',
} = {}) {
  if (!siteId) throw new Error('mountBridge: { siteId } is required');
  if (typeof navigator === 'undefined' || !navigator.modelContext) {
    throw new Error('mountBridge: navigator.modelContext is unavailable. ' +
      'Requires a Chromium-based browser implementing the WebMCP draft ' +
      '(e.g. Chrome 146+) with a WebMCP consumer attached such as the ' +
      'Anthropic Claude extension or hatch.');
  }

  const transport = new WebRTCClientTransport({ siteId, lobbyNamespace });
  const client = new Client({ name: clientName, version: '0.1.0' });
  await client.connect(transport);

  const { tools } = await client.listTools();
  const controller = new AbortController();
  const registered = [];

  for (const tool of tools) {
    const localName = namePrefix + tool.name;
    navigator.modelContext.registerTool({
      name: localName,
      description: tool.description ||
        `Forwarded from remote mcp-rtc peer "${siteId}".`,
      inputSchema: tool.inputSchema || { type: 'object', properties: {} },
      execute: async (inputParameters) => {
        // MCP tool-call response shape ({ content: [...] }) matches WebMCP's
        // expected response shape, so the result passes through unchanged.
        return await client.callTool({
          name: tool.name,
          arguments: inputParameters || {},
        });
      },
    }, { signal: controller.signal });
    registered.push(localName);
  }

  return {
    siteId,
    tools: registered,
    async unmount() {
      controller.abort();
      try { await client.close(); } catch {}
    },
  };
}
