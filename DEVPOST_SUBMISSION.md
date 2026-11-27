# Devpost Submission — OpenFab Mesh (Open Agentic Web Challenge)

## Project Title
**OpenFab Mesh — Browser-Local Open Agentic Hardware & Supply-Chain Hub**

## Tagline
Two real cross-origin agentic websites demonstrating browser-local multi-agent orchestration, explicit origin consent, default-deny `sly_data` firewalls, BYOK isolation, confirmation-gated actions, and 7/7 MVP Profile 0.3 interoperability.

## Live URLs
- **Main Agentic Hub (Caller Origin)**: `https://agentweb.doaipm.com`
- **Independent Peer Agent Site (Second Origin)**: `https://peer-fab.doaipm.com`

---

## Inspiration
Hardware engineering and electronics supply chains are naturally multi-organization: a product team audits PCB design-for-manufacturability (DFM) and regulatory compliance internally, then requests live SMT fabrication quotes from independent contract manufacturers — without ever wanting to hand over proprietary cost margins, supplier pricing, or LLM API keys to third-party servers.

Today's SaaS agent platforms force teams to centralize prompts, secrets, and partner integrations behind opaque cloud proxies. The **Worldwide Agentic Web MVP Profile 0.3** flips that model on its head: websites publish open declarative agent networks, and the user's browser composes them directly across origins under explicit user consent and strict secret isolation. We built **OpenFab Mesh** + **ApexFab Open Peer Quoter** to prove this architecture works end-to-end on real hardware engineering workflows.

## What It Does
**OpenFab Mesh** (`agentweb.doaipm.com`) and **ApexFab Open Peer Quoter** (`peer-fab.doaipm.com`) are two independent Cloudflare Worker origins that interoperate live in the browser:

1. **Zero-Key Instant Evaluation + Pluggable BYOK Router**: Ships with a built-in **Deterministic Local Arbiter** so judges can run every scenario with zero setup, plus a full **BYOK OpenAI-Compatible Router** (pre-configured for Mozilla Otari `https://api.otari.ai/api/v1`, OpenAI, or any custom endpoint) stored strictly in browser `localStorage`, deletable with one click, and cryptographically/structurally isolated from peers and traces.
2. **Browser-Local Multi-Agent Execution & Schema-Validated Actions**: Orchestrates `openfab_concierge` (`front_man`), `bom_dfm_auditor`, and `compliance_arbiter` inside the browser using local read actions (`audit_bom_dfm`, `check_compliance_policy`) and a confirmation-gated write action (`reserve_bom_lot`) that requires an interactive **Write Confirmation Modal** and emits a signed **Action Receipt** (`receiptId`, `timestamp`, `status: "committed"`, SHA-256 signature).
3. **Real Cross-Origin Peer Composition with Explicit Consent & Default-Deny `sly_data`**: When quoting PCB/SMT lead times, the runtime resolves `fab_quoter` via `links.json`, enforces closed `peer_policy` (`allowed_peers` / `deny_origins`), opens an **Explicit Origin Consent Modal** showing the destination origin (`https://peer-fab.doaipm.com`) and a **`sly_data` Private Context Firewall** (hard-blocking `byok_api_key` and `internal_margin_secret`, while allowing opt-in forwarding of `target_region`), fetches the peer's `agent-manifest.json` and `fab_quoter.network.json` live via CORS, and executes the peer agents (`fab_quote_lead` -> `smt_leadtime_estimator`) locally in the caller's browser.
4. **Public MCP JSON-RPC 2.0 Endpoint (`/mcp`)**: Both origins expose standards-compliant `/mcp` endpoints (`initialize`, `tools/list`, `tools/call`) with `Access-Control-Allow-Origin: *`, while keeping write actions restricted to interactive browser confirmation.
5. **1-Click 7/7 MVP Interoperability Suite**: Built directly into the UI (and automated in Node.js `node:test`) to verify all 7 checks from Section 6 of Worldwide Agentic Web MVP Profile 0.3 — including negative fail-closed security tests.

## How We Built It
- **Zero-Dependency Portable Runtime (`src/runtime.js`)**: Written in pure ES modules so the exact same validation, execution-bounds, cycle-detection, `sly_data` firewall, site-action, and peer-composition code executes in the browser (`/runtime.js`), Cloudflare Workers, and Node.js automated tests.
- **Exact Cognizant `nsDeploy` / MVP Profile 0.3 Artifacts**: Both origins publish `agent-manifest.json`, Neuro SAN `*.network.json`, `links.json`, and `/.well-known/agent-card.json` with wildcard CORS and `OPTIONS` preflight support.
- **Fail-Closed Security Controls**:
  - Strict Neuro SAN schema validator rejecting malformed JSON, missing `front_man`, duplicate names, and unknown internal references.
  - Execution bounds: `maxDepth = 3`, `maxInvocations = 8`, `A -> B -> A` cycle detector, and `AbortController` timeouts.
  - Dual-layer `sly_data` protection: declarative allowlist + user opt-in checkbox + hard secret-key blocklist + output trace sanitizer.
