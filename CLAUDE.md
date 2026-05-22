# mcp-rtc — repo notes

A browser-side library and supporting transport that turn any browser tab into a Claude-callable MCP server over WebRTC, with no Node bridge or public URL.

## No fallbacks, no back-compat (pre-public)

mcp-rtc has zero users today. Until a public demo ships — a post, a launch
thread, anything that makes a stranger try it — there's no installed base
to protect. Optimize for radical change, not graceful evolution:

- No fallback paths for old URL forms, envelope shapes, or config keys.
- No deprecation cycles in code. Rename or restructure in place.
- No `// removed` comments. Just delete.
- Major version bumps are free; semver is a contract no one signed yet.

Applies to packages in this repo and to consumer pages (`/b/`, `/h/`,
`/p/`, `/v/`, hello-tool, canvas) until the first public posting. Switch
to normal evolution rules then.

## Strategic intent

**Library-led work**, not standard-track. Three Node MCP-over-WebRTC implementations already exist on npm; the wire mapping is necessary infrastructure but not novel as an idea. Where this project's potential actually lives: one capability-exposing host page powered by `packages/bridge-tab`, where opening a URL on any device makes that device's web-platform surface (camera, GPS, screen, file system, Bluetooth, Serial) Claude-callable peer-to-peer. The pattern *"any browser tab exposes its device's web-platform capabilities as MCP tools, peer-to-peer, no install on either side"* doesn't exist anywhere else as of May 2026.

Artifact priority:

1. **`neves.cloud/h/`** (live) — the capability host. One unified host URL that probes the device on load and registers a tool per available web platform API. Eleven capabilities → fifteen MCP tools when fully bound: heartbeat (`get_greeting`), auto-bound sensors (camera, mic, geolocation, clipboard, orientation), user-bound content (screen share, file picker, directory picker, paired BLE device, paired serial port). Permissions requested lazily on first call. Subsumes phone-as-tools as a device-class projection — same URL works on a phone, a laptop, anything in between. Source: `jonasneves.github.io/docs/h/`. In-repo `docs/examples/hello-tool/hello.html` is a forkable mirror, currently stale from the deployed version (different site-id shape, no capability detection — sync is a follow-up).
2. **`packages/bridge-tab`** — load-bearing library. Browser-side WebMCP↔mcp-rtc adapter; what consumer tabs run to bring remote MCP servers into a local WebMCP-aware Claude.
3. **`packages/transport`** — necessary substrate. Reference implementation of the wire mapping; ships under `@nevescloud/mcp-rtc` and powers four downstream consumers (`mcp-rtc-bridge-tab`, `mcp-rtc-bridge`, `confer-mcp`, `confer-agent`).
4. **`SPEC.md`** — supporting documentation. Tone: dry, precise, RFC-shaped. Exists so a second implementation can talk to the first; doesn't drive adoption on its own. *Do not* turn it into a marketing document.

The repo's audience: developers who want their device's web-platform surface exposed as Claude-callable tools, with no infrastructure under their control. Standardization (SEP, W3C-CG, informal RFC) is downstream of adoption — don't pre-commit; the library and the capability host are what people will actually use.

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

## WebMCP architecture (don't relitigate)

WebMCP is a two-layer thing, often confused for one:

1. **API surface** — `navigator.modelContext.registerTool(...)`. Chrome 146+ flag enables it; an extension polyfill (hatch does this) covers older Chrome. Pages register tools into a per-tab registry.
2. **Consumer** — something that reads the registry and exposes it to an AI client. The Anthropic Chrome extension is the consumer for Claude.ai web. Hatch's extension is the consumer for terminal AIs (Code / Cursor) via a local stdio MCP server.

**Claude.ai web only talks to the Anthropic extension over a private channel.** A third-party extension *cannot* expose tools to Claude.ai. The lock is a product decision, not a WebMCP spec property. So Path C ("Claude.ai with Anthropic ext") cannot be made vendor-independent at the WebMCP layer.

**Claude Code / Claude Desktop / Cursor don't use WebMCP at all.** They consume MCP servers via stdio or HTTP. mcp-rtc reaches them via Path B (`@nevescloud/mcp-rtc-bridge` — stdio MCP server that talks WebRTC). No browser, no extension on the asker's machine.

**Implication for mcp-rtc:** don't ship our own Chrome extension. The substrate is the spec + libraries (`@nevescloud/mcp-rtc`, `@nevescloud/mcp-rtc-bridge-tab`); the *consumer* extensions are someone else's job — Anthropic's for Claude.ai, hatch's for terminal AIs, future others. mcp-rtc gets stronger when more extensions consume `bridge-tab`, not when it ships its own.

## Capability host architecture (don't relitigate)

