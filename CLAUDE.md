# mcp-rtc — repo notes

Spec + reference implementation for **MCP over WebRTC**, plus a browser bridge library that exposes a remote MCP-RTC server to local Claude via WebMCP.

## Strategic intent

This is **standard-track work**, not a product repo. The artifact priority is:

1. **`SPEC.md`** — the protocol specification. Designed to be submittable as a SEP to the MCP working group once it stabilizes. Tone: dry, precise, RFC-shaped. *Do not* turn it into a marketing document or weave product narratives through it.
2. **`packages/transport`** — reference implementation that follows the spec. Its existence proves the spec is implementable; it's also the adoption vehicle for users who don't want to write their own.
3. **`packages/bridge-tab`** — application-layer pattern (browser tab as WebMCP↔mcp-rtc adapter). Distinct contribution layered on top of the spec. Generalizable beyond confer-canvas.

The repo's audience is **MCP/web-platform developers**, not "advisory-room buyers" or "confer customers." Confer (the canvas product) is one downstream consumer. Other downstream consumers we'd like to see: any P2P web service that wants to be Claude-callable from any local Claude (multi-machine collaboration tools, mobile-app↔desktop bridges, IoT-via-WebRTC, etc.).

## Naming discipline

- **Spec** is named for the protocol pair: "MCP over WebRTC". Keep RFC-shaped vocabulary.
- **Repo** is `mcp-rtc`. Short, technical, scans as a transport-pair name (like CoAP, RTSP).
- **Reference impl** is `@jonasneves/mcp-rtc`. Same name as the repo — implementation = reference.
- **Bridge library** is `@jonasneves/mcp-rtc-bridge-tab`. Domain-suffix names what it does (a browser tab as bridge).

Don't introduce branded names for this work. Confer can have a brand; substrate work shouldn't.

## Relationship to existing packages

`@jonasneves/mcp-webrtc` (existing) shipped first as a reference impl with confer-specific naming. It still works and has consumers (`@jonasneves/confer-mcp`, `@jonasneves/confer-agent`, `@jonasneves/mcp-webrtc-bridge`). When `@jonasneves/mcp-rtc` reaches feature parity:
- Migrate confer's consumers to `@jonasneves/mcp-rtc`.
- Deprecate `@jonasneves/mcp-webrtc` to point at `mcp-rtc`.
- Keep `@jonasneves/mcp-webrtc-bridge` (the stdio→WebRTC bridge for terminal Claude) — its name is fine and its purpose is distinct from `bridge-tab`.

## How a fresh session should pick up

1. Read `SPEC.md` first — that's the canonical artifact.
2. Read this file and `README.md` for repo intent.
3. Refer to existing `@jonasneves/mcp-webrtc` (in `~/Github/jonasneves/mcp-webrtc`) as the de-facto reference for what the implementation looks like — `mcp-rtc` will likely vendor or adapt that code with cleanup as the spec stabilizes.
4. The bridge-tab pattern hasn't been built anywhere yet. Reference: see the WebMCP API docs and confer's existing canvas-as-MCP-server logic for the shape.

## What lives elsewhere

- **`@jonasneves/mcp-webrtc`** at `~/Github/jonasneves/mcp-webrtc` — current reference impl, will be superseded.
- **`signal.neevs.io`** — public lobby; the recommended Layer 2 reference.
- **`pip-relay`** at `~/Github/jonasneves/pip-relay` — Layer 2 reference impl (lobby + pair-request).
- **`confer/public/canvas.html`** at `~/Github/jonasneves/confer` — the first downstream consumer of `bridge-tab` (when both are built).

## Roadmap

1. **Stabilize the spec.** Get SPEC.md to a draft someone outside the project could read and implement from. Iterate based on review.
2. **Implement `packages/transport`.** Vendor / port from `@jonasneves/mcp-webrtc`, clean up, align with spec. Both Node + browser entry points.
3. **Implement `packages/bridge-tab`.** Browser-side library. Drop-in: `<script src=".../bridge-tab.js">` + a small init call, get a tab that re-exposes a remote mcp-rtc server's tools as WebMCP tools.
4. **Migrate confer canvas to consume bridge-tab.** First real downstream user.
5. **Submit SEP.** Once spec is stable and reference impl exists, file with the MCP working group.
