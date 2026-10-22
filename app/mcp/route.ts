// A small stateless MCP server (Streamable HTTP, JSON responses).
// Lets anyone add the portfolio to Claude Code, Cursor or another MCP client.
import { profile } from "@/content/profile";
import {
  experienceText,
  extrasText,
  profileText,
  projectText,
  projectsText,
  researchText,
  searchProjects,
  storyText,
} from "@/lib/knowledge";
import { clientIp, hit } from "@/lib/ratelimit";

const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: Record<string, unknown>) => string;
};

const noArgs = { type: "object", properties: {} };

const tools: Tool[] = [
  {
    name: "about_henil",
    description: "Who Henil Gajjar is: current role, contact details, links, headline stats and education.",
    inputSchema: noArgs,
    run: profileText,
  },
  {
    name: "get_story",
    description: "Henil's career story in his own words, from a self-driving solar car to building agents at Waters.",
    inputSchema: noArgs,
    run: storyText,
  },
  {
    name: "get_experience",
    description: "Every role Henil has held, with dates and concrete results.",
    inputSchema: noArgs,
    run: experienceText,
  },
  {
    name: "search_projects",
    description:
      "Search Henil's projects by keyword (for example 'agents', 'fine-tuning', 'verilog', 'rag'). Empty query returns all.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Keywords to match" } },
    },
    run: ({ query }) => {
      const q = typeof query === "string" ? query.slice(0, 200) : "";
      if (!q.trim()) return projectsText();
      const found = searchProjects(q);
      return found.length ? found.map(projectText).join("\n\n") : `No projects matched "${q}".`;
    },
  },
  {
    name: "get_research",
    description: "Henil's publications and patents.",
    inputSchema: noArgs,
    run: researchText,
  },
  {
    name: "get_toolbox_and_ai_playbook",
    description: "Tools Henil uses, how he works with AI coding assistants, and what he does outside work.",
    inputSchema: noArgs,
    run: extrasText,
  },
];

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });

const ok = (id: RpcRequest["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const fail = (id: RpcRequest["id"], code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

function handle(req: RpcRequest) {
  const { id, method, params = {} } = req;
  switch (method) {
    case "initialize": {
      const asked = String(params.protocolVersion ?? "");
      return ok(id, {
        protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "henil-gajjar-portfolio", version: "1.0.0" },
        instructions: `Tools for learning about ${profile.name}, an AI/ML engineer. Start with about_henil. Contact: ${profile.email}.`,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      const tool = tools.find((t) => t.name === params.name);
      if (!tool) return fail(id, -32602, `Unknown tool: ${String(params.name)}`);
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      return ok(id, { content: [{ type: "text", text: tool.run(args) }], isError: false });
    }
    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(req: Request) {
  if (!hit(`mcp:${clientIp(req)}`, 60, 60_000)) return json(fail(null, -32000, "Rate limited"), 429);

  const body = (await req.json().catch(() => null)) as RpcRequest | null;
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return json(fail(null, -32700, "Parse error"), 400);
  }
  // Notifications get no response body.
  if (body.id === undefined) return new Response(null, { status: 202 });
  return json(handle(body));
}

// No server-initiated stream in this stateless server.
export function GET() {
  return new Response("This MCP endpoint takes POST requests.", { status: 405, headers: { allow: "POST" } });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, GET, OPTIONS",
      "access-control-allow-headers": "content-type, mcp-protocol-version, mcp-session-id, accept",
    },
  });
}
