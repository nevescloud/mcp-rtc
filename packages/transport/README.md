# @nevescloud/mcp-rtc

Reference implementation of the [**MCP-over-WebRTC** specification](../../SPEC.md).

Provides server- and client-side Transport classes that conform to the `@modelcontextprotocol/sdk` Transport interface, plus the lower-level `host()` / `join()` primitives for direct use.

## Status

This package is the **MCP Transport wrapper**. As of `0.2.0`, the `host()` / `join()` substrate — WebRTC pairing, lobby, signed pair-requests, browser+Node from one codebase via a runtime shim — lives in **[`@nevescloud/stoa`](https://www.npmjs.com/package/@nevescloud/stoa)**, which this package depends on and re-exports. `@nevescloud/mcp-rtc` keeps only the `@modelcontextprotocol/sdk` Transport classes on top.

The substrate was reconciled there from this package's earlier Node port and pip-relay's browser copy (both descended from the private `jonasneves/signal` client) into one canonical implementation.

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
