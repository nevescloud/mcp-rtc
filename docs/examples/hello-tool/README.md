# Example: hello-tool

The minimal substrate test — one browser tab, one tool, three ways to call it. Use this when you want to verify `mcp-rtc` end-to-end with nothing else moving.

```
+-------------------------------------+
| hello.html  (browser tab)           |
|                                     |
|   site id: hi-XXXXXXXX  [copy]      |
|                                     |
|   Tool:  get_greeting() -> string   |
|   Returns: "Hello! The tab says:    |
|             <random adjective>      |
|             <random noun>"          |
|                                     |
|   [audit feed of every call]        |
+-------------------------------------+
```

Live: open [neves.cloud/mcp-rtc/](http://neves.cloud/mcp-rtc/) and pick a path. The random adjective+noun pair makes calls verifiable — the model can't fabricate it.

> hello-tool is the *substrate* demo. The full capability demo is the [capability host](https://neves.cloud/h/) (eleven capabilities → fifteen MCP tools across camera, screen, files, paired BLE / Serial). hello-tool stays as the smallest forkable example for substrate debugging.

## Three paths, same tab

### Path A — in-browser inference

Open [`client.html`](./client.html) in a second tab. Connects to `hello.html` via `mcp-rtc`, lists the tools, mounts [`@nevescloud/pip`](https://github.com/nevescloud/pip)'s local-model bundle ([LiquidAI/LFM2.5-350M-ONNX](https://huggingface.co/LiquidAI/LFM2.5-350M-ONNX), `transformers.js` + WebGPU). Each remote tool surfaces as a pip slash command — `/get_greeting` dispatches deterministically over WebRTC; free text goes to the local model.

No API key. No external service. The only AI on the wire is a 350M-parameter open-weights model in the user's browser. **This is the path that makes the model-agnostic claim verifiable.**

*Why slash dispatch.* Sub-1B-parameter structured tool emission is still fragile in 2026. Deterministic dispatch keeps the demo honest — the tool call really happens over WebRTC. Model-driven selection is the next iteration once a small model emits parseable tool calls reliably.

*Requires.* WebGPU (Chrome / Edge 113+ with a recent GPU). First load downloads ~250 MB; subsequent loads use the cache.

### Path B — Claude Code via stdio bridge

Install the bridge once:

```sh
claude mcp add mcp-rtc-bridge -- npx -y @nevescloud/mcp-rtc-bridge
```

(Codex CLI: same with `codex mcp add`. Cursor / Claude Desktop: add `npx -y @nevescloud/mcp-rtc-bridge` to `mcpServers` config.)

Paste the *"Paste in Claude Code"* prompt from [hello.html](./hello.html) into the Claude session. Claude calls the bridge's `connect` with the site id, lists the remote tools, asks what to do. **No browser, no extension** — fully terminal-side.

### Path C — Claude.ai / Desktop via WebMCP

Open **[`https://neves.cloud/b/#<site-id>`](https://neves.cloud/b/)** in Chrome 146+ in any tab with a [WebMCP](https://github.com/webmachinelearning/webmcp) consumer attached. The page uses [`@nevescloud/mcp-rtc-bridge-tab`](../../../packages/bridge-tab) to re-expose `hello.html`'s tool via `navigator.modelContext`. Claude calls `get_greeting` natively — no Node process, no public URL.

WebMCP consumers in May 2026: Anthropic Claude Chrome extension (Claude.ai), [hatch](https://github.com/jonasneves/hatch) (terminal AIs), and future implementations. Claude.ai web only talks to the Anthropic extension — third-party extensions can't replace it for that surface, so Path B is the terminal route.

## Pick a path

- Read **A** to understand model-agnostic — open-weights, in-browser, no vendor on the wire.
- Run **B** if you already have Claude Code locally.
- Run **C** to see the bridge-tab pattern — zero install on the AI side.

## What this proves

Centralized MCP transports (stdio, Streamable HTTP) tie the server to a process on the asker's machine or a public backend. `mcp-rtc` plus a browser tab lifts both. The protocol stays neutral about who's on the other end — three independent paths, same server, no per-AI customization on the server side.

## Iterating on the substrate

[`hello.html`](./hello.html), [`bridge.html`](./bridge.html), [`client.html`](./client.html) import `@nevescloud/mcp-rtc` and `@nevescloud/mcp-rtc-bridge-tab` from `esm.sh`, so the same files work both via the live URL and any local `python3 -m http.server`. For source-level iteration without publishing, use [`packages/transport/test/smoke.mjs`](../../../packages/transport/test/smoke.mjs) and [`test-client.mjs`](./test-client.mjs) — both import from local repo paths.
