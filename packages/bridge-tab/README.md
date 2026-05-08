# @jonasneves/mcp-rtc-bridge-tab

A browser-side library that takes a remote MCP server reachable via [**mcp-rtc**](../../SPEC.md) and re-exposes its tools as **WebMCP** tools in the local browser tab. Result: any local Claude (Code / Desktop / claude.ai) with the Anthropic Chrome extension can call the remote server's tools — **with no Node process running on the user's machine and no public URL**.

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

**Scaffolded.** Implementation lands after `@jonasneves/mcp-rtc`'s browser-side transport stabilizes.

## Planned API

```html
<!-- somewhere in your page -->
<script type="module">
  import { mountBridge } from 'https://cdn.jsdelivr.net/npm/@jonasneves/mcp-rtc-bridge-tab@latest/+esm';

  await mountBridge({
    siteId: 'cv-abc12345',
    // optional: lobby URL, peer-key options, etc.
  });
  // After this resolves: the remote server's tools are registered in
  // navigator.modelContext (WebMCP). Local Claude can now call them.
</script>
```

Or as a standalone page (drop-in):

```
https://<your-host>/bridge-tab.html?site=cv-abc12345
```

## Companion package

[`@jonasneves/mcp-rtc`](../transport) — the underlying transport this library uses to reach the remote server.

## License

MIT
