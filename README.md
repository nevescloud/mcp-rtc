# mcp-rtc

> Turn any browser tab into a Claude-callable MCP server. No Node bridge, no install, no public URL.

[![npm: bridge-tab](https://img.shields.io/npm/v/@jonasneves/mcp-rtc-bridge-tab?label=%40jonasneves%2Fmcp-rtc-bridge-tab&color=cb3837&logo=npm)](https://www.npmjs.com/package/@jonasneves/mcp-rtc-bridge-tab)
[![npm: transport](https://img.shields.io/npm/v/@jonasneves/mcp-rtc?label=%40jonasneves%2Fmcp-rtc&color=cb3837&logo=npm)](https://www.npmjs.com/package/@jonasneves/mcp-rtc)
[![Try it live](https://img.shields.io/badge/try%20it-live-006d51?logo=github)](http://neves.cloud/mcp-rtc/)
[![License: MIT](https://img.shields.io/badge/License-MIT-lightgrey.svg)](./LICENSE)

`@jonasneves/mcp-rtc-bridge-tab` is a browser library that takes a remote MCP server reachable over WebRTC and re-exposes its tools as [WebMCP](https://github.com/webmachinelearning/webmcp) tools in the local tab. Local Claude (Code, Desktop, claude.ai with the [Anthropic Chrome extension](https://www.anthropic.com/)) calls them natively. The transport and spec exist to make that work and to let other implementations interoperate.

## Why this exists

Existing MCP transports (stdio, Streamable HTTP) cover the case where the server is a local process or a public-URL backend. They don't cover the case where the server is *a browser tab on someone else's machine*: a phone exposing camera and GPS, a teammate's laptop exposing dev-environment tools, an embedded device's web UI. WebRTC's NAT-traversing data channel does. `bridge-tab` packages it into a drop-in for any web page.

## Try it

The smallest demo is two browser tabs on one machine, then ask Claude to call a tool:

1. Open **[hello.html](http://neves.cloud/mcp-rtc/hello-tool/hello.html)** — a tab that runs an MCP server with one tool. Note the `?site=hi-XXXXXX` it generates.
2. Open **[neves.cloud/c/#site=hi-XXXXXX](https://neves.cloud/c/)** in a tab where the Anthropic Claude Chrome extension is installed (Chrome 146+).
3. Ask Claude *"call get_greeting"*. The call routes peer-to-peer over WebRTC.

Two machines work the same way — share the site id with anyone, anywhere. `neves.cloud/c/` is the canonical short URL for the bridge; the in-repo [`bridge.html`](./examples/hello-tool/bridge.html) is the same code, kept as a forkable example.

## Repo

| | What | Status |
|---|---|---|
| **[packages/bridge-tab](./packages/bridge-tab)** (`@jonasneves/mcp-rtc-bridge-tab`) | The library. Browser-side WebMCP↔mcp-rtc adapter. | 0.1.0, published |
| **[packages/transport](./packages/transport)** (`@jonasneves/mcp-rtc`) | Reference implementation of the wire mapping. Node + browser. | 0.1.0, published |
| **[examples/hello-tool](./examples/hello-tool)** | Tab as MCP server, with three consumption paths. | working |
| **[SPEC.md](./SPEC.md)** | Wire-format contract. Lets future implementations interoperate at Layer 1. | Draft 0.1 |

The bridge library is the contribution. The transport is the substrate that makes it work. The spec is supporting documentation for anyone writing a second implementation.

## The wire, in one diagram

```
Layer 1   Transport     MCP JSON-RPC over WebRTC data channel    (mandated; this is the contract)
Layer 2   Signaling     pair-request / SDP-ICE exchange          (pluggable; lobby pattern recommended)
Layer 3   Identity      peer authentication / trust              (pluggable; signed pair-request recommended)
```

Implementations interoperate at Layer 1 even when their Layer 2 and Layer 3 differ. Full text in [SPEC.md](./SPEC.md).

## Adoption

`@jonasneves/mcp-rtc` is the reference implementation. Four packages ride it today:

- `@jonasneves/mcp-rtc-bridge-tab` — the WebMCP↔mcp-rtc browser bridge in this repo.
- `@jonasneves/mcp-webrtc-bridge` — stdio bridge that lets terminal Claude (Code) reach WebRTC MCP servers.
- `@jonasneves/confer-mcp` — Claude Code joins a [confer](https://github.com/jonasneves/confer) advisory room as a peer.
- `@jonasneves/confer-agent` — Claude Agent SDK joins a confer workspace as a peer.

Three other Node implementations of "MCP over WebRTC" exist on npm; none interoperate (see [SPEC § prior art](./SPEC.md#11-prior-art)). Layer 1 of this spec is the contract that lets them.

## Status

Early. Library and transport published; bridge-tab pattern live; one implemented example runnable from the URL above. More demos and a multi-peer downstream consumer (confer canvas migration) on the immediate roadmap. Standardization path (SEP / W3C-CG / informal RFC) is open and intentionally uncommitted — the library is what people use; the spec catches up if a standardization moment arrives. Comments and revisions welcome via Issues.

## License

MIT
