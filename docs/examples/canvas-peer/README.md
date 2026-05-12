# Example: canvas-peer

The reference application of `@nevescloud/mcp-rtc-bridge-tab`. A self-contained browser page that:

1. Joins a remote canvas (or any mcp-rtc server) at a given `site id`.
2. Discovers its tools.
3. Re-exposes those tools via WebMCP, so any local Claude (with the Anthropic Chrome extension) can call them — `peer_render`, `peer_clear`, etc. without a Node bridge.

This is the example that justifies why this repo exists: a developer should be able to drop the `bridge-tab` library into their page and get cross-machine MCP for free, no install, no public URL.

**Status:** placeholder. Will land alongside the bridge-tab implementation.
