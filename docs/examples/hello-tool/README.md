# Example: hello-tool

A browser tab as a minimal MCP server. The page exposes one tool, `get_greeting`, that returns a fresh greeting with a random adjective+noun pair (so it's verifiable that the AI actually called the tool — the model can't generate the same value on its own). Three AI surfaces consume it over `mcp-rtc`, demonstrating that the protocol is genuinely model-agnostic.

This is the **smallest demo of mcp-rtc + AI**: one tool, three ways to call it, one fully self-contained with no external service of any kind.

**Status:** all three paths are live (try them at [neves.cloud/mcp-rtc](http://neves.cloud/mcp-rtc/)).

**Forward-looking note.** When the capability host (`docs/examples/capability-host`) ships, `get_greeting` becomes the always-available "heartbeat" capability there — it registers regardless of device, takes no permission, and gives every visit a transport smoke test for free. hello-tool stays in this folder as the minimal substrate test for anyone debugging the transport in isolation.

## What the tab exposes

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

## Consumption paths

Three independent ways to call the tool from an actual AI. Run any (or all) against the same `hello.html` instance.

### Path B — Claude Code via stdio bridge

If you have Claude Code locally, add the stdio bridge to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "mcp-rtc-bridge": {
      "command": "npx",
      "args": ["-y", "@nevescloud/mcp-rtc-bridge"]
    }
  }
}
```

Restart Claude Code. Then paste the *tell-Claude* prompt from [hello.html](./hello.html) (or any `mcp-rtc` host) into the Claude session — Claude calls the bridge's `connect` tool with the site id and lists the remote tools, then asks you what to do. **No browser, no Chrome extension, no WebMCP** — Path B is fully terminal-side.

### Path C — Claude.ai / Claude Desktop via WebMCP

The headline pattern. Open **[`https://neves.cloud/b/#<site-id>`](https://neves.cloud/b/)** in Chrome 146+ in any tab where a [WebMCP](https://github.com/webmachinelearning/webmcp) consumer is attached. The page uses `@nevescloud/mcp-rtc-bridge-tab` to re-expose `hello.html`'s tool via `navigator.modelContext`. Any Claude that the WebMCP consumer surfaces tools to can then see and call `get_greeting` natively — no Node process on the user's machine, no public URL.

**WebMCP consumers in May 2026:**
- The **Anthropic Claude Chrome extension** is the most common; it surfaces tools to Claude.ai web.
- **[hatch](https://github.com/jonasneves/hatch)** is another extension that surfaces tools to terminal AIs (Claude Code, Cursor, Claude Desktop) via a local stdio MCP server.
- Future browsers or other extensions implementing the WebMCP draft also work.

Note: Claude.ai web *specifically* only talks to the Anthropic extension over a private channel — no third-party extension can replace it for that surface. Path B is the route for Claude Code / Cursor / Desktop without WebMCP at all.

`https://neves.cloud/b/` is the canonical short URL for any mcp-rtc bridge — paste any site id in the fragment and the local tab connects. The in-repo [`bridge.html`](./bridge.html) is the same code, kept as a self-contained example for forking or local serving.

### Path A — in-browser inference (no API, no install, no vendor)

Open `docs/examples/hello-tool/client.html` in a second browser tab. The page connects to `hello.html` via `mcp-rtc`, lists its tools, then mounts [`@nevescloud/pip`](https://github.com/nevescloud/pip)'s local-model bundle — a floating chat bubble running [`LiquidAI/LFM2.5-350M-ONNX`](https://huggingface.co/LiquidAI/LFM2.5-350M-ONNX) over `transformers.js` + WebGPU. Each discovered remote tool is registered as a pip slash command — typing `/get_greeting` dispatches the call deterministically over WebRTC and renders the result in the chat. Free text goes to the local model.

No API key. No external service. No Anthropic, no OpenAI, no Google. This is the path that makes the model-agnostic claim verifiable: the only AI on the wire is a 350M-parameter open-weights model running in the user's browser.

**Why slash dispatch rather than model-driven tool emission.** Reliable structured tool-call output at sub-1B parameters is still fragile in 2026. Putting tool dispatch behind pip's deterministic slash commands keeps the demo honest — the tool call really happens over WebRTC, the result really comes back, and the bottleneck isn't the model's structured-output reliability. Model-driven selection is the obvious next iteration once a small-enough model emits reliably parseable tool calls.

**Requirements.** WebGPU (Chrome / Edge 113+ on desktop with a recent GPU). First load downloads the model weights (~250 MB at q4); subsequent loads use the browser cache. Falls back to a clear error message on browsers without WebGPU, pointing at Paths B and C.

## Why these paths

- Path A is the proof: model-agnostic, no vendor, in-browser open-weights model exercising the protocol end-to-end.
- Path B works today and serves Claude Code users who already have a stdio MCP setup.
- Path C is the bridge-tab headline pattern: zero install on the AI side.

If you only read one path, read A. If you only run one path, run B. If you want to see what mcp-rtc enables that no other MCP transport does, install a WebMCP consumer and run C.

## Why this matters

Centralized MCP transports (stdio, Streamable HTTP) tie the server to either a process on the asker's machine or a publicly-reachable backend. mcp-rtc plus a browser tab as the server lifts both constraints. *And* the protocol stays neutral about who's on the other end — a hosted Claude on Paths B and C, an in-browser open-weights model on Path A, a future agent we haven't seen yet. The hello-tool demo proves all three can call the same server over the same wire, with no per-AI customization on the server side.

## Iterating on the substrate locally

`hello.html` and `bridge.html` import `@nevescloud/mcp-rtc` and `@nevescloud/mcp-rtc-bridge-tab` from `esm.sh` so the same files work both via the live URL and any local `python3 -m http.server`. If you're hacking on the transport or bridge-tab source itself, that means changes don't show up in the browser until you publish a new version. For source-level iteration without publishing, use [`packages/transport/test/smoke.mjs`](../../packages/transport/test/smoke.mjs) and [`test-client.mjs`](./test-client.mjs) — both import from the local repo paths directly.
