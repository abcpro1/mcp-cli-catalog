# mcp-cli-catalog

An MCP server that publishes the CLI tools on your machine. Coding agents already have shell access and are great at generating complex commands with pipes and filters. This just tells them what's available so they can use MCP tools more efficiently.

## Why
- LLM coding agents can effectively chain shell commands with pipes to filter and reshape complex data.
- Declaring CLI tools as MCP tools makes them discoverable to the LLM.

## How It Works
- This server exposes your CLI tools as MCP tool definitions so the LLM knows what's available.
- The MCP tools defined in the catalog only instruct the LLM to use the shell; they do not execute any tools themselves.
- Shell access is required for the agent to actually run the commands.

## Install
Add the server to your MCP config (e.g. for Claude Code):

```json
{
  "mcpServers": {
    "cli-catalog": {
      "command": "npx",
      "args": ["mcp-cli-catalog"]
    }
  }
}
```

Or with a a custom catalog path:

```json
{
  "mcpServers": {
    "cli-catalog": {
      "command": "npx",
      "args": ["mcp-cli-catalog", "--config", "./tools.json"]
    }
  }
}
```

## Configure Tools
Add a JSON catalog file (default: `~/.mcp-cli-catalog.json`) with the CLI tools you want to make discoverable:

```jsonc
{
  // JSON Comments are allowed.
  "tools": [
    {
      "name": "knowledge-base-search",
      "description": "Search full text across the knowledge base",
      "usage": "knowledge-base-search 'pattern' | head"
    },
    {
      "name": "knowledge-base-get",
      "description": "Get a knowledge base file",
      "usage": "knowledge-base-get path/to/file.md | sed -n '100,200p'\nknowledge-base-get path/to/file.md | rg 'TODO'"
    }
  ]
}
```

- `name` and `description` are required.
- `usage` (optional) shows up as a hint in responses.
- `command` (optional) is the exact string to run. If you skip it, the tool `name` is used.
- Point to a different catalog with `--config <path>` or `MCP_CLI_CATALOG_FILE=<path>`.

## Test
Test your server setup with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector npx mcp-cli-catalog
```

Or with a custom catalog:

```bash
npx @modelcontextprotocol/inspector npx mcp-cli-catalog --config ./tools.json
```

## Development
- `npm run dev`: run directly from `src/index.js`
- `npm run build`: compile to `dist/index.js` and fix permissions
- `npm start`: run the built server from `dist/index.js`

## Alternative approaches
Cloudflare’s “Code Mode”<sup>[1](https://blog.cloudflare.com/code-mode/)</sup> and Anthropic’s code‑execution‑with‑MCP post<sup>[2](https://www.anthropic.com/engineering/code-execution-with-mcp)</sup> explore a different way to solve MCP tooling challenges. Their approach provides MCP tools through an SDK to the LLM, which writes code to call and process those tools. This project takes a simpler path: build CLI tools and make them discoverable through the MCP tool catalog.

---
1. Cloudflare, “Code Mode,” 2025.  
2. Anthropic, “Code execution with MCP,” 2025.
