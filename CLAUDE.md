# mcp-rtc — repo notes

A browser-side library and supporting transport that turn any browser tab into a Claude-callable MCP server over WebRTC, with no Node bridge or public URL.

## Strategic intent

**Library-led work**, not standard-track. The earlier framing ("standard-track work, not a product") was the wrong destination. Three Node MCP-over-WebRTC implementations already exist on npm; the wire mapping is necessary infrastructure but not novel as an idea. Where this project's potential actually lives: `packages/bridge-tab` plus a small number of viral demos. The pattern *"any browser tab is an MCP server callable by any local Claude with no install"* doesn't exist anywhere else as of May 2026, and it unlocks deployment shapes (phone-as-tools, shared-dev-env, hands-and-eyes, sensor-mesh) that weren't previously possible.

Artifact priority:

1. **`packages/bridge-tab`** — the load-bearing contribution. Browser tab as WebMCP↔mcp-rtc adapter. The pattern is the project.
2. **`examples/`** — the proof points. `hello-tool` is the smallest working demo (Path B + Path C live; Path A deferred). Named placeholders for `phone-as-tools`, `shared-dev-env`, `hands-and-eyes`, `sensor-mesh`, `canvas-peer` are the planned proof points along the asymmetric / cross-user / multi-peer axes; each earns its README only when the code exists.
3. **`packages/transport`** — necessary substrate. Reference implementation of the wire mapping; ships under `@jonasneves/mcp-rtc` and currently powers four downstream consumers (`mcp-rtc-bridge-tab`, `mcp-webrtc-bridge`, `confer-mcp`, `confer-agent`).
4. **`SPEC.md`** — supporting documentation. Tone: dry, precise, RFC-shaped. Exists so a second implementation can talk to the first; doesn't drive adoption on its own. *Do not* turn it into a marketing document.

The repo's audience: developers who want any-tab-to-any-Claude tool exposure with no infrastructure. Confer canvas will be the first migrated consumer of `bridge-tab`; phone-as-tools etc. will demonstrate the broader use cases. Standardization (SEP, W3C-CG, informal RFC) is downstream of adoption — don't pre-commit; the library is what people will actually use.

## Positioning landscape (don't relitigate)

The agent-protocol field as of 2026-05 is more crowded and more coordinated than it looks. These are the durable findings from the 2026-05-08 scout pass:

**The metaphor stack is locked.** The dominant framing across Anthropic, Microsoft, Google, and the LF agent ecosystem: "MCP = USB-C for AI; A2A = HTTP for AI agents; NLWeb = HTML to MCP/A2A's HTTP." New metaphors fight a coordinated mental model, not a vacuum. Substrate specs that brand-frame (Semantic Web, Web of Trust) eat a credibility tax; ones that stay clinical (gRPC, QUIC, CoAP) get adopted on ergonomics. **README and SPEC tone: descriptive, not metaphorical.** "Internet of Tools" framing was considered and rejected — see below.

**Adjacent territory is taken.**
- *"Internet of Agents"* — Cisco's `agntcy`, Linux Foundation-backed. Owns the "Internet of [X]" naming slot in agent-protocol discourse.
- *Decentralized peer-to-peer agents* — Agent Network Protocol (ANP), W3C-CG-tracked, uses W3C DIDs, has a published whitepaper (arxiv 2508.00007). Owns the "decentralized" positioning.
- *Canonical agent protocols* per arxiv 2505.02279 survey: MCP, ACP, A2A, ANP. A fifth protocol has to earn its place explicitly.

**Our actual differentiator is narrower than initial framing suggested:** *transport-level NAT-traversing browser-native peer connectivity for already-existing MCP servers.* Specifically — any browser tab becomes a discoverable, addressable MCP endpoint with no public URL. Don't claim more than that. Don't position as "decentralized agents" (ANP) or "Internet of [X]" (agntcy) or as "another transport" (see next).

**SEP transport window is closed in this cycle.** Anthropic's [Dec 2025 transport post](https://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/) and 2026 roadmap state explicitly: no more official transports this cycle. SEP-1287 (WebSocket) and SEP-1005 (postMessage) are competing for limited slots. Submitting another transport SEP into a stated closed window is bad strategy. Alternative paths: W3C-CG community draft (where ANP lives), informal RFC, or "documented reference impl, no formal track." Decide later — don't optimize for SEP submission today.

**Pattern to keep in mind:** when shipping in adjacent-to-canonical work, the existing field defines positioning, not your intent. Audit the metaphor stack, naming claims, and standardization tracks before claiming any of them. Restraint signals seriousness.

## Naming discipline

- **Spec** is named for the protocol pair: "MCP over WebRTC". Keep RFC-shaped vocabulary.
- **Repo** is `mcp-rtc`. Short, technical, scans as a transport-pair name (like CoAP, RTSP).
- **Reference impl** is `@jonasneves/mcp-rtc`. Same name as the repo — implementation = reference.
- **Bridge library** is `@jonasneves/mcp-rtc-bridge-tab`. Domain-suffix names what it does (a browser tab as bridge).

