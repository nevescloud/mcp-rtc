# mcp-rtc

> Spec, reference implementation, and browser bridge for **MCP over WebRTC**.

This repo defines a transport for the [Model Context Protocol](https://github.com/modelcontextprotocol) that carries MCP JSON-RPC messages over a WebRTC data channel. It addresses use cases the existing transports don't:

- **Peer-to-peer.** No central server in the message path. The substrate brokers introductions only.
- **Cross-machine without a backend.** Two browsers (or a browser and a Node process) on different networks talk directly through NAT via standard WebRTC.
- **Browser-to-Claude integration with no install.** Combined with [WebMCP](https://webmcp.dev/) and the Anthropic Claude Chrome extension, a remote MCP server hosted in a browser tab is reachable by any local Claude — no Node bridge, no MCP server config, no public URL.

Three artifacts live here:

| | What | Status |
|---|---|---|
| **[SPEC.md](./SPEC.md)** | Protocol specification — wire format, connection lifecycle, layering | **Draft.** Pre-SEP. |
| **[packages/transport](./packages/transport)** (`@jonasneves/mcp-rtc`) | Reference implementation for the MCP SDK Transport interface; works in Node and browser | scaffolded |
| **[packages/bridge-tab](./packages/bridge-tab)** (`@jonasneves/mcp-rtc-bridge-tab`) | Browser library that re-exposes a remote `mcp-rtc` server's tools as WebMCP tools — making them callable by any local Claude with a Chrome extension | scaffolded |

## Why a spec, not just a library

Three implementations of "MCP over WebRTC" exist on npm today (see [SPEC § prior art](./SPEC.md#prior-art)). They don't interoperate. A small specification of wire format and connection lifecycle gives the ecosystem a single contract; multiple implementations can exist underneath. This is the same pattern MCP itself uses: spec + multiple SDKs.

## Why a browser-bridge library

Standard MCP transports (stdio, HTTP/SSE) require either a local process or a public server. Both add operational cost. A browser tab, with WebRTC for cross-machine reach and WebMCP for local-Claude exposure, has neither. The bridge-tab library packages this pattern as a drop-in: register a remote `siteId`, get a tab that exposes that remote MCP server to local Claude, transparently.

## Layers

The spec defines three independently-pluggable layers:

```
Layer 1   Transport     MCP JSON-RPC over WebRTC data channel    (this spec mandates wire format)
Layer 2   Signaling     pair-request / SDP-ICE exchange          (pluggable; lobby pattern recommended)
Layer 3   Identity      peer authentication / trust              (pluggable; signed pair-request recommended)
```

Implementations interoperate at Layer 1 even when Layer 2/3 differ.

## Status

Early. Spec is in active draft. Reference impl is the next build target after the spec stabilizes. Once both ship, the spec becomes a candidate for SEP submission to the MCP working group.

Comments and revisions welcome via Issues.

## License

MIT
