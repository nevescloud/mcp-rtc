// End-to-end smoke test: spawn an MCP server and an MCP client in the
// same process, both transporting over the public stoa lobby, and verify
// a round-trip tool call works.
//
// Usage:
//   node test/smoke.mjs
//
// Requires network access to signal.neevs.io. Exits non-zero on failure.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { z } from 'zod';
import { WebRTCServerTransport, WebRTCClientTransport } from '../src/index.mjs';

const siteId = 'smoke-' + Math.random().toString(36).slice(2, 10);
console.log(`[smoke] siteId=${siteId}`);

const server = new McpServer({ name: 'smoke', version: '0.0.1' });
server.tool(
  'echo',
  'Returns its input reversed.',
  { text: z.string() },
  async ({ text }) => ({ content: [{ type: 'text', text: [...text].reverse().join('') }] })
);

const serverTransport = new WebRTCServerTransport({ siteId });
await server.connect(serverTransport);
console.log('[smoke] server up');

const client = new Client({ name: 'smoke-client', version: '0.0.1' });
const clientTransport = new WebRTCClientTransport({ siteId });
await client.connect(clientTransport);
console.log('[smoke] client connected');

const tools = await client.listTools();
const toolNames = tools.tools.map(t => t.name);
console.log('[smoke] discovered tools:', toolNames);
if (!toolNames.includes('echo')) {
  console.error('FAIL: echo not in tools list');
  process.exit(1);
}

const result = await client.callTool({ name: 'echo', arguments: { text: 'hello' } });
const echoed = result.content[0].text;
console.log('[smoke] echo("hello") =>', echoed);
if (echoed !== 'olleh') {
  console.error(`FAIL: expected "olleh", got "${echoed}"`);
  process.exit(1);
}

console.log('[smoke] OK — round trip works');
await client.close();
await serverTransport.close();
process.exit(0);
