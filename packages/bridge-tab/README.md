# @nevescloud/mcp-rtc-bridge-tab

A browser library that takes a remote MCP server reachable over [mcp-rtc](../../SPEC.md) and re-exposes its tools as **WebMCP** tools in the local tab. Any local Claude with a WebMCP consumer (Anthropic's Chrome extension for Claude.ai / Desktop, or [hatch](https://github.com/jonasneves/hatch) for terminal AIs) calls them natively.

## In one diagram

```
Local Claude ── WebMCP ──► WebMCP consumer ──► [this library]
                                                       │
                                                       │  for each remote tool:
                                                       │    handler forwards via mcp-rtc
                                                       ▼
                                                Remote browser tab
                                                (the actual MCP server)
```

The tab is a **WebMCP ↔ mcp-rtc adapter**. Local Claude speaks WebMCP. The remote server speaks MCP. The adapter speaks both.

## API

```html
<script type="module">
  import { mountBridge } from 'https://cdn.jsdelivr.net/npm/@nevescloud/mcp-rtc-bridge-tab@latest/+esm';

  const bridge = await mountBridge({
    siteId: 'hi-abc123',
    // optional:
    // lobbyNamespace: 'mcp',           // matches the spec recommendation
    // namePrefix:     'remote_',       // prepend to each registered tool name
    // clientName:     'my-bridge-tab',
  });

  console.log('exposed tools:', bridge.tools);
  // await bridge.unmount();  // closes WebRTC, unregisters tools
</script>
```

The execute handler for each registered WebMCP tool forwards the call over WebRTC via `client.callTool(...)`. MCP and WebMCP share the `{ content: [{ type, text }] }` response shape, so results pass through unchanged.

## Requirements

- Chromium-based browser with WebMCP — Chrome 146+ has it natively; older Chrome via a consumer extension (e.g. [hatch](https://github.com/jonasneves/hatch))
- A WebMCP consumer attached: Anthropic Claude extension, hatch, or any future implementation
- The remote peer running an `mcp-rtc` server on a known site id

## Drop-in page

For users who want the bridge without writing JS, the spec repo ships [`docs/examples/hello-tool/bridge.html`](../../docs/examples/hello-tool/bridge.html) — a minimal page that reads the site id from the URL fragment (`#hi-abc123`). Fork or serve locally.

## Related

- [`@nevescloud/mcp-rtc`](../transport) — the transport this library uses
- [SPEC.md](../../SPEC.md) — the wire-format contract

## License

MIT
