# MCP over WebRTC

**Specification, draft 0.1.**

**Author:** Jonas Neves
**Status:** Draft. Open for revision via Issues.
**Targets:** Implementers in the [Model Context Protocol](https://github.com/modelcontextprotocol) ecosystem. The standardization path (SEP, W3C-CG draft, or documented reference) is not decided.

## 1. Abstract

This document specifies a transport for the Model Context Protocol (MCP) that carries JSON-RPC 2.0 messages over a WebRTC data channel. It complements the existing **stdio** and **Streamable HTTP** transports defined in the MCP specification, and addresses use cases those transports don't cover well: peer-to-peer connectivity across NAT, no central server in the message path, and direct browser-to-browser MCP communication without an intervening backend.

## 2. Goals

- Define an unambiguous wire format for MCP JSON-RPC over a WebRTC data channel.
- Specify connection lifecycle clearly enough that independent implementations interoperate.
- Make **signaling** and **identity / authentication** pluggable: any compliant signaling or auth mechanism MAY be used as long as it produces a paired WebRTC peer connection.
- Be implementable in Node.js (via libraries such as `node-datachannel`) and in modern browsers (using native `RTCPeerConnection`).
- Interoperate with existing MCP clients and servers via the standard `@modelcontextprotocol/sdk` Transport interface.

## 3. Non-goals

- This document does NOT mandate a specific signaling provider. Implementations MAY use any signaling mechanism that achieves a paired WebRTC peer connection.
- This document does NOT mandate a specific peer-authentication mechanism. Recommended patterns are described, but alternatives are acceptable.
- This document does NOT define application-layer message semantics beyond what the MCP specification already defines. MCP method names, request/response shapes, etc. are inherited from MCP.

## 4. Terminology

- **Host** — an endpoint that runs an MCP server and accepts incoming connections.
- **Client** — an endpoint that runs an MCP client and dials a Host.
- **site id** — an opaque, low-entropy string, agreed out-of-band, used as a rendezvous key between Host and Client during signaling. It is a rendezvous token, not a credential (see § 9). This is the canonical term throughout this document; the reference bridge surfaces the same value through its public API as the parameter `id`.
- **Lobby** — a service used during signaling to broker opaque messages between peers; sees signaling traffic only.
- **Data channel** — a WebRTC `RTCDataChannel` carrying JSON-RPC messages after the WebRTC peer connection is established.

## 5. Layered architecture

Three independently-pluggable layers:

| Layer | Role | Spec mandates |
|---|---|---|
| 1. Transport | MCP JSON-RPC over WebRTC data channel | yes — wire format below |
| 2. Signaling | Discovery, pair-request, SDP/ICE exchange | recommended pattern only |
| 3. Identity | Peer authentication, anti-spoofing | OPTIONAL — not provided by the base transport |

Layers 1 and 2 are sufficient to establish a working, DTLS-encrypted MCP connection. **Layer 3 is OPTIONAL and is NOT part of the base transport.** The base transport is *identity-agnostic*: it admits any peer that completes the Layer 2 rendezvous on a shared `site id` (see § 9 for the resulting security posture). Peer authentication, when required, is supplied by a substrate or application layer above the base transport — see § 8.

Two compliant implementations interoperate at Layer 1 even if their Layer 2 / Layer 3 differ — a Client that knows how to do the same Layer 2 dance as a Host (and meets its Layer 3 requirements, if any) can reach that Host.

## 6. Layer 1: Transport (wire format)

### 6.1 Data channel

Data channel **label**: implementations SHOULD use the literal string `mcp`. Hosts and Clients that use a different label MAY interoperate if both sides agree out-of-band; the recommendation exists to maximize interop.

Data channel **ordering**: ordered (the WebRTC default).
Data channel **reliability**: reliable (the WebRTC default).
Data channel **maxRetransmits**, **maxPacketLifeTime**: not set (rely on default reliable behaviour).

A Host MAY accept multiple concurrent Clients; each concurrent Client uses its own peer connection and its own data channel.

### 6.2 Frame format

Each MCP JSON-RPC message is sent as a UTF-8-encoded JSON string in a single data channel `send` call. Implementations MUST NOT split a single JSON-RPC message across multiple data channel frames. Implementations MUST NOT bundle multiple JSON-RPC messages into a single data channel frame.

Receivers MUST treat each received data channel message as exactly one JSON-RPC frame. If JSON parsing fails, the receiver SHOULD ignore the malformed frame and MAY log it.

### 6.3 Message size

Implementations SHOULD support frames up to **256 KiB**. Larger payloads are NOT recommended at the transport layer — large single frames are prone to channel drops in some WebRTC implementations and intermediate networks.

For application payloads larger than the recommended limit, the **application layer** SHOULD use a chunked pattern (e.g., a tool that takes `start`, `append`, `commit` calls), not transport-level fragmentation. Transport-level chunking is explicitly out of scope of this specification.

### 6.4 Connection lifecycle

1. Layer 2 produces a paired peer connection with an open data channel (label `mcp`).
2. Implementations using the MCP SDK Transport interface SHOULD invoke `transport.start()` only after the data channel reaches `readyState: 'open'`.
3. The first JSON-RPC message a Client sends MUST be the MCP `initialize` request as defined by the MCP specification.
4. The Host responds with the `initialize` response. Subsequent messages follow the MCP specification's request/response/notification model.
5. Either side closes the connection by closing the data channel. The receiver of `close` MUST treat the connection as terminated and SHOULD release associated state.

## 7. Layer 2: Signaling (pluggable; recommended pattern)

To produce a paired WebRTC peer connection, both endpoints need a way to:
- Discover each other (rendezvous on a shared `site id`).
- Exchange SDP offers/answers and ICE candidates.

This specification does NOT mandate a particular signaling mechanism. The following pattern is RECOMMENDED for interoperability and is what the reference implementation uses:

### 7.1 Lobby

A WebSocket-based **lobby** service that brokers opaque JSON between connected peers within a named room. The lobby:
- MUST relay messages between connected peers in the same room.
- SHOULD NOT inspect, persist, or modify message contents beyond routing fields.
- SHOULD provide ephemeral rooms (auto-expire when empty).

A reference public lobby exists at `signal.neevs.io`. Implementations MAY use it, run their own, or use any equivalent.

### 7.2 Pair-request

The Client publishes an ad of kind `<app>-request` on the lobby, containing:
- a unique `nonce`
- the Client's identity (e.g., public key) so Hosts can route the response back

The Host listens for `<app>-request` ads, decides whether to accept, and publishes a corresponding `<app>-response` ad targeting the requester. On acceptance, the response carries an **ephemeral room id** unique to this pairing.

### 7.3 SDP / ICE exchange

Both peers connect to the ephemeral room over WebSocket. SDP offers, answers, and ICE candidates are exchanged through the ephemeral room as opaque signaling frames. Once peering completes, the data channel opens and Layer 1 takes over.

The reference implementation uses the lobby + pair-request modules from [`@nevescloud/pip-relay`](https://www.npmjs.com/package/@nevescloud/pip-relay) for this layer. Other compliant implementations MAY use any equivalent.

## 8. Layer 3: Identity (OPTIONAL; provided above the base transport)

Peer authentication is an **OPTIONAL** layer. The base transport does **not** provide it (see § 5 and § 9): it admits any peer that completes Layer 2 rendezvous on the shared `site id`. An implementation that needs to authenticate *who* a peer is MUST obtain that capability from a substrate or application layer above the base transport — the base transport is identity-agnostic and supplies no identity primitives, no key material, and no admission policy of its own.

The reference packages illustrate the split: the `WebRTCServerTransport` / `WebRTCClientTransport` (Layer 1) take only rendezvous and signaling parameters and authenticate no one; their signaling substrate, `@nevescloud/stoa`, is where any identity machinery would live. **None of the requirements in this section is imposed on a base-transport implementation.** They describe a recommended *shape* for an identity layer that an implementation MAY add.

Where an implementation does add a Layer 3, the following pattern is RECOMMENDED:

### 8.1 Signed pair-requests

Each peer holds a persistent P-256 ECDSA key pair. Each pair-request and pair-response is signed with the issuer's private key; receivers verify with the included public key. This prevents a malicious peer in the lobby from forging a pair-response that redirects a Client's WebRTC dial. (This protects the *signaling* exchange; on its own it does not establish that a given public key belongs to the party the operator intends to trust — see § 8.2.)

### 8.2 Trust on first use

An identity layer SHOULD prompt its human user (or follow a configured policy) before accepting a connection from an unrecognized public key. Once accepted, the public key MAY be persisted for silent admission on future connections. An identity layer SHOULD provide a way to revoke trust.

### 8.3 Optional: out-of-band attestation

Implementations MAY layer additional authentication on top (e.g., proof of email ownership, federation tokens, OIDC, etc.). Such mechanisms are out of scope of this specification.

## 9. Security considerations

- The lobby (Layer 2) sees signaling traffic but MUST NOT see Layer 1 message contents.
- **The base transport does not authenticate peers.** Layer 3 (§ 8) is OPTIONAL and absent from the base transport. Absent a Layer 3 identity binding, there is **no peer authentication**: DTLS gives confidentiality and integrity of the *channel*, but the base protocol establishes nothing about *who* the peer is. The `site id` is a rendezvous token, not a credential — it is low-entropy and explicitly not a secret, so any peer that learns a Host's `site id` can complete the rendezvous and connect. Operators who require knowing who connected MUST add a Layer 3 (§ 8); operators who do not add one MUST treat every admitted peer as unauthenticated.
- WebRTC data channels are end-to-end encrypted (DTLS); the SDP exchange establishes the keys. Lobby compromise does NOT expose data channel contents. Note, however, that DTLS authenticates the channel against tampering *between the two endpoints that exchanged the SDP* — it does not establish that the far endpoint is the party the operator intended (that is Layer 3's job).
- When a Layer 3 identity binding is in use, implementations MUST verify SDP fingerprints against that binding, to prevent a lobby-level man-in-the-middle from substituting its own keys during signaling. Absent a Layer 3 binding there is nothing to verify the fingerprint against, and this requirement does not apply.

## 10. Compatibility with existing MCP transports

A compliant `mcp-rtc` Transport implementation, when used with `@modelcontextprotocol/sdk`'s `Server` or `Client` classes, presents the same interface as `StdioServerTransport` or `StreamableHTTPServerTransport`. Existing MCP server and client code requires no changes other than the transport choice.

## 11. Prior art

Three Node implementations of "MCP over WebRTC" exist on npm at the time of this draft:

| Package | Author | Signaling |
|---|---|---|
| `mcp-webrtc` | pilartomas | bring-your-own (e.g. `TcpSocketSignaling`) |
| `mcp-webrtc-transport` | fury-r | Django Channels backend, or manual SDP exchange |
| `@jonasneves/mcp-webrtc` | jonasneves | public stoa lobby (default) |

These implementations do not interoperate, primarily because Layer 2 differs across them. This specification's contribution is to factor Layer 1 cleanly so future implementations can interoperate at the wire-format level even when their Layer 2 differs.

## 12. Open questions

- **Multi-data-channel semantics.** A single peer connection can host multiple data channels. Should this spec define a way for one paired connection to multiplex multiple MCP sessions? Probably not for v1; revisit if real demand emerges.
- **Reconnection on data-channel close.** Currently terminal; should there be a recommended reconnection pattern? Likely yes; defer to v0.2.
- **Resource and prompt MCP primitives.** The spec is agnostic — MCP messages are opaque to Layer 1. But subscribe/notify semantics (`notifications/resources/updated` etc.) raise questions about long-lived sessions across data channel hiccups.
- **Backpressure.** WebRTC data channels have an internal buffered-amount; implementations need to define how to apply backpressure. Currently undefined here.

## 13. Acknowledgments

Builds on:
- The [Model Context Protocol](https://github.com/modelcontextprotocol) specification by Anthropic and contributors.
- [`@nevescloud/pip-relay`](https://www.npmjs.com/package/@nevescloud/pip-relay) for the lobby + pair-request signaling pattern.
- Prior MCP-over-WebRTC implementations (see [§ prior art](#prior-art)) for demonstrating the architectural shape works.
