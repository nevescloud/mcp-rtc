# mcp-rtc — repo notes

Wire mapping for **MCP over WebRTC**, plus a browser bridge that exposes a remote MCP-RTC server to local Claude via WebMCP.

## Strategic intent

Standard-track work, not a product. Artifact priority:

1. **`packages/bridge-tab`** — the headline. The novel piece without prior art: a browser tab as WebMCP↔mcp-rtc adapter so any local Claude calls a remote browser-tab MCP server with no install. This is what developers will actually want.
2. **`SPEC.md`** — the wire-format and connection-lifecycle contract. Tone: dry, precise, RFC-shaped. *Do not* turn it into a marketing document. Necessary infrastructure but not where the novelty lives.
3. **`packages/transport`** — reference implementation. Proves the spec is implementable; adoption vehicle for users who don't want to write their own.

The repo's audience is MCP and web-platform implementers. Confer (the canvas product) is one downstream consumer; the goal is for there to be others.

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

- Repo lives at `jonasneves/mcp-rtc` (private as of 2026-05-08). Flip to public once `examples/hello-tool` runs end-to-end (at minimum Paths A and B) so first visitors see model-agnostic AI consumption working, not a placeholder.
- GitHub orgs reserved (Jonas owns): `mcp-rtc`, `mcp-webrtc`, `webmcp-webrtc`. Move the repo under `mcp-rtc` org if/when this graduates from "personal scaffold" to "neutral home" (e.g., if outside contributors arrive or before any formal standardization submission). The other two orgs are name-defense / redirect targets.

## Relationship to existing packages

`@jonasneves/mcp-webrtc` (existing) shipped first as a reference impl with confer-specific naming. It still works and has consumers (`@jonasneves/confer-mcp`, `@jonasneves/confer-agent`, `@jonasneves/mcp-webrtc-bridge`). When `@jonasneves/mcp-rtc` reaches feature parity:
- Migrate confer's consumers to `@jonasneves/mcp-rtc`.
- Deprecate `@jonasneves/mcp-webrtc` to point at `mcp-rtc`.
- Keep `@jonasneves/mcp-webrtc-bridge` (the stdio→WebRTC bridge for terminal Claude) — its name is fine and its purpose is distinct from `bridge-tab`.

## How a fresh session should pick up

1. Read this file's "Positioning landscape" section before touching framing language anywhere in the repo. The tone constraints are non-obvious and earned.
2. Read `SPEC.md` — the canonical wire-format artifact.
3. Read `README.md` and the example READMEs for current shape.
4. Refer to `@jonasneves/mcp-webrtc` as the de-facto reference impl predating this package; `mcp-rtc` was ported from it and will continue to absorb its consumers as it reaches feature parity.
5. The bridge-tab pattern hasn't been built anywhere yet. Reference: WebMCP API docs and confer's existing canvas-as-MCP-server logic (in the confer repo, peer-to-peer collaboration product that's the first downstream consumer).

## What lives elsewhere

- `@jonasneves/mcp-webrtc` (npm) — current reference impl this package was ported from; will be superseded.
- `signal.neevs.io` — public lobby; the recommended Layer 2 reference.
- `@jonasneves/pip-relay` (npm) — Layer 2 reference impl (lobby + pair-request), this package's substrate.
- confer's `canvas.html` — the first downstream consumer of `bridge-tab` (when both are built).

## Roadmap

1. **Stabilize the spec.** Get SPEC.md to a draft someone outside the project could read and implement from. Iterate based on review.
2. **Implement `packages/bridge-tab` first** *(reordered — this is the headline)*. Browser-side library. Drop-in: a script tag plus a small init call, get a tab that re-exposes a remote mcp-rtc server's tools as WebMCP tools. This is the piece that gives the repo its claim.
3. **Implement `packages/transport`.** Vendor / port from `@jonasneves/mcp-webrtc`, clean up, align with spec. Both Node and browser entry points. (bridge-tab depends on the browser entry point.)
4. **Build `examples/hello-tool`.** Browser tab as MCP server with one tool, three consumption paths: (A) in-browser inference via WebLLM/Gemini Nano — proves model-agnostic, no vendor in loop; (B) Claude Code via existing `@jonasneves/mcp-webrtc-bridge` — works today; (C) Claude.ai/Desktop via bridge-tab + Anthropic Chrome extension — the headline pattern. Ship A and B for v0.1; C lands when bridge-tab does. Once A and B run, the repo is ready to flip public.
5. **Migrate confer canvas to consume bridge-tab.** First real downstream user.
6. **Watch standardization paths.** Don't pre-commit. Decide between SEP / W3C-CG / informal RFC once there are real implementers asking for it.