Don't introduce branded names. Confer can have a brand; substrate work shouldn't.

## Repo + GitHub orgs

- Repo lives at `jonasneves/mcp-rtc` — public as of 2026-05-08. Flipped on Path B working end-to-end (`hello.html` ↔ Claude Code via `@jonasneves/mcp-webrtc-bridge@0.2.0`); Path A (in-browser inference) is deferred but documented transparently. The original "wait for A and B" criterion was over-cautious — `@jonasneves/mcp-rtc@0.1.0` was already public on npm by then, so GH-private was just making the package look amateur (404 on the `repository` link). Public also unblocks the standardization narrative; SEP / W3C-CG / community-spec submission requires a public draft regardless.
- GitHub orgs reserved (Jonas owns): `mcp-rtc`, `mcp-webrtc`, `webmcp-webrtc`. Move the repo under `mcp-rtc` org if/when this graduates from "personal scaffold" to "neutral home" (e.g., if outside contributors arrive or before any formal standardization submission). The other two orgs are name-defense / redirect targets.

## Relationship to existing packages

`@jonasneves/mcp-webrtc` shipped first (confer-specific naming). All three of its consumers — `@jonasneves/confer-mcp@0.4.0`, `@jonasneves/confer-agent@0.3.0`, `@jonasneves/mcp-webrtc-bridge@0.2.0` — have been migrated to depend on `@jonasneves/mcp-rtc@0.1.0`. `@jonasneves/mcp-webrtc` remains published for any external consumers but new work happens on top of `mcp-rtc`. Eventual deprecation of `mcp-webrtc` (point at `mcp-rtc` in its README) is reasonable but not urgent. `@jonasneves/mcp-webrtc-bridge` keeps its name — it's the stdio→WebRTC bridge for terminal Claude (Path B), a distinct purpose from the browser `bridge-tab` (Path C).

## How a fresh session should pick up

1. Read this file's "Strategic intent" and "Positioning landscape" sections before touching framing language anywhere in the repo. The tone constraints are non-obvious and earned.
2. Read `README.md` for the current public shape.
3. Read `examples/hello-tool/README.md` to see what end-to-end looks like; open `hello.html` and `bridge.html` to see the actual implementations of the headline pattern.
4. `SPEC.md` is the wire-format contract — read it when changing the wire, not before.
5. `packages/bridge-tab/src/index.mjs` is small (~30 LOC of real code) and is the project's load-bearing artifact. Read it to internalize how the WebMCP↔mcp-rtc adapter works.

## What lives elsewhere

- `@jonasneves/mcp-webrtc` (npm) — predecessor reference impl this package was ported from. Superseded; remains published for any external consumers.
- `signal.neevs.io` — public lobby; the recommended Layer 2 reference.
- `@jonasneves/pip-relay` (npm) — Layer 2 reference impl (lobby + pair-request), this package's substrate.
- confer's `canvas.html` — multi-peer canvas product; planned first migrated consumer of `bridge-tab` (currently hand-rolls an equivalent surface).

## Roadmap

Library-led order: ship demos and consumers; let the spec catch up.

1. **Build `examples/phone-as-tools`** (or whichever asymmetric-capability demo lands first). The visceral demo — open a page on your phone, your laptop's Claude calls `take_photo` / `get_location` / `read_clipboard`. If even one example becomes a viral demo or someone's daily tool, the project compounds. Each example earns its README only when the code exists.
2. **Migrate confer's `canvas.html` to consume `bridge-tab`.** Replaces the hand-rolled WebMCP-equivalent in canvas with `@jonasneves/mcp-rtc-bridge-tab`. Validates the library against a real multi-peer consumer and gives canvas a proper second implementation.
3. **Ship a second demo on a different axis.** `shared-dev-env` (cross-user) or `hands-and-eyes` (asymmetric + cross-user). Two distinct demos cover the use-case story far better than one.
4. **Path A (deferred) for `hello-tool`** — in-browser inference. Makes the model-agnostic claim verifiable rather than theoretical. Tool calling at sub-1B parameters is fragile in 2026; revisit once the substrate is more battle-tested.
5. **Stabilize the spec.** Once the library has been exercised by 2–3 distinct demos and one external consumer, fold lessons learned back into SPEC.md. The spec absorbs reality, doesn't dictate it.
6. **Watch standardization paths.** Don't pre-commit. SEP / W3C-CG / informal RFC are options once there are real outside implementers asking for the contract.

Already shipped (for context): `packages/transport@0.1.0`, `packages/bridge-tab@0.1.0`, `examples/hello-tool` with hello.html + bridge.html + Node test client. Three downstream consumers (`mcp-webrtc-bridge`, `confer-mcp`, `confer-agent`) migrated to depend on `@jonasneves/mcp-rtc`.
