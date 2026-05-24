# @nevescloud/mcp-rtc-bridge

Stdio MCP server that lets a local MCP client (e.g. Claude Code) reach MCP servers hosted on the [`mcp-rtc`](https://github.com/jonasneves/mcp-rtc) mesh. Built on [`@nevescloud/mcp-rtc`](https://www.npmjs.com/package/@nevescloud/mcp-rtc).

## Install

Add to `~/.claude/settings.json` (Claude Code) or any MCP client config:

```json
{
  "mcpServers": {
    "mcp-rtc-bridge": {
      "command": "npx",
      "args": ["-y", "@nevescloud/mcp-rtc-bridge"]
    }
  }
}
```

### Pre-bound install (`--auto-connect`)

When the target peer's id is known up-front (e.g. a stable
device-paired id), pass it at install time so the peer's tools are
present without the user calling `connect` each session. Pick the
install's MCP name to reflect what the bound peer *does* — the
example below uses `peer`, but a real install might be `studio`,
`workshop`, etc.:

```json
{
  "mcpServers": {
    "peer": {
      "command": "npx",
      "args": ["-y", "@nevescloud/mcp-rtc-bridge", "--auto-connect", "b79c"]
    }
  }
}
```

Ids may be passed with or without a leading `#` — copy-pasting from
a fragment-style URL (`example.com/page#b79c` → `#b79c`) works as-is.

Optional `--lobby <namespace>` overrides the default `mcp` lobby —
same semantics as `connect`'s `lobbyNamespace`. Auto-connect failures
are logged to stderr and the bridge stays usable; `connect` is still
available at runtime for switching peers.

## Quick test

Verify the bridge works against an echo server hosted by `@nevescloud/mcp-rtc`:

```sh
# In one terminal — the mcp-rtc-hosted MCP server
npx -p @nevescloud/mcp-rtc node -e "
import('@nevescloud/mcp-rtc').then(async ({ WebRTCServerTransport }) => {
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const { z } = await import('zod');
  const server = new McpServer({ name: 'echo', version: '0.0.1' });
  server.tool('echo', { text: z.string() }, async ({ text }) => ({ content: [{ type: 'text', text: [...text].reverse().join('') }] }));
  await server.connect(new WebRTCServerTransport({ siteId: 'bridge-quick-test' }));
});"
```

Then in your Claude Code session (with the bridge registered): "Connect to `bridge-quick-test` and call peer_echo with text 'hello'." Expected reply: `olleh`.

If that works end-to-end, the bridge + transport + signaling lobby are all wired correctly.

## What it does

Two built-in tools:

- **`connect({ id, lobbyNamespace? })`** — establishes a WebRTC + MCP client connection to a remote peer. Discovers the peer's tools and registers each as `peer_<toolname>` on this bridge. Sends `tools/list_changed` so your client picks them up.
- **`disconnect()`** — closes the connection and removes the `peer_` tools.

After `connect`, your MCP client sees the peer's tools natively. Calling `peer_render({...})` forwards to the peer's `render({...})` over the WebRTC data channel and returns the peer's response.

## Example

```
You:    Connect to mcp-rtc canvas at "cv-abc123" using lobbyNamespace "pip-relay"
Claude: [calls connect] → "connected to cv-abc123 (2 tools): peer_render, peer_clear"
You:    Render a hello svg with a green circle
Claude: [calls peer_render({ html: '<svg>...</svg>' })] → "rendered (180 bytes)"
```

The remote peer's `render` tool runs in *its* environment (here, in a browser tab); the bridge just forwards the JSON-RPC.

## Lobby namespace

`mcp-rtc` defaults to `lobbyNamespace: 'mcp'` for native peers. Confer / pip-relay browser hosts use `'pip-relay'`. Pass it explicitly when connecting to a confer canvas:

```
connect({ id: 'cv-abc123', lobbyNamespace: 'pip-relay' })
```

## Limitations

- One peer at a time per bridge instance. Calling `connect` again disconnects the previous peer first.
- Peer tools are exposed with a `peer_` prefix to avoid collision with `connect` / `disconnect`.
- Argument schemas are forwarded permissively (bridge accepts any args matching the peer-advertised property names); the peer validates per its own schema.
- Requires Node ≥ 22.

## Related

- [`@nevescloud/mcp-rtc`](https://github.com/jonasneves/mcp-rtc) — the underlying transport.
- [confer canvas](https://github.com/jonasneves/confer) — example consumer (browser MCP server with a `render` tool).
