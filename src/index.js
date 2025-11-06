import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import stripJsonComments from "strip-json-comments";

const DEFAULT_FILE = ".mcp-cli-catalog.json";
const SERVER_VERSION = "0.2.0";

export function resolveConfigPath({ args = process.argv, env = process.env } = {}) {
  const idx = args.indexOf("--config");
  if (idx !== -1 && args[idx + 1]) {
    return path.resolve(args[idx + 1]);
  }

  if (env.MCP_CLI_CATALOG_FILE) {
    return path.resolve(env.MCP_CLI_CATALOG_FILE);
  }

  return path.join(os.homedir(), DEFAULT_FILE);
}

export function startCatalogServer({
  configPath,
  args = process.argv,
  env = process.env
} = {}) {
  const resolvedConfigPath = configPath
    ? path.resolve(configPath)
    : resolveConfigPath({ args, env });

  if (!fs.existsSync(resolvedConfigPath)) {
    throw new Error(`Config not found: ${resolvedConfigPath}`);
  }

  let doc;
  try {
    const configText = fs.readFileSync(resolvedConfigPath, "utf8");
    const normalizedConfigText = stripJsonComments(configText);
    doc = JSON.parse(normalizedConfigText);
  } catch (error) {
    throw new Error(`Failed to parse ${resolvedConfigPath}: ${error.message}`);
  }

  const tools = Array.isArray(doc?.tools) ? doc.tools : [];
  if (!tools.length) {
    throw new Error(`No tools in ${resolvedConfigPath} (expected {"tools":[...]})`);
  }

  // Build the valid tools list
  const validTools = [];
  const toolUsage = new Map();
  const toolCommands = new Map();
  for (const tool of tools) {
    const name = tool?.name;
    const desc = typeof tool?.description === "string" ? tool.description.trim() : "";
    const usage = typeof tool?.usage === "string" ? tool.usage.trim() : "";
    const command = typeof tool?.command === "string" ? tool.command.trim() : "";
    if (!name || !desc) {
      console.warn(
        `Skipping invalid tool (needs "name" and "description"): ${JSON.stringify(tool)}`
      );
      continue;
    }

    const hint = " [CLI tool — pre-installed in PATH; only exists in terminal shell]";
    const fullDescription = `${desc}${hint}`;

    if (usage) {
      toolUsage.set(name, usage);
    }

    if (command) {
      toolCommands.set(name, command);
    }

    validTools.push({
      name,
      description: fullDescription,
      inputSchema: { type: "object", properties: {}, additionalProperties: false }
    });
  }

  if (!validTools.length) {
    throw new Error(`No valid tools found in ${resolvedConfigPath}`);
  }

  const server = new Server(
    { name: "cli-catalog", version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  // Handle tools/list requests
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: validTools };
  });

  // Handle tools/call requests
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const usage = toolUsage.get(toolName);
    const runCommand = toolCommands.get(toolName) || toolName;
    const instructions = [`Please run the executable \`${runCommand}\` in the terminal shell.`];
    if (usage) {
      instructions.push(usage);
    }
    return {
      content: [{ type: "text", text: instructions.join("\n") }]
    };
  });

  console.error(
    `cli-catalog: registered ${validTools.length} advertise-only tool(s) from ${resolvedConfigPath}`
  );

  const transport = new StdioServerTransport();
  server.connect(transport);
  return server;
}

export function runCli(args = process.argv, env = process.env) {
  try {
    const server = startCatalogServer({ args, env });
    return server;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return undefined;
  }
}

const entryPoint = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
const modulePath = fileURLToPath(import.meta.url);

if (entryPoint && modulePath === entryPoint) {
  runCli();
}
