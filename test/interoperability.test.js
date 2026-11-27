import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import hubWorker from "../worker/index.js";
import peerWorker from "../../oaw-peer-fab/worker/index.js";
import { RUNTIME_SOURCE } from "../src/runtime-source.js";
import {
  OpenAgenticRuntime,
  validateNetwork,
  evaluatePeerPolicy,
  filterSlyData,
  executeSiteAction,
  containsSecretLeak,
  runInteroperabilitySuite
} from "../src/runtime.js";
import {
  HUB_ORIGIN,
  PEER_FAB_ORIGIN,
  UNTRUSTED_PEER_ORIGIN,
  AGENT_MANIFEST,
  OPENFAB_NETWORK,
  LINKS_JSON
} from "../src/artifacts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dual-origin virtual router dispatching directly to the real Cloudflare Worker
 * fetch handlers of oaw-openfab-hub and oaw-peer-fab (zero mocking of protocol logic).
 */
async function dualOriginFetch(input, init = {}) {
  const urlStr = typeof input === "string" ? input : input.url;
  const parsed = new URL(urlStr);
  const req = new Request(urlStr, init);

  if (parsed.origin === HUB_ORIGIN) {
    return hubWorker.fetch(req);
  }
  if (parsed.origin === PEER_FAB_ORIGIN) {
    return peerWorker.fetch(req);
  }
  throw new Error(`Unexpected outbound fetch to unauthorized origin: ${parsed.origin}`);
}

test("Bundle integrity: served /runtime.js matches src/runtime.js byte-for-byte", async () => {
  const diskRuntime = fs.readFileSync(path.resolve(__dirname, "../src/runtime.js"), "utf8");
  assert.equal(RUNTIME_SOURCE, diskRuntime);

  const res = await hubWorker.fetch(new Request(`${HUB_ORIGIN}/runtime.js`));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(await res.text(), diskRuntime);
});

test("MVP Check 1: Public discovery artifacts & CORS headers on both origins", async () => {
  const hubPaths = [
    "/agent-manifest.json",
    "/openfab_hub.network.json",
    "/links.json",
    "/.well-known/agent-card.json",
    "/api/health"
  ];
  for (const p of hubPaths) {
    const res = await dualOriginFetch(`${HUB_ORIGIN}${p}`);
    assert.equal(res.status, 200, `Hub ${p} should return 200`);
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
    const body = await res.json();
    assert.ok(body && typeof body === "object");
  }

  const manifest = await (await dualOriginFetch(`${HUB_ORIGIN}/agent-manifest.json`)).json();
  assert.equal(manifest.profile, "worldwide-agentic-web-mvp/0.3");
  assert.equal(manifest.networks[0].name, "openfab_hub");
  assert.equal(manifest.networks[0].front_man, "openfab_concierge");
  assert.equal(manifest.llm_router.base_url, "https://api.otari.ai/api/v1");
  assert.equal(manifest.peer_policy.mode, "closed");
  assert.deepEqual(manifest.allowed_peers, [PEER_FAB_ORIGIN]);
  assert.equal(manifest.agent_mcp.protocol, "nsdeploy-agent-mcp/v1");
  assert.equal(manifest.linking.protocol, "nsdeploy-link/v1");

  const peerPaths = [
    "/agent-manifest.json",
    "/fab_quoter.network.json",
    "/links.json",
    "/.well-known/agent-card.json",
    "/api/health"
  ];
  for (const p of peerPaths) {
    const res = await dualOriginFetch(`${PEER_FAB_ORIGIN}${p}`);
    assert.equal(res.status, 200, `Peer ${p} should return 200`);
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
  }
});

test("MVP Check 2: Strict network validator rejects malformed JSON, missing front_man, duplicates, and unknown refs", () => {
  assert.equal(validateNetwork(OPENFAB_NETWORK, { frontMan: "openfab_concierge" }).ok, true);
  assert.equal(validateNetwork("{ broken json").ok, false);
  assert.equal(validateNetwork({ tools: [{ name: "a", tools: [] }] }).ok, false);
  assert.equal(
    validateNetwork({
      tools: [
        { name: "dup", role: "front_man", tools: [] },
        { name: "dup", role: "specialist", tools: [] }
      ]
    }).ok,
    false
  );
  assert.equal(
    validateNetwork({
      tools: [{ name: "root", role: "front_man", tools: ["nonexistent_tool"] }]
    }).ok,
    false
  );
});