The capability host is the headline artifact: one unified URL that probes the device, registers an MCP tool per supported web platform API, and bridges to a local Claude via WebRTC.

**Two binding models, one registry:**
- **Auto-bound** — API grants at origin/device level (geolocation, devicemotion, clipboard). Tool registers after permission. `probe()` resolves immediately.
- **User-bound** — API requires a user gesture to select content (`showOpenFilePicker`, `getDisplayMedia`, Web Bluetooth, Web Serial). Tool registers after the user picks. `probe()` waits for a UI affordance.

The user-bound capabilities (screen, files, paired devices) are the *high-leverage* ones for adoption. Auto-bound sensors are toys; user-bound content is daily-driver utility. Ship user-bound first — screen-share specifically, before camera/GPS.

**Fragment-driven role.** Same URL is host or consumer based on URL fragment presence:
- No fragment → "I'm new, generate site id, register as host, show QR for the second device."
- Has fragment → "I'm joining the room that already exists; register as consumer."

Each demo defines its own arrival rule (helper-first vs tool-first) in page logic. Don't force one rule across the family — that fights the asymmetry that's one of the project's strengths.

**Architecture unified, marketing differentiated.** Curated landing pages (`/screen-share/`, `/phone-as-tools/`, `/hands-and-eyes/`) link to the same capability host with their own framing. Story differentiation up top; architecture collapse below. Don't pre-bake demos as separate URLs at the architecture layer.

**Permission UX gotcha.** N capabilities = N permission grants. Don't request all up front — register tools optimistically, request the permission when the tool is *called*. First call surfaces the OS prompt; subsequent calls reuse it. The MCP tool description should hint what permission will fire.

**Tool-surface bloat.** A device with 8-12 registered tools may confuse Claude. Tag tools by category in their descriptions; marketing landings can constrain the visible subset via URL params if needed.

**`/h/` is the capability host** (deployed in `jonasneves.github.io/docs/h/index.html`). Eleven capabilities → fifteen MCP tools at full bind:

- **Heartbeat** (always available, no permission): `get_greeting`
- **Auto-bound** (probe + lazy permission): `take_photo`, `record_audio`, `get_location`, `read_clipboard`, `get_orientation`
- **User-bound** (gesture-bound, multi-tool allowed): `capture_screen` (screen share via `getDisplayMedia`), `read_shared_file` (`showOpenFilePicker`), `list_files` + `read_file_at` (`showDirectoryPicker`), `ble_list_characteristics` + `ble_read` + `ble_write` (`bluetooth.requestDevice`), `serial_write` + `serial_read` (`serial.requestPort`)

The capability spec extension `tools: [...]` lets one binding register multiple MCP tools (used by folder share and the paired-device pairs).

**`/b/` runs pip alongside WebMCP.** The bridge page used to dead-end on browsers without a WebMCP consumer (Chrome 146+ with the Anthropic extension or hatch). Now it dials a second MCP client over WebRTC and feeds pip's slash dispatch + LFM2.5-350M local model (via `@nevescloud/pip@3.4.0`'s `bundle/local`). Two consumer paths from one page. **Two WebRTC connections per session is wasteful** — collapsing needs `bridge-tab` to expose its underlying client (tracked).

The in-repo `docs/examples/hello-tool/hello.html` is now a stale mirror of `/h/` (different site-id shape, no capability detection, has the QR code added earlier) — sync is a follow-up.

## Naming discipline

- **Spec** is named for the protocol pair: "MCP over WebRTC". Keep RFC-shaped vocabulary.
- **Repo** is `mcp-rtc`. Short, technical, scans as a transport-pair name (like CoAP, RTSP).
- **Reference impl** is `@nevescloud/mcp-rtc`. Same package name as the repo — implementation = reference.
- **Browser bridge** is `@nevescloud/mcp-rtc-bridge-tab` (a tab adapts mcp-rtc → WebMCP).
- **Terminal bridge** is `@nevescloud/mcp-rtc-bridge` (a Node stdio MCP server adapts mcp-rtc → stdio MCP for Claude Code, Cursor, etc.).

Substrate package *names* stay unbranded (`mcp-rtc`, `mcp-rtc-bridge-tab`); the *scope* is the publisher's identity surface. `@nevescloud` is used as a single trust-consistent scope across all of Jonas's packages — domain (`neves.cloud`) ↔ publisher scope (`@nevescloud`) ↔ future GitHub org. A consumer auditing supply-chain provenance sees the same identity at each layer. The earlier rule "don't introduce branded names" still applies *within* a package's name and within the spec/repo — Confer can have a brand, the transport can't. The publisher namespace is a different concern.

