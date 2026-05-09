# mcp-rtc

> Turn any browser tab into a Claude-callable MCP server. No Node bridge, no install, no public URL.

`mcp-rtc-bridge-tab` is a browser library that takes a remote MCP server reachable over WebRTC and re-exposes its tools as [WebMCP](https://github.com/webmachinelearning/webmcp) tools in the local tab. Result: any local Claude (Code / Desktop / claude.ai with the [Anthropic Chrome extension](https://www.anthropic.com/)) can call the remote tab's tools natively. The transport and spec exist to make that work and let other implementations interoperate.

## What this is for

Existing MCP transports — stdio, Streamable HTTP — cover the case where the server is a local process or a public-URL backend. They don't cover the case where the server is *a browser tab on someone else's machine*: a phone exposing camera and GPS, a teammate's laptop exposing dev-environment tools, an embedded device's web UI. WebRTC's NAT-traversing data channel does. The bridge-tab library packages it into a drop-in for any web page.

Smallest demo: open `examples/hello-tool/hello.html` in one tab; open `examples/hello-tool/bridge.html?site=<id>` in another tab where the Anthropic Chrome extension is installed. Local Claude can now call the first tab's tool by name, with no Node process anywhere in the loop.

## Repo

| | What | Status |
|---|---|---|
| **[packages/bridge-tab](./packages/bridge-tab)** (`@jonasneves/mcp-rtc-bridge-tab`) | The library. Browser-side WebMCP↔mcp-rtc adapter. | 0.1.0, published |
| **[packages/transport](./packages/transport)** (`@jonasneves/mcp-rtc`) | Reference implementation of the wire mapping. Node + browser. | 0.1.0, published |
| **[examples/hello-tool](./examples/hello-tool)** | The smallest demo: tab as MCP server, three consumption paths. | working (Path B + C live; Path A deferred) |
| **[SPEC.md](./SPEC.md)** | Wire-format contract so future implementations can interoperate at Layer 1. | Draft 0.1 |

The bridge library is the contribution; the transport is the substrate that makes it work; the spec is supporting documentation that lets a second implementation talk to the first.

## Layers

The wire spec is small on purpose, and split so signaling and identity are pluggable:

```
Layer 1   Transport     MCP JSON-RPC over WebRTC data channel    (mandated; this is the contract)
Layer 2   Signaling     pair-request / SDP-ICE exchange          (pluggable; lobby pattern recommended)
Layer 3   Identity      peer authentication / trust              (pluggable; signed pair-request recommended)
```

Implementations interoperate at Layer 1 even when Layer 2 and 3 differ.

## Existing implementations on the wire

`@jonasneves/mcp-rtc` is the reference; downstream consumers using it today: `@jonasneves/mcp-rtc-bridge-tab`, `@jonasneves/mcp-webrtc-bridge` (terminal Claude → WebRTC), `@jonasneves/confer-mcp` (Claude Code joins a confer room), `@jonasneves/confer-agent` (Claude Agent SDK joins as a peer).

Three other Node implementations of "MCP over WebRTC" exist on npm today; none interoperate (see [SPEC § prior art](./SPEC.md#11-prior-art)). Layer 1 of this spec is the contract that lets them.

## Status

Early. Library and transport published; bridge-tab pattern live; one implemented example. More demos and one downstream consumer (confer canvas migration) on the immediate roadmap. Standardization path is open and intentionally uncommitted — the library is what people use; the spec is here so a second implementation can talk to the first. Comments and revisions welcome via Issues.

## License

MIT