test("MVP Check 3: Execution bounds enforce cycle detection, max depth (3), and max invocations (8)", async () => {
  const runtime = new OpenAgenticRuntime({
    origin: HUB_ORIGIN,
    manifest: AGENT_MANIFEST,
    network: OPENFAB_NETWORK,
    links: LINKS_JSON,
    fetchImpl: dualOriginFetch
  });

  // A -> B -> A cycle
  const cycleRes = await runtime.run({
    prompt: "Audit 6-layer PCB",
    callStack: [`${HUB_ORIGIN}::openfab_hub::openfab_concierge`]
  });
  assert.equal(cycleRes.ok, false);
  assert.equal(cycleRes.code, "CYCLE_DETECTED");

  // Depth > 3
  const depthRes = await runtime.run({
    prompt: "Audit 6-layer PCB",
    depth: 4
  });
  assert.equal(depthRes.ok, false);
  assert.equal(depthRes.code, "MAX_DEPTH_EXCEEDED");

  // Budget exceeded
  const tightRuntime = new OpenAgenticRuntime({
    origin: HUB_ORIGIN,
    manifest: AGENT_MANIFEST,
    network: OPENFAB_NETWORK,
    links: LINKS_JSON,
    fetchImpl: dualOriginFetch,
    maxInvocations: 1
  });
  const budgetRes = await tightRuntime.run({
    prompt: "Run DFM and compliance audit"
  });
  assert.equal(budgetRes.ok, false);
  assert.equal(budgetRes.code, "MAX_INVOCATIONS_EXCEEDED");
});

test("MVP Check 4: Site actions validate schemas and gate write action reserve_bom_lot behind confirmation + signed receipt", async () => {
  const badArgs = await executeSiteAction("audit_bom_dfm", {
    boardName: "",
    layers: 100,
    minTraceMil: 0.5,
    qty: 0
  });
  assert.equal(badArgs.ok, false);
  assert.equal(badArgs.code, "ACTION_SCHEMA_VALIDATION_FAILED");

  // Missing confirmation callback fails closed
  const noHandler = await executeSiteAction(
    "reserve_bom_lot",
    { sku: "SKU-STM32H7-R2", qty: 500, warehouse: "HGH-02", targetUnitPriceUsd: 6.4 },
    { origin: HUB_ORIGIN }
  );
  assert.equal(noHandler.ok, false);
  assert.equal(noHandler.code, "ACTION_CONFIRMATION_REQUIRED");

  // User cancel fails closed
  const cancelled = await executeSiteAction(
    "reserve_bom_lot",
    { sku: "SKU-STM32H7-R2", qty: 500, warehouse: "HGH-02", targetUnitPriceUsd: 6.4 },
    { origin: HUB_ORIGIN, confirmAction: async () => ({ approved: false, reason: "Cancelled by judge" }) }
  );
  assert.equal(cancelled.ok, false);
  assert.equal(cancelled.code, "ACTION_CONFIRMATION_DENIED");

  // Explicit approval emits signed receipt
  const committed = await executeSiteAction(
    "reserve_bom_lot",
    { sku: "SKU-STM32H7-R2", qty: 500, warehouse: "HGH-02", targetUnitPriceUsd: 6.4 },
    { origin: HUB_ORIGIN, confirmAction: async () => ({ approved: true }) }
  );
  assert.equal(committed.ok, true);
  assert.equal(committed.receipt.status, "committed");
  assert.match(committed.receipt.receiptId, /^rcpt_/);
  assert.match(committed.receipt.signature, /^(sha256|fnv1a):/);
});

