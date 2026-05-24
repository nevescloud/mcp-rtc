# @nevescloud/mcp-rtc-bridge

Stdio MCP server that lets terminal Claude (Code, Cursor, Desktop, etc.) reach MCP servers hosted on the [`mcp-rtc`](https://github.com/nevescloud/mcp-rtc) mesh.

## Install

```sh
claude mcp add mcp-rtc-bridge -- npx -y @nevescloud/mcp-rtc-bridge
```

Codex CLI is the same pattern with `codex mcp add`. Cursor / Claude Desktop / any other stdio MCP client accept `npx -y @nevescloud/mcp-rtc-bridge` in their `mcpServers` config.

## Tools

| Tool | Purpose |
|---|---|
| `connect({ id, lobbyNamespace? })` | Dials a remote peer. Registers each of the peer's tools as `peer_<toolname>`. |
| `disconnect()` | Closes the connection, removes the `peer_` tools. |

After `connect`, your MCP client sees the peer's tools natively. Calling `peer_render({...})` forwards to the peer's `render({...})` over the WebRTC data channel.

```
You:    Connect to mcp-rtc canvas at "cv-abc123" using lobbyNamespace "pip-relay"
Claude: [calls connect] → "connected to cv-abc123 (2 tools): peer_render, peer_clear"
You:    Render a hello svg with a green circle
Claude: [calls peer_render({ html: '<svg>...</svg>' })] → "rendered (180 bytes)"
```

## Pre-bound install (`--auto-connect`)

When the peer's id is known up-front (e.g. a stable device-paired id), pass it at install time so the peer's tools surface without the user calling `connect` each session:

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

Pick the install's MCP name to reflect what the bound peer *does* — `studio`, `workshop`, etc. Ids accept a leading `#` so `#b79c` (copy-pasted from a fragment URL) works as-is.

`--lobby <namespace>` overrides the default `mcp` lobby. Auto-connect retries indefinitely with exponential backoff (1.5s → 3s → … → cap 30s, full jitter) so the bridge can be installed before the peer is online; the runtime `connect` tool stays available for switching peers.

## Quick test

Verify the bridge against an echo server:

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

In Claude Code (with the bridge registered): *"Connect to `bridge-quick-test` and call peer_echo with text 'hello'."* Expected reply: `olleh`.

## Lobby namespace

Default: `mcp`. Confer / pip-relay browser hosts use `pip-relay`:

```
connect({ id: 'cv-abc123', lobbyNamespace: 'pip-relay' })
```

## Limitations

- One peer at a time per bridge instance. `connect` again disconnects the previous peer first.
- Peer tools get a `peer_` prefix to avoid collision with `connect` / `disconnect`.
- Argument schemas forwarded permissively; the peer validates per its own schema.
- Requires Node ≥ 22.

## Related

- [`@nevescloud/mcp-rtc`](https://github.com/nevescloud/mcp-rtc) — the underlying transport
- [confer canvas](https://github.com/jonasneves/confer) — example consumer (browser MCP server with a `render` tool)

## License

MIT