If `mcp-rtc` later graduates to a neutral home (formal standardization, outside contributors), the substrate packages move to `@mcp-rtc/*` (the GH org reserved for that purpose). That's a downstream decision, not the current shape.

## Repo + GitHub orgs

- Repo lives at `jonasneves/mcp-rtc` — public as of 2026-05-08. Flipped on Path B working end-to-end (`hello.html` ↔ Claude Code via the stdio bridge); Path A (in-browser inference) is deferred but documented transparently. The original "wait for A and B" criterion was over-cautious — the transport package was already public on npm by then, so GH-private was just making the package look amateur (404 on the `repository` link). Public also unblocks the standardization narrative; SEP / W3C-CG / community-spec submission requires a public draft regardless.
- GitHub orgs reserved (Jonas owns): `mcp-rtc`, `mcp-webrtc`, `webmcp-webrtc`. Move the repo under `mcp-rtc` org if/when this graduates from "personal scaffold" to "neutral home" (e.g., if outside contributors arrive or before any formal standardization submission). The other two orgs are name-defense / redirect targets.

## Relationship to existing packages

**npm scope migration in progress (2026-05-09):** all of Jonas's packages move from `@jonasneves/*` to `@nevescloud/*` for trust-consistency with the `neves.cloud` domain. In-repo references (this file, README, SPEC, examples, package.jsons) have been updated. The actual npm publishes — claiming the `nevescloud` org, republishing under the new scope, deprecating the old packages with a pointer — happen in one coordinated pass. Until then the docs name packages that don't exist yet on npm; the live `neves.cloud/h/` and `neves.cloud/b/` URLs continue to work because they import from the still-published `@jonasneves/*` versions. Re-deploy the example pages once the new scope is published.

Packages in scope of the migration: `mcp-rtc`, `mcp-rtc-bridge-tab`, `mcp-rtc-bridge` (renamed from `mcp-webrtc-bridge`), `pip-relay`, `confer-mcp`, `confer-agent`. The predecessor `@jonasneves/mcp-webrtc` is *not* migrating — it's superseded and stays at its historical name as a deprecation target.

The terminal bridge was renamed `mcp-webrtc-bridge` → `mcp-rtc-bridge` so the family is consistent (`mcp-rtc`, `mcp-rtc-bridge`, `mcp-rtc-bridge-tab`). The `-webrtc-` middle was a vestige of the older substrate name. The bridge source moved from `mcp-webrtc/bridge/` to `mcp-rtc/packages/bridge/` at the same time — substrate-shaped pieces live in the substrate repo. After this move, `mcp-webrtc/` only contains the deprecated old transport (`@jonasneves/mcp-webrtc`); archive on GitHub when convenient.

## How a fresh session should pick up

1. Read this file's "Strategic intent", "Positioning landscape", and "Capability host architecture" sections before touching framing language anywhere in the repo. The tone constraints are non-obvious and earned.
2. Read `README.md` for the current public shape.
3. The headline demo is the capability host (`docs/examples/capability-host`) — planned but not yet built. Until it ships, `docs/examples/hello-tool` is the minimal working example: open `hello.html` + `bridge.html` to see the substrate end-to-end.
4. `SPEC.md` is the wire-format contract — read it when changing the wire, not before.
5. `packages/bridge-tab/src/index.mjs` is small (~30 LOC of real code) and is the project's load-bearing library. Read it to internalize how the WebMCP↔mcp-rtc adapter works.

## Shared brand chrome — `_template.html`

`_template.html` at the repo root is the canonical source for the inline CSS, header HTML, favicon SVG, status-pill state machine, codeblock + copy-button, and importmap shape that every consumer page (`/b/`, `/h/`, `/p/`, `/v/`, hello-tool's `{hello,bridge,client}.html`, confer's `canvas.html`) currently inlines. There is **no build step** that pulls these in — each page is intentionally self-contained so the demos remain portable (drop one HTML file anywhere, it works). The template trades zero-build for a copy discipline.

