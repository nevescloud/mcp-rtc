# @nevescloud/mcp-rtc-bridge-tab

A browser-side library that takes a remote MCP server reachable via [**mcp-rtc**](../../SPEC.md) and re-exposes its tools as **WebMCP** tools in the local browser tab. Result: any local Claude with a WebMCP consumer attached (Claude.ai / Desktop with the Anthropic Chrome extension, Code / Cursor via [hatch](https://github.com/jonasneves/hatch), or any future implementation) can call the remote server's tools — **with no Node process running on the user's machine and no public URL**.

## What this is, in one diagram

```
[Local Claude — any variant w/ Chrome extension]
                  ↓ WebMCP (via Anthropic Chrome ext)
[This library, running in a browser tab]
   ├── declares the remote server's tools via WebMCP API
   └── handler for each tool forwards the call over WebRTC →
                                          ↓
[Remote browser tab or Node process — the actual MCP server]
```

The browser tab is a **WebMCP↔mcp-rtc adapter**. Local Claude only knows WebMCP. The remote server only knows MCP. The adapter speaks both.

## Why this matters

The standard MCP transports (stdio, Streamable HTTP) require either a local Node process or a public HTTPS server. Both add operational cost. The `mcp-rtc` transport plus this bridge needs neither — opening a browser tab is the entire integration step.

## Status

**0.1.0.** Single export, single dependency on `@nevescloud/mcp-rtc`. Tested live against `examples/hello-tool/bridge.html` in the spec repo.

## Requirements

- Chromium-based browser implementing the W3C-CG WebMCP draft (April 2026 +): `navigator.modelContext.registerTool(...)`. Chrome 146+ with the Anthropic Claude extension is the most common setup; [hatch](https://github.com/jonasneves/hatch) is another consumer that targets terminal AIs.
- The remote peer must already be running an `mcp-rtc` server on a known site id.

## API

```html
<script type="module">
  import { mountBridge } from 'https://cdn.jsdelivr.net/npm/@nevescloud/mcp-rtc-bridge-tab@latest/+esm';

  const bridge = await mountBridge({
    siteId: 'hi-abc123',
    // optional:
    // lobbyNamespace: 'mcp',           // matches the spec recommendation
    // namePrefix:     'remote_',       // prepend to each registered tool name
    // clientName:     'my-bridge-tab', // label sent to the remote peer
  });

  // After this resolves: every tool the remote server advertises has been
  // registered with navigator.modelContext. Local Claude (with the
  // Anthropic Chrome extension) can now see and call them.

  console.log('exposed tools:', bridge.tools);

  // To tear down (closes WebRTC, unregisters tools):
  // await bridge.unmount();
</script>
```

The execute handler for each registered WebMCP tool forwards the call over WebRTC via `client.callTool(...)`. MCP and WebMCP share the `{ content: [{ type, text }] }` response shape, so results pass through unchanged.

## Standalone drop-in

For users who want the bridge without writing any JS, the spec repo ships `examples/hello-tool/bridge.html` — a minimal page that calls `mountBridge` with the site id read from the URL fragment (`/bridge.html#cv-abc12345`). Adapt or copy as needed.

## Companion package

[`@nevescloud/mcp-rtc`](../transport) — the underlying transport this library uses to reach the remote server.

## License

MIT
