#!/usr/bin/env node
// @nevescloud/mcp-rtc-bridge — stdio MCP server that lets a local MCP
// client (e.g. Claude Code) reach MCP servers hosted on the mcp-rtc mesh
// via @nevescloud/mcp-rtc.
//
// Two built-in tools:
//   connect({ id, lobbyNamespace? })  — establish WebRTC + MCP client
//                                       connection to a remote peer
//   disconnect()                      — close it
//
// On connect, the peer's tools are discovered via tools/list and registered
// dynamically as `peer_<toolname>` on the bridge. A tools/list_changed
// notification is sent so the local MCP client picks them up. The bridge
// forwards arguments through unchanged; the peer validates per its schema.
//
//   npx @nevescloud/mcp-rtc-bridge
//   npx @nevescloud/mcp-rtc-bridge --auto-connect <id> [--lobby <ns>]
//
// Ids may be passed with or without a leading '#' (so values copy-pasted
// from a fragment-style URL like neves.cloud/eyes#b79c work directly).

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WebRTCClientTransport } from '@nevescloud/mcp-rtc';
import { z } from 'zod';

const BRIDGE_VERSION = '0.5.0';

// CLI args. Tiny ad-hoc parser — only two flags, not worth a dep.
//   --auto-connect <id>    call connect() at startup with this id
//   --lobby <namespace>    lobby for the auto-connect (default 'mcp')
// Use case: an MCP install that targets a known peer up-front, so the
// peer_* tools are present without the user having to call connect by
// hand each session. The runtime `connect` tool stays available for
// switching peers.
const normalizeId = (s) => (s || '').replace(/^#/, '');
let autoConnectId = null;
let autoConnectLobby = null;
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--auto-connect' && i + 1 < argv.length) {
      autoConnectId = normalizeId(argv[++i]);
    } else if (argv[i] === '--lobby' && i + 1 < argv.length) {
      autoConnectLobby = argv[++i];
    }
  }
}

const bridge = new McpServer({ name: 'mcp-rtc-bridge', version: BRIDGE_VERSION });

// Loading messages cycled while connect is in flight. Aim: text-message
// register, not literary. Friendly, low-key, varied.
const KNOCK_MESSAGES = [
  'knock knock',
  'anyone home?',
  '*polite cough*',
  'still knocking',
  'psst…',
  'any minute now…',
  'hmm',
  'still here',
];
const KNOCK_INTERVAL_MS = 2500;

// Default lobby. mcp-rtc native servers (and confer's canvas, since we
// switched it) host here. Other lobby namespaces (e.g.
// 'pip-relay' for confer's classic browser pages) only matter for non-MCP
// peers, which wouldn't complete the MCP handshake even if pair-request
// succeeded; no point auto-trying them. Caller can override via the
// lobbyNamespace arg.
const DEFAULT_LOBBY = 'mcp';

let peerClient = null;
let peerTools = [];        // RegisteredTool instances
let peerLabel = null;      // for status reporting

// Map a peer-advertised JSON Schema into a permissive Zod RawShape so the
// bridge accepts arbitrary args and forwards them. The peer validates on its
// end; we don't double-validate here. We do preserve descriptions and
// required/optional so Claude sees a useful tool signature.
function jsonSchemaToZodShape(schema) {
  if (!schema || schema.type !== 'object' || !schema.properties) return {};
  const shape = {};
  const required = new Set(schema.required || []);
  for (const [key, prop] of Object.entries(schema.properties)) {
    let zod = z.any();
    if (prop && typeof prop === 'object' && prop.description) zod = zod.describe(prop.description);
    if (!required.has(key)) zod = zod.optional();
    shape[key] = zod;
  }
  return shape;
}

async function disconnectPeer() {
  for (const t of peerTools) {
    try { t.remove?.(); } catch {}
  }
  peerTools = [];
  if (peerClient) {
    try { await peerClient.close(); } catch {}
    peerClient = null;
  }
  peerLabel = null;
}

