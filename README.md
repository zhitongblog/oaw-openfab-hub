# OpenFab Mesh — Open Agentic Hardware & Supply-Chain Hub

**Worldwide Agentic Web MVP Profile 0.3 Reference Implementation** for the **Open Agentic Web Challenge** (Cognizant AI Lab · Mozilla · MIT Media Lab NANDA · AWS).

- **Caller / Main Origin**: `https://agentweb.doaipm.com` (`oaw-openfab-hub`)
- **Independent Cross-Origin Peer**: `https://peer-fab.doaipm.com` (`oaw-peer-fab` — ApexFab Open Peer Quoter)
- **Zero External Runtime Dependencies**: Pure ES modules running identically in Cloudflare Workers, modern browsers, and Node.js 20+.

## Architecture Overview

```
Browser (User's Device — Local Execution & Secret Boundary)
 ├── Fetches https://agentweb.doaipm.com/agent-manifest.json
 ├── Loads  openfab_hub.network.json (openfab_concierge -> bom_dfm_auditor, compliance_arbiter)
 ├── Executes local schema-validated Site Actions:
 │    ├── audit_bom_dfm (read-only)
 │    ├── check_compliance_policy (read-only)
 │    └── reserve_bom_lot (write — gated by Explicit Confirmation Modal + Signed Receipt)
 ├── Enforces closed peer_policy & deny_origins (blocks https://untrusted-peer.example fail-closed)
 ├── Prompts Explicit Cross-Origin Consent Modal + Default-Deny sly_data Firewall:
 │    ├── HARD-BLOCKED: byok_api_key, internal_margin_secret
 │    └── OPT-IN ONLY:  target_region
 └── Fetches https://peer-fab.doaipm.com/agent-manifest.json + fab_quoter.network.json over CORS
      └── Runs ApexFab peer agents (fab_quote_lead -> smt_leadtime_estimator) LOCALLY in browser
```

## Public Discovery & Interoperability Endpoints

All public artifacts and `/mcp` respond with `Access-Control-Allow-Origin: *` and `OPTIONS` 204 preflight:

| Endpoint | Purpose |
| --- | --- |
| `GET /` | Interactive OpenFab Mesh laboratory UI + 1-click **7/7 MVP Interoperability Suite** |
| `GET /runtime.js` | Portable browser/Node Worldwide Agentic Web MVP 0.3 runtime |
| `GET /agent-manifest.json` | Cognizant `nsDeploy` / MVP 0.3 manifest (`networks`, `llm_router`, `allowed_peers`, `peer_policy`, `agent_mcp`, `linking`, `actions`) |
| `GET /openfab_hub.network.json` | Neuro SAN 0.3 declarative multi-agent network with explicit `sly_data` allow rules |
| `GET /links.json` | Symbolic cross-origin peer link table (`fab_quoter -> https://peer-fab.doaipm.com/fab_quoter`) |
| `GET /.well-known/agent-card.json` | Open Agentic Web discovery card |
| `POST /mcp` | Public JSON-RPC 2.0 MCP server (`initialize`, `tools/list`, `tools/call`) |
| `GET /api/health` | Edge health check |

## Local Verification & Testing

```bash
cd projects/oaw-openfab-hub
npm run sync
npm run check
npm test
```

The Node.js `node:test` suite exercises all 7 MVP Profile 0.3 interoperability checks — including negative fail-closed security cases, `/mcp` JSON-RPC 2.0 calls, and live cross-origin peer composition directly against `oaw-peer-fab`'s Cloudflare Worker handler.

## Deployment (Cloudflare Workers)

```bash
# 1. Deploy independent peer origin first
cd projects/oaw-peer-fab
npx wrangler deploy

# 2. Deploy main caller hub
cd ../oaw-openfab-hub
npx wrangler deploy
```
