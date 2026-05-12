// Node-side test client for hello.html. Connects to a given site id,
// lists tools, calls get_greeting, prints the result.
//
// Usage: open hello.html in a browser, copy the site id from the URL,
// then:
//
//   node examples/hello-tool/test-client.mjs <site-id>

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WebRTCClientTransport } from '../../packages/transport/src/index.mjs';

const siteId = process.argv[2];
if (!siteId) {
  console.error('usage: node test-client.mjs <site-id>');
  process.exit(1);
}

const client = new Client({ name: 'hello-tool-test', version: '0.0.1' });
const transport = new WebRTCClientTransport({ siteId });
await client.connect(transport);
console.log(`[client] connected · siteId=${siteId}`);

const { tools } = await client.listTools();
console.log('[client] tools:', tools.map(t => `${t.name} — ${t.description}`).join('\n        '));

const result = await client.callTool({ name: 'get_greeting', arguments: {} });
console.log('[client] get_greeting →', result.content[0].text);

await client.close();
process.exit(0);