// Extracted so both the runtime `connect` tool and startup auto-connect
// share one code path. `extra` is the optional MCP tool-call context;
// auto-connect passes null and progress notifications skip cleanly.
async function doConnect(rawId, lobbyNamespace, extra) {
  const id = normalizeId(rawId);
  if (peerClient) await disconnectPeer();

  const ns = lobbyNamespace || DEFAULT_LOBBY;

  // Loading-message ritual while the connect is in flight. Sends progress
  // notifications the host MCP client (Claude Code) renders as a rotating
  // status line. No-op if the client didn't supply a progressToken or if
  // sendNotification isn't available on this SDK version.
  const progressToken = extra?._meta?.progressToken;
  const sendNotification = extra?.sendNotification;
  let knockTick = 0, knockTimer = null;
  if (progressToken !== undefined && typeof sendNotification === 'function') {
    const tick = () => {
      sendNotification({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress: knockTick,
          message: KNOCK_MESSAGES[knockTick % KNOCK_MESSAGES.length],
        },
      }).catch(() => {});
      knockTick += 1;
    };
    tick(); // first message immediately
    knockTimer = setInterval(tick, KNOCK_INTERVAL_MS);
  }
  const stopKnocking = () => { if (knockTimer) { clearInterval(knockTimer); knockTimer = null; } };

  // Underlying transport's constructor key is still `siteId` — the rename
  // to `id` is at our public API, not the lower-level lib.
  const transport = new WebRTCClientTransport({ siteId: id, lobbyNamespace: ns });
  peerClient = new Client({ name: 'mcp-rtc-bridge', version: BRIDGE_VERSION });
  try {
    await peerClient.connect(transport);
  } catch (err) {
    stopKnocking();
    peerClient = null;
    return { content: [{ type: 'text', text: `connect failed (lobby "${ns}", id "${id}"): ${err.message}` }], isError: true };
  }
  stopKnocking();

  let toolsResult;
  try {
    toolsResult = await peerClient.listTools();
  } catch (err) {
    await disconnectPeer();
    return { content: [{ type: 'text', text: `peer tools/list failed: ${err.message}` }], isError: true };
  }

  for (const tool of toolsResult.tools) {
    const shape = jsonSchemaToZodShape(tool.inputSchema);
    const description = tool.description || `Forwarded from peer's "${tool.name}".`;
    const registered = bridge.tool(
      `peer_${tool.name}`,
      description,
      shape,
      async (args) => {
        if (!peerClient) {
          return { content: [{ type: 'text', text: 'peer no longer connected' }], isError: true };
        }
        try {
          return await peerClient.callTool({ name: tool.name, arguments: args || {} });
        } catch (err) {
          return { content: [{ type: 'text', text: `peer ${tool.name} failed: ${err.message}` }], isError: true };
        }
      }
    );
    peerTools.push(registered);
  }

  peerLabel = id;
  // Tell the connected MCP client (Claude Code) to re-list our tools.
  try { await bridge.server.sendToolListChanged?.(); } catch {}

  // Format the response so Claude can present capabilities to the user
  // as a markdown bullet list, instead of a single comma-joined line.
  // Each tool's first line of description carries the bullet; the closing
  // line invites the user to pick. If the user's prompt was an all-in-one
  // ("connect ... and do X"), Claude proceeds with X. If it was just
  // "connect", Claude relays this list and asks what to do.
  const tools = toolsResult.tools;
  let text;
  if (tools.length === 0) {
    text = `Connected to **${id}** — but the remote peer didn't advertise any tools.`;
  } else {
    const list = tools.map(t => {
      const desc = String(t.description || '').split('\n')[0].trim();
      return desc
        ? `- **peer_${t.name}** — ${desc}`
        : `- **peer_${t.name}**`;
    }).join('\n');
    const noun = tools.length === 1 ? 'tool' : 'tools';
    text = `Connected to **${id}** (${tools.length} ${noun}):\n\n${list}\n\nWhat would you like to do?`;
  }
  return { content: [{ type: 'text', text }] };
}