- **Dual-Origin Edge Hosting**: Deployed as two separate Cloudflare Workers (`oaw-openfab-hub` and `oaw-peer-fab`) on separate origins (`agentweb.doaipm.com` and `peer-fab.doaipm.com`).

## Challenges We Ran Into
- **Keeping Browser & Worker Code 100% Unified with Zero Build Dependencies**: Cloudflare Workers do not expose Node's filesystem at runtime, yet we wanted `/runtime.js` served to the browser to be byte-for-byte identical to the tested `src/runtime.js` module. We solved this with a tiny zero-dependency sync script (`scripts/sync-assets.mjs`) paired with a byte-exact integrity assertion inside `node:test`.
- **Preventing Accidental Secret Leakage Across Async Traces**: It is surprisingly easy for a BYOK API key or private session variable to sneak into error logs or serialized execution traces. We added a dedicated canary-secret leak verifier (`containsSecretLeak` + `redactSecretsInObject`) that proves zero leakage across both outbound peer HTTP requests and the observable trace panel.

## Accomplishments That We're Proud Of
- **100% Spec Compliance (7/7 Green PASS)**: Both the live in-browser self-test and the headless Node.js suite pass all 7 MVP Profile 0.3 checks including every negative fail-closed security case.
- **Zero Friction for Judges**: Works instantaneously with zero API keys while supporting live Mozilla Otari / OpenAI BYOK switching in seconds.
- **Real Two-Origin Web Architecture**: Not a mock or single-page simulation — two genuinely independent websites composing agents live over CORS in the user's browser.

## What's Next
- Add cryptographic origin attestation (WebCrypto Ed25519 signed `agent-manifest.json` digests) for enterprise supplier directories.
- Expand the open hardware peer ecosystem with PCB impedance calculators, component lifecycle peers, and real-time freight/tariff peers.
- Support browser-local persisted peer registries so engineering teams can add their own contract manufacturers without redeploying the hub.

## Built With
- Cloudflare Workers
- JavaScript (ES Modules, Zero External Dependencies)
- Worldwide Agentic Web MVP Profile 0.3 (`nsDeploy` Manifest + Neuro SAN JSON)
- Model Context Protocol (MCP JSON-RPC 2.0)
- WebCrypto API (SHA-256 Action Receipts)
- Mozilla Otari / OpenAI-Compatible BYOK Router API
- Node.js `node:test`

---

## 90-Second YouTube Demo Script

**[0:00 – 0:15] Hook & Architecture (Screen: Split view of `agentweb.doaipm.com` and `peer-fab.doaipm.com`)**
> "Hardware teams audit PCB manufacturability internally, then ask external factories for quotes — without ever wanting to leak their profit margins or API keys. Meet **OpenFab Mesh**, two independent Cloudflare Worker websites implementing the **Worldwide Agentic Web MVP Profile 0.3** completely inside your browser."

**[0:15 – 0:30] Zero-Key Local Multi-Agent Audit (Click Scenario 1: DFM + Compliance Audit)**
> "Notice there is zero login and zero API key needed — our Deterministic Local Arbiter runs right away, or you can plug in Mozilla Otari or OpenAI under the BYOK Router tab stored strictly in `localStorage`. Clicking *DFM + Compliance Audit* runs `openfab_concierge`, delegates to `bom_dfm_auditor` and `compliance_arbiter`, and executes schema-validated local actions."

**[0:30 – 0:52] Real Cross-Origin Peer Composition + `sly_data` Firewall (Click Scenario 2: Cross-Origin SMT Quote)**
> "Now watch real cross-origin composition. Asking for an SMT quote resolves `fab_quoter` via `links.json` to our second origin, `peer-fab.doaipm.com`. Before a single packet leaves, our **Explicit Origin Consent Modal** pops up. Look at the `sly_data` firewall: `byok_api_key` and `internal_margin_secret` are hard-blocked; only opt-in `target_region: EU` is allowed. When I click Approve, the browser fetches ApexFab's manifest and network over CORS and executes `fab_quote_lead` and `smt_leadtime_estimator` locally!"

**[0:52 – 1:08] Write Action Gate & Untrusted Peer Fail-Closed (Click Scenario 3 & Scenario 4)**
> "State-changing actions like `reserve_bom_lot` can never run silently — they pop up a **Write Confirmation Modal** showing origin and validated arguments, emitting a SHA-256 signed Action Receipt. And attempting to call `untrusted-peer.example` fails closed immediately via our closed `peer_policy`."

**[1:08 – 1:30] Observable Trace & 1-Click 7/7 MVP Interop Suite (Click "Run 7/7 MVP Interop Suite")**
> "Every hop, origin, consent decision, and secret redaction is visible in the **Execution Trace** with zero secrets leaked. Finally, one click runs all **7/7 MVP Profile 0.3 Interoperability Checks** — discovery, fail-closed schema validation, cycle & budget limits, write receipts, live CORS peer composition, canary BYOK isolation, and `/mcp` JSON-RPC 2.0 — all green PASS. Thanks for watching!"
