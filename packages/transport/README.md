# @jonasneves/mcp-rtc

Reference implementation of the [**MCP-over-WebRTC** specification](../../SPEC.md).

Provides server- and client-side Transport classes that conform to the `@modelcontextprotocol/sdk` Transport interface, plus the lower-level `host()` / `join()` primitives for direct use.

## Status

**Scaffolded.** Implementation lands as the spec stabilizes. The shape will closely follow `@jonasneves/mcp-webrtc` (current reference impl, slated for supersession by this package once parity is reached).

## Planned exports

```js
import {
  WebRTCServerTransport,    // implements MCP SDK Transport, host side
  WebRTCClientTransport,    // implements MCP SDK Transport, client side
  host, join,               // lower-level WebRTC primitives
} from '@jonasneves/mcp-rtc';
```

## Spec alignment

This package implements the spec's mandated Layer 1 (wire format), and uses the spec's recommended Layer 2 (lobby + pair-request via `pip-relay`-compatible signaling) and Layer 3 (signed pair-requests with P-256 ECDSA) by default. Layers 2 and 3 are configurable for use with alternative signaling / authentication mechanisms.

## Companion package

[`@jonasneves/mcp-rtc-bridge-tab`](../bridge-tab) — browser library that takes an `mcp-rtc` server's tools and re-exposes them via WebMCP, making them callable by any local Claude with a Chrome extension.

## License

MIT