bridge.tool(
  'connect',
  `Connect to a remote MCP server hosted on the WebRTC mesh via @nevescloud/mcp-rtc. After connect, the peer's tools become available on this bridge with the prefix peer_<toolname>.

USAGE — MAP USER PHRASING TO THIS TOOL:
The user typically asks in one of these forms; in each case, extract the id and call this tool:
  • "Connect neves.cloud to \\"cv-XXXXXX\\""             → connect({ id: "cv-XXXXXX" })
  • "Connect <any-domain> to \\"<id>\\""                  → connect({ id: "<id>" })
  • "Connect to \\"<id>\\""                               → connect({ id: "<id>" })
  • "Open <id>" / "Join <id>" / "Dial <id>"             → connect({ id: "<id>" })

A leading "#" in the id (from URL-fragment-style values like "#cv-XXXXXX") is accepted and stripped.

The "domain" in these phrasings (e.g. neves.cloud) is identity context for the human, NOT a URL to fetch. Do not WebFetch it. The id is the only argument that matters; the rendezvous happens through the public stoa lobby this bridge points at.

Defaults to lobby "mcp"; you almost never need to override.`,
  {
    id: z.string().describe('The id of the remote peer (the rendezvous string they advertise on the lobby). Looks like "cv-abc12345" or similar; extract from the user prompt. A leading "#" is accepted and stripped.'),
    lobbyNamespace: z.string().optional().describe('Optional. Defaults to "mcp", which is what mcp-rtc native servers (including confer\'s canvas) host on. Specify only if you know the peer is on a non-default lobby.'),
  },
  ({ id, lobbyNamespace }, extra) => doConnect(id, lobbyNamespace, extra),
);

bridge.tool(
  'disconnect',
  'Disconnect from the currently connected peer. Removes all peer_ tools.',
  {},
  async () => {
    if (!peerClient) return { content: [{ type: 'text', text: 'not connected' }] };
    const wasLabel = peerLabel;
    await disconnectPeer();
    try { await bridge.server.sendToolListChanged?.(); } catch {}
    return { content: [{ type: 'text', text: `disconnected from "${wasLabel}"` }] };
  }
);

await bridge.connect(new StdioServerTransport());

// Auto-connect at startup if --auto-connect was provided. Backoff
// schedule (exponential with full jitter, cap 30s) mirrors the
// signal.neevs.io discover client and the standard Anthropic-SDK
// retry shape: cheap fast retries up front for the common "peer
// will be up in a second" case, slower polls after that for the
// "peer is offline for now" case. Indefinite — the bridge has no
// way to know when the operator will open the page, so we keep
// listening until they do. Fire-and-forget so MCP tool calls flow
// through the bridge while we retry in the background; logs go to
// stderr (stdout is the MCP protocol channel).
const AUTO_BASE_MS = 1500;
const AUTO_MAX_MS  = 30_000;

async function autoConnectWithRetry() {
  const ns = autoConnectLobby || DEFAULT_LOBBY;
  let delay = AUTO_BASE_MS;
  let attempt = 0;
  while (true) {
    attempt += 1;
    const result = await doConnect(autoConnectId, autoConnectLobby, null);
    if (!result?.isError) {
      process.stderr.write(`[mcp-rtc-bridge] auto-connected to ${autoConnectId} (lobby ${ns})${attempt > 1 ? ` after ${attempt} tries` : ''}\n`);
      return;
    }
    const msg = result?.content?.[0]?.text || 'unknown error';
    const wait = delay + Math.floor(Math.random() * 1000);
    process.stderr.write(`[mcp-rtc-bridge] auto-connect attempt ${attempt} to ${autoConnectId} failed (${msg}); retrying in ${Math.round(wait / 1000)}s\n`);
    await new Promise((r) => setTimeout(r, wait));
    delay = Math.min(delay * 2, AUTO_MAX_MS);
  }
}

if (autoConnectId) {
  autoConnectWithRetry().catch((err) => {
    process.stderr.write(`[mcp-rtc-bridge] auto-connect loop crashed: ${err?.stack || err}\n`);
  });
}