When tweaking palette, status states, or any chunk marked `TEMPLATE-SHARED` in the file, edit it **there first**, then propagate to consumer pages by hand or with a sed sweep. Document any deliberate divergence in the diverging page (canvas.html keeps `idle/ok/warn` instead of `idle/paired/active/error` because of multi-peer semantics — that's noted in canvas.html itself).

## What lives elsewhere

- `@jonasneves/mcp-webrtc` (npm) — predecessor reference impl this package was ported from. Superseded; remains published for any external consumers.
- `signal.neevs.io` — public lobby; the recommended Layer 2 reference.
- `@nevescloud/pip-relay` (npm, post-migration) — Layer 2 reference impl (lobby + pair-request), this package's substrate.
- confer's `canvas.html` — multi-peer canvas product; planned first migrated consumer of `bridge-tab` (currently hand-rolls an equivalent surface).

## Roadmap

Library-led order: ship the capability host with screen-share as the wedge; everything else follows.

1. ~~Add screen-share to `/h/`~~ — **done** (`capture_screen` user-bound, JPEG via canvas drawImage; row "Share screen" button gates registration; the row flips to "stopped" if the user ends the share). **Validate Path B end-to-end before promising the Claude.ai variant** (Anthropic ext handling binary image payloads from a peer MCP server is currently untested).
2. ~~Add folder share to `/h/`~~ — **done** (`list_files` + `read_file_at` via `showDirectoryPicker`, plus `read_shared_file` for single-file via `showOpenFilePicker`). Introduced the multi-tool-from-one-bind extension (`tools: [...]` on the capability spec) — pattern reused by BT + Serial below.
3. ~~Add auto-bound device capabilities~~ — **done** (`take_photo`, `record_audio`, `get_location`, `read_clipboard`, `get_orientation` live in `/h/`). `record_audio` returns webm/opus as MCP `audio` content — handling on the asker side untested.
4. ~~Add Web Bluetooth / Web Serial~~ — **done** (`ble_list_characteristics` + `ble_read` + `ble_write` via `requestDevice` with a curated `optionalServices` including Nordic UART so better-robotics ESP32s pair out of the box; `serial_write` + `serial_read` via `requestPort`, 115200 baud). Chromium-only; gracefully hidden on Firefox/Safari.
5. ~~Add pip to `/b/`~~ — **done**. The bridge page now runs two consumer paths in parallel: mountBridge for the WebMCP-via-extension lane (best-effort), plus a parallel MCP Client feeding pip's slash dispatch + local model (LFM2.5-350M via transformers.js + WebGPU). WebMCP-unavailable browsers used to dead-end the page; now pip carries the chat. **Two WebRTC connections per session is wasteful — collapsing them needs `bridge-tab` to expose its underlying client.**
6. **Add fragment-driven role + QR code generation.** Same URL is host or consumer based on fragment presence; host shows QR for the second device to scan. Each demo defines its own arrival rule in page logic.
7. **Marketing landings.** Curated pages for `/screen-share/`, `/phone-as-tools/`, `/hands-and-eyes/` — each links to the same capability host with its own framing. Story up top, architecture underneath.
8. **Migrate confer's `canvas.html` to consume `bridge-tab`.** Replaces the hand-rolled WebMCP-equivalent. Validates the library against a real multi-peer consumer.
9. **Stabilize the spec.** Once the capability host has been exercised by 2–3 capability categories and the confer migration is done, fold lessons learned back into SPEC.md.
10. **Watch standardization paths.** Don't pre-commit. SEP / W3C-CG / informal RFC are options once there are real outside implementers asking for the contract.

**Path A for `hello-tool` is live** (`docs/examples/hello-tool/client.html`). Uses `@nevescloud/pip@3.4.0`'s local-model bundle (LiquidAI LFM2.5-350M-ONNX over `transformers.js` + WebGPU) for free chat, with each remote `mcp-rtc` tool surfaced as a pip slash command (deterministic dispatch — keeps the demo honest given that sub-1B parameter models still emit unreliable structured tool calls in 2026). The model-agnostic claim is now end-to-end verifiable with no vendor in the loop. Same composition pattern (pip + slash) is what `/b/` runs alongside WebMCP — see "Capability host architecture" above.

**Subsumed (no longer separate demos in `docs/examples/`):** phone-as-tools, hands-and-eyes, sensor-mesh — all folded into `/h/` as device-class projections of the same primitive. Their placeholder READMEs have been removed; the names live on as marketing landings (item 6 above). `/p/` still exists and runs its own phone-flavored UI; it now duplicates `/h/`'s tool surface on a phone and should either retire (redirect to `/h/`) or stay as a curated phone-only narrative landing. `shared-dev-env` and `canvas-peer` were also placeholder READMEs without code; shared-dev-env is a use case story for developer-written custom tools on top of bridge-tab (not part of the capability host), and canvas-peer is now tracked as item 7 (the confer migration) rather than a separate `docs/examples/` page.

Already shipped (for context): `packages/transport@0.1.1`, `packages/bridge-tab@0.1.1`, `packages/bridge@0.4.0` (renamed from `mcp-webrtc-bridge`, moved from the `mcp-webrtc/` repo into this one), `docs/examples/hello-tool` with hello.html + bridge.html + Node test client. Three downstream consumers (`mcp-rtc-bridge`, `confer-mcp`, `confer-agent`) depend on the transport. Packages were originally published under `@jonasneves/*`; in-repo references now name `@nevescloud/*` ahead of the coordinated republish (see *Relationship to existing packages*).
