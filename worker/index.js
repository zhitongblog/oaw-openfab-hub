import {
  HUB_ORIGIN,
  AGENT_MANIFEST,
  OPENFAB_NETWORK,
  LINKS_JSON,
  AGENT_CARD
} from "../src/artifacts.js";
import {
  SITE_ACTION_SCHEMAS,
  executeSiteAction
} from "../src/runtime.js";
import { RUNTIME_SOURCE } from "../src/runtime-source.js";
import { renderOpenFabHomeHtml } from "../src/ui.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Cache-Control": "no-store"
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS
    }
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...CORS_HEADERS
    }
  });
}

function jsResponse(source, status = 200) {
  return new Response(source, {
    status,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      ...CORS_HEADERS
    }
  });
}

const PUBLIC_MCP_TOOLS = ["audit_bom_dfm", "check_compliance_policy"];

async function handleMcp(body) {
  if (!body || typeof body !== "object" || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return jsonResponse(
      {
        jsonrpc: "2.0",
        id: body?.id ?? null,
        error: { code: -32600, message: "Invalid JSON-RPC 2.0 request." }
      },
      400
    );
  }

  const { id = null, method, params = {} } = body;

  if (method === "initialize") {
    return jsonResponse({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        agentMcpProtocol: "nsdeploy-agent-mcp/v1",
        network: "openfab_hub",
        front_man: "openfab_concierge",
        serverInfo: {
          name: "openfab-mesh-hub",
          version: "1.0.0",
          origin: HUB_ORIGIN
        },
        capabilities: {
          tools: { listChanged: false }
        }
      }
    });
  }

  if (method === "notifications/initialized") {
    return jsonResponse({ jsonrpc: "2.0", id, result: { acknowledged: true } });
  }

  if (method === "tools/list") {
    return jsonResponse({
      jsonrpc: "2.0",
      id,
      result: {
        tools: PUBLIC_MCP_TOOLS.map((name) => {
          const def = SITE_ACTION_SCHEMAS[name];
          return {
            name: def.name,
            description: def.description,
            inputSchema: def.inputSchema
          };
        })
      }
    });
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const args = params?.arguments ?? {};
    if (!PUBLIC_MCP_TOOLS.includes(toolName)) {
      return jsonResponse(
        {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message:
              toolName === "reserve_bom_lot"
                ? "reserve_bom_lot is a write action restricted to interactive browser user confirmation and is not exposed for unconfirmed remote MCP execution."
                : `Unknown MCP tool: ${String(toolName)}`
          }
        },
        toolName === "reserve_bom_lot" ? 403 : 404
      );
    }

    const execRes = await executeSiteAction(toolName, args, { origin: HUB_ORIGIN });
    if (!execRes.ok) {
      return jsonResponse(
        {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: "Invalid tool arguments",
            data: { errors: execRes.errors || [execRes.error] }
          }
        },
        400
      );
    }

    const summaryText =
      toolName === "audit_bom_dfm"
        ? `DFM Audit (${execRes.result.boardName}): Score ${execRes.result.dfmScore}/100 (Grade ${execRes.result.grade}), yield ${execRes.result.estimatedFirstPassYieldPct}%, recommended finish ${execRes.result.recommendedFinish}.`
        : `Compliance Policy (${execRes.result.region}): ${execRes.result.overallStatus} (${execRes.result.checks.length} regulatory checks evaluated).`;

    return jsonResponse({
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: summaryText }],
        structuredContent: execRes.result,
        isError: false
      }
    });
  }

  return jsonResponse(
    {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` }
    },
    404
  );
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "GET") {
      if (path === "/" || path === "/index.html") {
        return htmlResponse(renderOpenFabHomeHtml());
      }
      if (path === "/runtime.js") {
        return jsResponse(RUNTIME_SOURCE);
      }
      if (path === "/agent-manifest.json") {
        return jsonResponse(AGENT_MANIFEST);
      }
      if (path === "/openfab_hub.network.json") {
        return jsonResponse(OPENFAB_NETWORK);
      }
      if (path === "/links.json") {
        return jsonResponse(LINKS_JSON);
      }
      if (path === "/.well-known/agent-card.json") {
        return jsonResponse(AGENT_CARD);
      }
      if (path === "/api/health") {
        return jsonResponse({
          status: "ok",
          service: "oaw-openfab-hub",
          profile: "worldwide-agentic-web-mvp/0.3",
          origin: HUB_ORIGIN,
          timestamp: new Date().toISOString()
        });
      }
    }

    if (request.method === "POST" && path === "/mcp") {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          {
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error: invalid JSON body." }
          },
          400
        );
      }
      return handleMcp(body);
    }

    return jsonResponse({ error: "Not found", path }, 404);
  }
};
