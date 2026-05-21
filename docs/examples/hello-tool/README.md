# Example: hello-tool

A browser tab as a minimal MCP server. The page exposes one tool, `get_greeting`, that returns a fresh greeting with a random adjective+noun pair (so it's verifiable that the AI actually called the tool — the model can't generate the same value on its own). Two AI surfaces consume it today over `mcp-rtc`; a third (in-browser inference) is the deferred direction that would make the model-agnostic claim end-to-end verifiable with no vendor in the loop.

This is the **smallest demo of mcp-rtc + AI**: one tool, two working paths, plus a third on the roadmap.

**Status:** Paths B and C are live (try them at [neves.cloud/mcp-rtc](http://neves.cloud/mcp-rtc/)). Path A is deferred.

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

Two working ways to call the tool from an actual AI, both running against the same `hello.html` instance. A third (in-browser inference) is sketched at the end of this section as the deferred direction.

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

### Deferred: Path A — in-browser inference (no API, no install, no vendor)

The sketch: open `docs/examples/hello-tool/client.html` in a second browser tab. It would load a small instruction-tuned model entirely client-side (e.g. Qwen2.5-0.5B-Instruct via [WebLLM](https://webllm.mlc.ai/), or [Chrome's built-in Gemini Nano](https://developer.chrome.com/docs/ai/built-in) where supported), connect to `hello.html` via `mcp-rtc`, list the tool, and prompt the local model with *"call get_greeting and tell me what the tab said."* The model would issue a tool call, the call would route peer-to-peer, the model would speak the result.

No API key. No external service. No Anthropic, no OpenAI, no Google. This is the path that would make the model-agnostic claim end-to-end verifiable with no vendor in the loop. Deferred because reliable tool calling at sub-1B parameters is fragile in 2026; revisit once the substrate is more battle-tested.

## Why these paths

- Path B works today and serves Claude Code users who already have a stdio MCP setup.
- Path C is the bridge-tab headline pattern: zero install on the AI side.
- Path A (deferred) would make the model-agnostic claim end-to-end verifiable, with no vendor in the loop.

If you only run one path, run B. If you want to see what mcp-rtc enables that no other MCP transport does, install a WebMCP consumer and run C.

## Why this matters

Centralized MCP transports (stdio, Streamable HTTP) tie the server to either a process on the asker's machine or a publicly-reachable backend. mcp-rtc plus a browser tab as the server lifts both constraints. *And* the protocol stays neutral about who's on the other end — Claude today, an in-browser open-weights model on Path A tomorrow, a future agent we haven't seen yet. The hello-tool demo shows two distinct AI surfaces calling the same server over the same wire, with no per-AI customization on the server side.

## Iterating on the substrate locally

`hello.html` and `bridge.html` import `@nevescloud/mcp-rtc` and `@nevescloud/mcp-rtc-bridge-tab` from `esm.sh` so the same files work both via the live URL and any local `python3 -m http.server`. If you're hacking on the transport or bridge-tab source itself, that means changes don't show up in the browser until you publish a new version. For source-level iteration without publishing, use [`packages/transport/test/smoke.mjs`](../../packages/transport/test/smoke.mjs) and [`test-client.mjs`](./test-client.mjs) — both import from the local repo paths directly.
