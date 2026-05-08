# mcp-rtc

> Wire mapping for MCP over a WebRTC data channel, plus a browser bridge that exposes a remote MCP-RTC server's tools to any local Claude via WebMCP.

This repo specifies how to carry [Model Context Protocol](https://github.com/modelcontextprotocol) JSON-RPC messages over a WebRTC data channel, and ships a reference implementation alongside a browser-side bridge library. It addresses one specific gap in the existing MCP transport set: making a browser tab — running anywhere, on any device — a fully-functional MCP server reachable by any local Claude with no install, no public URL, and no Node bridge.

The differentiator is narrow on purpose. Existing MCP transports (stdio, Streamable HTTP) cover the case where the server is a local process or a publicly-reachable backend. They don't cover the case where the server is a browser tab on someone else's machine — a phone, a teammate's laptop, an embedded device's web UI. WebRTC's NAT-traversing data channel does. The bridge-tab library packages this into a drop-in for any web page.

| | What | Status |
|---|---|---|
| **[SPEC.md](./SPEC.md)** | Wire mapping (Layer 1) plus recommended signaling/identity patterns (Layers 2/3) | Draft 0.1 |
| **[packages/transport](./packages/transport)** (`@jonasneves/mcp-rtc`) | Reference Transport implementation against the MCP SDK; works in Node and browser | scaffolded |
| **[packages/bridge-tab](./packages/bridge-tab)** (`@jonasneves/mcp-rtc-bridge-tab`) | Browser library that re-exposes a remote MCP-RTC server's tools as WebMCP tools — making them callable by any local Claude with the Anthropic Chrome extension | scaffolded |

## Why a spec, not just a library

Three Node implementations of "MCP over WebRTC" exist on npm today and none interoperate (see [SPEC § prior art](./SPEC.md#11-prior-art)). The contribution here is a small wire-format and connection-lifecycle contract; multiple implementations can exist underneath. Same pattern MCP itself uses: spec plus multiple SDKs.

## Why a browser-bridge library

Standard MCP transports require either a local process or a public backend. A browser tab — with WebRTC for cross-machine reach and WebMCP for local-Claude exposure — needs neither. The bridge-tab library packages this pattern as a drop-in: register a remote `siteId`, get a tab that exposes that remote MCP server to local Claude, transparently.

This is the piece without prior art.

## Layers

The spec defines three independently-pluggable layers:

```
Layer 1   Transport     MCP JSON-RPC over WebRTC data channel    (this spec mandates wire format)
Layer 2   Signaling     pair-request / SDP-ICE exchange          (pluggable; lobby pattern recommended)
Layer 3   Identity      peer authentication / trust              (pluggable; signed pair-request recommended)
```

Implementations interoperate at Layer 1 even when Layer 2 and 3 differ.

## Status

Early. Spec is in active draft. Reference implementation follows. The bridge-tab library lands once the wire mapping is stable. Standardization path is an open question — the repo is currently a documented reference; whether it ends up as an SEP, a W3C-CG draft, or an informal RFC is a downstream decision.

Comments and revisions welcome via Issues.

## License

MIT
