// MCP transport classes implementing the @modelcontextprotocol/sdk
// Transport interface.
export { WebRTCServerTransport } from './server-transport.mjs';
export { WebRTCClientTransport } from './client-transport.mjs';

// Lower-level substrate primitives (host(), join()). Useful when consuming
// the WebRTC layer directly without the MCP wrapping — e.g. when riding ad-
// hoc envelopes over the same lobby for systems that haven't migrated their
// wire format to MCP yet.
export { join, host } from './lib/transport.mjs';
