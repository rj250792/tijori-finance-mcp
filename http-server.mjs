import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { registerTools } from "./src/register-tools.js";
import { closeBrowser } from "./src/browser.js";

const PORT = process.env.PORT ?? 3303;
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.warn(
    "WARNING: MCP_AUTH_TOKEN is not set — this server is accepting requests with NO authentication. " +
    "Only run it this way for local testing behind a tunnel you control. Set MCP_AUTH_TOKEN before exposing it publicly."
  );
}

const app = createMcpExpressApp({ host: "0.0.0.0" });

app.get("/health", (_req, res) => res.status(200).json({ status: "ok", server: "tijori-finance" }));

app.use((req, res, next) => {
  if (req.path === "/health") return next();
  if (!AUTH_TOKEN) return next();
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token !== AUTH_TOKEN) {
    return res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized — missing or invalid bearer token" },
      id: null,
    });
  }
  next();
});

app.post("/mcp", async (req, res) => {
  const server = new McpServer({ name: "tijori-finance", version: "0.1.0" });
  registerTools(server);
  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (err) {
    console.error("Error handling MCP request:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.get("/mcp", (_req, res) => {
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null });
});

app.delete("/mcp", (_req, res) => {
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null });
});

app.listen(PORT, () => {
  console.log(`tijori-finance MCP HTTP server listening on 0.0.0.0:${PORT} (endpoint: /mcp)`);
});

process.on("SIGINT", async () => { await closeBrowser(); process.exit(0); });
process.on("SIGTERM", async () => { await closeBrowser(); process.exit(0); });
