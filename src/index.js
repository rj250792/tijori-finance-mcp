import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './register-tools.js';
import { closeBrowser } from './browser.js';

const server = new McpServer({ name: 'tijori-finance', version: '0.1.0' });
registerTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.on('SIGINT', async () => { await closeBrowser(); process.exit(0); });
  process.on('SIGTERM', async () => { await closeBrowser(); process.exit(0); });
}

main().catch(err => { console.error('[tijori-mcp] Fatal:', err.message); process.exit(1); });