test("MVP Check 5 & 6: Cross-origin peer composition, closed policy enforcement, sly_data default-deny & BYOK isolation", async () => {
  // Policy check directly
  assert.equal(evaluatePeerPolicy(UNTRUSTED_PEER_ORIGIN, AGENT_MANIFEST).allowed, false);
  assert.equal(evaluatePeerPolicy("https://random-unlisted.example", AGENT_MANIFEST).allowed, false);
  assert.equal(evaluatePeerPolicy(PEER_FAB_ORIGIN, AGENT_MANIFEST).allowed, true);

  // sly_data default-deny unit test
  const filtered = filterSlyData(
    {
      byok_api_key: "sk-secret-1234",
      internal_margin_secret: "MARGIN_40",
      target_region: "EU",
      unlisted_field: "drop_me"
    },
    ["target_region"],
    ["target_region", "byok_api_key", "unlisted_field"]
  );
  assert.deepEqual(filtered.forwarded, { target_region: "EU" });
  assert.equal(filtered.blocked.length, 3);

  // Full end-to-end cross-origin runtime test against oaw-peer-fab worker
  const canaryByok = "sk-live-canary-do-not-leak-8842";
  const canaryMargin = "CONFIDENTIAL_MARGIN_41PCT";
  const outboundPeerLogs = [];

  const spyFetch = async (url, init = {}) => {
    const str = String(url);
    if (str.startsWith(PEER_FAB_ORIGIN)) {
      outboundPeerLogs.push({ url: str, headers: init.headers || {}, body: init.body || "" });
    }
    return dualOriginFetch(url, init);
  };

  const runtime = new OpenAgenticRuntime({
    origin: HUB_ORIGIN,
    manifest: AGENT_MANIFEST,
    network: OPENFAB_NETWORK,
    links: LINKS_JSON,
    fetchImpl: spyFetch,
    router: { mode: "deterministic-local", apiKey: canaryByok }
  });

  const result = await runtime.run({
    prompt: "Get a cross-origin SMT lead-time and volume quote for 500x 6-layer ENIG boards",
    slyData: {
      byok_api_key: canaryByok,
      internal_margin_secret: canaryMargin,
      target_region: "EU"
    },
    requestOriginConsent: async (req) => {
      assert.equal(req.targetOrigin, PEER_FAB_ORIGIN);
      assert.ok(req.hardBlockedKeys.includes("byok_api_key"));
      assert.ok(req.hardBlockedKeys.includes("internal_margin_secret"));
      assert.deepEqual(req.eligibleKeys, ["target_region"]);
      return { approved: true, approvedSlyDataKeys: ["target_region"] };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.evidence.peerQuote.provider, PEER_FAB_ORIGIN);
  assert.deepEqual(result.evidence.peerQuote.executedAgents, ["fab_quote_lead", "smt_leadtime_estimator"]);
  assert.deepEqual(result.evidence.peerQuote.receivedSlyDataKeys, ["target_region"]);
  assert.equal(result.evidence.peerQuote.targetRegionUsed, "EU");
  assert.ok(outboundPeerLogs.length >= 2, "Expected live fetch of peer manifest and network");
  assert.equal(containsSecretLeak(outboundPeerLogs, [canaryByok, canaryMargin]), false);
  assert.equal(containsSecretLeak(result.trace, [canaryByok, canaryMargin]), false);
});

test("MVP Check 7: Public /mcp JSON-RPC 2.0 endpoint handles initialize, tools/list, tools/call & blocks unconfirmed write", async () => {
  const preflight = await dualOriginFetch(`${HUB_ORIGIN}/mcp`, { method: "OPTIONS" });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "*");

  const rpc = async (id, method, params = {}) => {
    const res = await dualOriginFetch(`${HUB_ORIGIN}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params })
    });
    return { status: res.status, cors: res.headers.get("Access-Control-Allow-Origin"), json: await res.json() };
  };

  const init = await rpc(1, "initialize");
  assert.equal(init.status, 200);
  assert.equal(init.cors, "*");
  assert.equal(init.json.result.agentMcpProtocol, "nsdeploy-agent-mcp/v1");

  const list = await rpc(2, "tools/list");
  assert.deepEqual(
    list.json.result.tools.map((t) => t.name),
    ["audit_bom_dfm", "check_compliance_policy"]
  );

  const dfm = await rpc(3, "tools/call", {
    name: "audit_bom_dfm",
    arguments: { boardName: "Edge Node v3", layers: 6, minTraceMil: 3.5, bgaPitchMm: 0.5, qty: 500 }
  });
  assert.equal(dfm.status, 200);
  assert.equal(dfm.json.result.isError, false);
  assert.ok(dfm.json.result.structuredContent.dfmScore >= 60);

  const comp = await rpc(4, "tools/call", {
    name: "check_compliance_policy",
    arguments: { region: "EU", standards: ["RoHS-3"], hasLeadSolder: true }
  });
  assert.equal(comp.status, 200);
  assert.equal(comp.json.result.structuredContent.overallStatus, "NON_COMPLIANT");

  // Write action must be blocked from unconfirmed remote /mcp invocation
  const blockedWrite = await rpc(5, "tools/call", {
    name: "reserve_bom_lot",
    arguments: { sku: "SKU-STM32H7-R2", qty: 100, warehouse: "HGH-02", targetUnitPriceUsd: 5.5 }
  });
  assert.equal(blockedWrite.status, 403);
  assert.ok(blockedWrite.json.error);
});

test("Full 7/7 MVP Interoperability Suite passes 7/7 against live dual-origin workers", async () => {
  const report = await runInteroperabilitySuite({
    origin: HUB_ORIGIN,
    peerOrigin: PEER_FAB_ORIGIN,
    fetchImpl: dualOriginFetch
  });

  for (const check of report.checks) {
    assert.equal(check.passed, true, `Check failed: ${check.title} -> ${JSON.stringify(check.details)}`);
  }
  assert.equal(report.allPassed, true);
  assert.equal(report.passedCount, 7);
  assert.equal(report.totalCount, 7);
});
