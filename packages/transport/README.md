# @nevescloud/mcp-rtc

Reference implementation of the [**MCP-over-WebRTC** specification](../../SPEC.md).

Provides server- and client-side Transport classes that conform to the `@modelcontextprotocol/sdk` Transport interface, plus the lower-level `host()` / `join()` primitives for direct use.

## Status

**Node entry: ported.** Browser entry: in progress. Both will share the same source where it's runtime-agnostic, with thin runtime-specific shims for `RTCPeerConnection` and key-pair persistence.

The Node entry is functionally a port of `@jonasneves/mcp-webrtc` aligned with the spec; consumers of that package can swap dependencies once published. mcp-webrtc will be deprecated in favor of this package once browser parity lands.

## Exports

```js
import {
  WebRTCServerTransport,    // implements MCP SDK Transport, host side
  WebRTCClientTransport,    // implements MCP SDK Transport, client side
  host, join,               // lower-level WebRTC primitives
} from '@nevescloud/mcp-rtc';
```

## Spec alignment

This package implements the spec's mandated Layer 1 (wire format), and uses the spec's recommended Layer 2 (lobby + pair-request via `pip-relay`-compatible signaling) and Layer 3 (signed pair-requests with P-256 ECDSA) by default. Layers 2 and 3 are configurable for use with alternative signaling / authentication mechanisms.

## Companion package

[`@nevescloud/mcp-rtc-bridge-tab`](../bridge-tab) — browser library that takes an `mcp-rtc` server's tools and re-exposes them via WebMCP, making them callable by any local Claude with a Chrome extension.

## License

MIT
