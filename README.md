# mcp-rtc

**Browser tab as MCP server. Peer-to-peer over WebRTC.**

## What this is

Existing MCP transports (stdio, Streamable HTTP) cover local processes and public-URL backends. They don't cover an MCP server that lives in a browser tab — exposing the device's camera, screen, files, paired BLE or Serial — to a local Claude. WebRTC's NAT-traversing data channel does. This repo is the spec, the reference transport, and a browser-side bridge.

## Architecture

```
        Browser tab                                  Local MCP client
   ┌──────────────────┐                          ┌──────────────────┐
   │   MCP server     │ ◄── MCP JSON-RPC ──────► │  Claude Code     │
   │                  │     WebRTC data channel  │  Cursor          │
   │ camera · GPS     │     DTLS, NAT-traversing │  Claude.ai (ext) │
   │ screen · files   │                          │  Claude Desktop  │
   │ BT · serial      │                          │                  │
   └──────────────────┘                          └──────────────────┘
```

Initial handshake: peers find each other via a shared site id, exchange SDP/ICE through a WebSocket lobby. No public URL on either side. Three layers, independently pluggable:

| Layer | Role | Spec | Reference |
|---|---|---|---|
| 1 — Transport | MCP JSON-RPC over WebRTC data channel | mandated | `@nevescloud/mcp-rtc` |
| 2 — Signaling | rendezvous, SDP / ICE exchange | recommended | `@nevescloud/pip-relay` |
| 3 — Identity | peer authentication | recommended | TOFU via signed pair-request |

Implementations interoperate at Layer 1 even when Layer 2 / 3 differ. Full text in [SPEC.md](./SPEC.md).

## Try it

Two URLs, one Claude.

1. **[neves.cloud/h/](https://neves.cloud/h/)** — the tab becomes an MCP server. Eleven capabilities (camera, GPS, screen share, files, BT, serial, …) register as tools; permissions stay lazy. Note the `#hi-XXXXXX` it generates.
2. Reach it from a local Claude:

   **From Claude Code** (or any stdio MCP client) — install the bridge once:
   ```sh
   claude mcp add mcp-rtc-bridge -- npx -y @nevescloud/mcp-rtc-bridge
   ```
   Then paste the *"Paste in Claude Code"* prompt the host page generates.

   **From Claude.ai / Desktop** — open **[neves.cloud/b/#hi-XXXXXX](https://neves.cloud/b/)** in Chrome 146+ with a WebMCP consumer (e.g. the Anthropic Claude extension). Tools surface in the local tab; Claude calls them natively over WebMCP.

Two machines work the same way. `/h/` and `/b/` are the deployed pages; `docs/examples/hello-tool/` is the minimal forkable example.

> **Note for cloners:** the live demos (`/h/`, `/b/`, `/p/`, `/v/`) and the capability-host source are **not in this repo**. They are served from the separate [`neves.cloud` pages repo](https://github.com/jonasneves/jonasneves.github.io) (`docs/h/`, `docs/b/`, …). This repo contains the spec, the npm packages (`packages/`), and one minimal forkable example (`docs/examples/hello-tool/`). If you cloned this looking for the capability host, it lives there, not here.

## Repo

```
packages/transport/    @nevescloud/mcp-rtc             transport reference impl
packages/bridge-tab/   @nevescloud/mcp-rtc-bridge-tab  WebMCP ↔ mcp-rtc browser adapter
packages/bridge/       @nevescloud/mcp-rtc-bridge      stdio MCP server → mcp-rtc
docs/examples/         hello-tool: minimal working example
SPEC.md                wire-format contract (draft 0.1)
```

## Status

Substrate published. Capability host (`/h/`) live with eleven capabilities → fifteen MCP tools across heartbeat, sensors, screen share, file pickers, paired BLE / Serial. Path B (terminal Claude via stdio bridge) and Path A (in-browser open-weights inference via `@nevescloud/pip` + LFM2.5-350M) both working. Next: fragment-driven host/consumer role + QR, marketing landings, confer's `canvas.html` migration onto `bridge-tab`. Standardization (SEP / W3C-CG / informal RFC) intentionally uncommitted — the library and the capability host are what people use; the spec catches up if a standardization moment arrives.

## License

MIT
