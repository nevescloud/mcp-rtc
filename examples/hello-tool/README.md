# Example: hello-tool

A browser tab as a minimal MCP server. The page exposes one tool, `get_greeting`, that returns a fresh greeting with a random adjective+noun pair (so it's verifiable that the AI actually called the tool — the model can't generate the same value on its own). Consumable from three different AI surfaces over `mcp-rtc`, demonstrating that the protocol is genuinely model-agnostic.

This is the **smallest demo of mcp-rtc + AI**: one tool, three ways to call it, one is fully self-contained with no external service of any kind.

**Status:** Path B and Path C are live (try them at [neves.cloud/mcp-rtc](http://neves.cloud/mcp-rtc/)). Path A (in-browser inference) is the deferred path.

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

### Path A — in-browser inference (no API, no install, no vendor)

Open `examples/hello-tool/client.html` in a second browser tab. It loads a small instruction-tuned model entirely client-side (default: Qwen2.5-0.5B-Instruct via [WebLLM](https://webllm.mlc.ai/), with [Chrome's built-in Gemini Nano](https://developer.chrome.com/docs/ai/built-in) as a fallback when the browser supports it). The page connects to `hello.html` via `mcp-rtc`, lists the tool, prompts the local model with *"call get_greeting and tell me what the tab said."* The model issues a tool call, the call routes peer-to-peer, the model speaks the result.

No API key. No external service. No Anthropic, no OpenAI, no Google. Just protocol + browser + on-device inference. This is the path that proves mcp-rtc is genuinely model-agnostic.

### Path B — Claude Code via stdio bridge

If you have Claude Code locally, add the stdio bridge to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "mcp-webrtc-bridge": {
      "command": "npx",
      "args": ["-y", "@jonasneves/mcp-webrtc-bridge"]
    }
  }
}
```

Restart Claude Code. Then paste the *tell-Claude* prompt from [hello.html](./hello.html) (or any `mcp-rtc` host) into the Claude session — Claude calls the bridge's `connect` tool with the site id and lists the remote tools, then asks you what to do. **No browser, no Chrome extension, no WebMCP** — Path B is fully terminal-side. Works today against `@jonasneves/mcp-rtc` (the `@jonasneves/mcp-webrtc-bridge` package is itself built on top of `@jonasneves/mcp-rtc` since 0.2.0; 0.3.0 added the formatted tool-list response).

### Path C — Claude.ai / Claude Desktop via WebMCP

The headline pattern. Open **[`https://neves.cloud/b/#site=<site-id>`](https://neves.cloud/b/)** in Chrome 146+ in any tab where a [WebMCP](https://github.com/webmachinelearning/webmcp) consumer is attached. The page uses `@jonasneves/mcp-rtc-bridge-tab` to re-expose `hello.html`'s tool via `navigator.modelContext`. Any Claude that the WebMCP consumer surfaces tools to can then see and call `get_greeting` natively — no Node process on the user's machine, no public URL.

**WebMCP consumers in May 2026:**
- The **Anthropic Claude Chrome extension** is the most common; it surfaces tools to Claude.ai web.
- **[hatch](https://github.com/jonasneves/hatch)** is another extension that surfaces tools to terminal AIs (Claude Code, Cursor, Claude Desktop) via a local stdio MCP server.
- Future browsers or other extensions implementing the WebMCP draft also work.

Note: Claude.ai web *specifically* only talks to the Anthropic extension over a private channel — no third-party extension can replace it for that surface. Path B is the route for Claude Code / Cursor / Desktop without WebMCP at all.

`https://neves.cloud/b/` is the canonical short URL for any mcp-rtc bridge — paste any site id in the fragment and the local tab connects. The in-repo [`bridge.html`](./bridge.html) is the same code, kept as a self-contained example for forking or local serving.

## Why three paths

- Path A makes the model-agnostic claim verifiable (no vendor in the loop).
- Path B works today and serves Claude Code users who already have a stdio MCP setup.
- Path C is the bridge-tab headline pattern: zero install on the AI side.

If you only read one path, read A. If you only run one path, run B. If you want to see what mcp-rtc enables that no other MCP transport does, install the Chrome extension and run C.

## Why this matters

Centralized MCP transports (stdio, Streamable HTTP) tie the server to either a process on the asker's machine or a publicly-reachable backend. mcp-rtc plus a browser tab as the server lifts both constraints. *And* the protocol stays neutral about who's on the other end — Claude, an in-browser open-weights model, a future agent we haven't seen yet. The hello-tool demo proves all three can call the same server over the same wire, with no per-AI customization on the server side.

## Iterating on the substrate locally

`hello.html` and `bridge.html` import `@jonasneves/mcp-rtc` and `@jonasneves/mcp-rtc-bridge-tab` from `esm.sh` so the same files work both via the live URL and any local `python3 -m http.server`. If you're hacking on the transport or bridge-tab source itself, that means changes don't show up in the browser until you publish a new version. For source-level iteration without publishing, use [`packages/transport/test/smoke.mjs`](../../packages/transport/test/smoke.mjs) and [`test-client.mjs`](./test-client.mjs) — both import from the local repo paths directly.
