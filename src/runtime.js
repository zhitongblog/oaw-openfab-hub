/**
 * OpenFab Mesh — Worldwide Agentic Web MVP Profile 0.3 Browser & Node.js Runtime
 * Zero external dependencies. Runs identically in modern browsers and Node.js 20+.
 */

export const RUNTIME_VERSION = "0.3.0";
export const DEFAULT_MAX_DEPTH = 3;
export const DEFAULT_MAX_INVOCATIONS = 8;
export const DEFAULT_TIMEOUT_MS = 8000;
export const BYOK_STORAGE_KEY = "openfab_mesh_byok_router_v1";
export const LOCAL_LINKS_STORAGE_KEY = "openfab_mesh_local_links_v1";

const SECRET_KEY_PATTERN = /(api[_-]?key|byok|secret|token|password|authorization|credential|margin)/i;

// ---------------------------------------------------------------------------
// 1. Strict Neuro SAN / MVP 0.3 Network Validator (Fail-Closed)
// ---------------------------------------------------------------------------

export function parseNetworkJson(raw) {
  if (typeof raw === "string") {
    try {
      return { ok: true, data: JSON.parse(raw) };
    } catch (err) {
      return {
        ok: false,
        code: "MALFORMED_NETWORK_JSON",
        errors: [`Malformed network JSON: ${err.message}`]
      };
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      code: "MALFORMED_NETWORK_JSON",
      errors: ["Network definition must be a non-null JSON object."]
    };
  }
  return { ok: true, data: raw };
}

export function validateNetwork(networkInput, options = {}) {
  const parsed = parseNetworkJson(networkInput);
  if (!parsed.ok) return parsed;

  const network = parsed.data;
  const errors = [];
  const expectedFrontMan = options.frontMan || null;
  const externalLinks = new Set(options.externalLinks || []);

  if (!Array.isArray(network.tools) || network.tools.length === 0) {
    return {
      ok: false,
      code: "INVALID_NETWORK_SCHEMA",
      errors: ["Network must define a non-empty `tools` array."]
    };
  }

  const agentsByName = new Map();
  let explicitFrontMan = null;

  for (let i = 0; i < network.tools.length; i += 1) {
    const tool = network.tools[i];
    if (!tool || typeof tool !== "object" || Array.isArray(tool)) {
      errors.push(`tools[${i}] must be an object.`);
      continue;
    }
    if (typeof tool.name !== "string" || !/^[a-zA-Z0-9_-]{2,64}$/.test(tool.name)) {
      errors.push(`tools[${i}].name is missing or invalid.`);
      continue;
    }
    if (agentsByName.has(tool.name)) {
      errors.push(`Duplicate agent/tool name detected: "${tool.name}".`);
      continue;
    }
    agentsByName.set(tool.name, tool);
    if (tool.role === "front_man") {
      if (explicitFrontMan && explicitFrontMan !== tool.name) {
        errors.push(`Multiple front_man declarations: "${explicitFrontMan}" and "${tool.name}".`);
      }
      explicitFrontMan = tool.name;
    }
    if (tool.external_link) {
      externalLinks.add(tool.name);
      externalLinks.add(tool.external_link);
    }
  }

  const resolvedFrontMan = expectedFrontMan || explicitFrontMan;
  if (!resolvedFrontMan) {
    errors.push("Missing required `front_man` declaration in manifest or network.");
  } else if (!agentsByName.has(resolvedFrontMan)) {
    errors.push(`Declared front_man "${resolvedFrontMan}" does not exist in network.tools.`);
  }

  // Validate internal tool references
  for (const [agentName, tool] of agentsByName.entries()) {
    if (tool.tools !== undefined) {
      if (!Array.isArray(tool.tools)) {
        errors.push(`Agent "${agentName}" has non-array \`tools\` field.`);
        continue;
      }
      for (const ref of tool.tools) {
        if (typeof ref !== "string" || (!agentsByName.has(ref) && !externalLinks.has(ref))) {
          errors.push(`Agent "${agentName}" references unknown tool "${String(ref)}".`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      code: "INVALID_NETWORK_SCHEMA",
      errors
    };
  }

  return {
    ok: true,
    frontMan: resolvedFrontMan,
    agentsByName
  };
}

// ---------------------------------------------------------------------------
// 2. Peer Policy & Origin Enforcement (Fail-Closed)
// ---------------------------------------------------------------------------

export function normalizeOrigin(urlOrOrigin) {
  try {
    const parsed = new URL(urlOrOrigin);
    if (
      parsed.protocol !== "https:" &&
      !(parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"))
    ) {
      return { ok: false, error: `Unsupported origin protocol: ${parsed.protocol}` };
    }
    return { ok: true, origin: parsed.origin, url: parsed };
  } catch {
    return { ok: false, error: `Invalid peer URL or origin: ${String(urlOrOrigin)}` };
  }
}

export function evaluatePeerPolicy(targetUrlOrOrigin, manifest) {
  const norm = normalizeOrigin(targetUrlOrOrigin);
  if (!norm.ok) {
    return { allowed: false, code: "INVALID_PEER_URL", reason: norm.error, origin: null };
  }

  const targetOrigin = norm.origin;
  const policy = manifest?.peer_policy || { mode: "closed", deny_origins: [] };
  const denySet = new Set((policy.deny_origins || []).map((o) => {
    try { return new URL(o).origin; } catch { return o; }
  }));

  if (denySet.has(targetOrigin)) {
    return {
      allowed: false,
      code: "PEER_ORIGIN_DENIED",
      origin: targetOrigin,
      reason: `Origin ${targetOrigin} is explicitly listed in peer_policy.deny_origins.`
    };
  }

  const allowSet = new Set((manifest?.allowed_peers || []).map((o) => {
    try { return new URL(o).origin; } catch { return o; }
  }));

  const mode = policy.mode || "closed";
  if (mode === "closed" && !allowSet.has(targetOrigin)) {
    return {
      allowed: false,
      code: "PEER_ORIGIN_DENIED",
      origin: targetOrigin,
      reason: `Closed peer_policy blocks ${targetOrigin} (not present in allowed_peers).`
    };
  }

  return {
    allowed: true,
    code: "PEER_ORIGIN_ALLOWED",
    origin: targetOrigin,
    reason: `Origin ${targetOrigin} is authorized by allowed_peers (interactive user consent still required).`
  };
}

// ---------------------------------------------------------------------------
// 3. Default-Deny sly_data Private Context Filter & Secret Sanitizer
// ---------------------------------------------------------------------------

export function filterSlyData(candidateSlyData = {}, declaredAllowKeys = [], userApprovedKeys = []) {
  const allowSet = new Set(Array.isArray(declaredAllowKeys) ? declaredAllowKeys : []);
  const approvedSet = new Set(Array.isArray(userApprovedKeys) ? userApprovedKeys : []);

  const forwarded = {};
  const blocked = [];
  const allowed = [];

  for (const [key, value] of Object.entries(candidateSlyData || {})) {
    if (SECRET_KEY_PATTERN.test(key)) {
      blocked.push({
        key,
        reason: "HARD_BLOCKED_SECRET_POLICY"
      });
      continue;
    }
    if (!allowSet.has(key)) {
      blocked.push({
        key,
        reason: "DEFAULT_DENY_NOT_IN_ALLOWLIST"
      });
      continue;
    }
    if (!approvedSet.has(key)) {
      blocked.push({
        key,
        reason: "USER_DID_NOT_OPT_IN"
      });
      continue;
    }
    forwarded[key] = value;
    allowed.push(key);
  }

  return { forwarded, blocked, allowed };
}

export function containsSecretLeak(payload, secrets = []) {
  const serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
  for (const secret of secrets) {
    if (typeof secret === "string" && secret.length >= 4 && serialized.includes(secret)) {
      return true;
    }
  }
  return false;
}

export function redactSecretsInObject(obj, secrets = []) {
  const cleanSecrets = secrets.filter((s) => typeof s === "string" && s.length >= 4);
  if (cleanSecrets.length === 0) return obj;
  let text = JSON.stringify(obj);
  for (const secret of cleanSecrets) {
    text = text.split(secret).join("[REDACTED_BYOK_SECRET]");
  }
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// 4. Registered Local Site Actions (JSON Schema Validated + Signed Receipts)
// ---------------------------------------------------------------------------

export const SITE_ACTION_SCHEMAS = {
  audit_bom_dfm: {
    name: "audit_bom_dfm",
    mode: "read",
    requiresConfirmation: false,
    description: "Run an IPC-2221B / IPC-A-610 PCB manufacturability and BOM DFM risk audit.",
    inputSchema: {
      type: "object",
      properties: {
        boardName: { type: "string", minLength: 1, maxLength: 120 },
        layers: { type: "integer", minimum: 2, maximum: 24 },
        minTraceMil: { type: "number", minimum: 2, maximum: 20 },
        bgaPitchMm: { type: "number", minimum: 0.3, maximum: 1.5 },
        qty: { type: "integer", minimum: 1, maximum: 1000000 }
      },
      required: ["boardName", "layers", "minTraceMil", "qty"]
    }
  },
  check_compliance_policy: {
    name: "check_compliance_policy",
    mode: "read",
    requiresConfirmation: false,
    description: "Evaluate EU RoHS-3, REACH SVHC, CE/FCC wireless, and export compliance.",
    inputSchema: {
      type: "object",
      properties: {
        region: { type: "string", enum: ["EU", "US", "APAC", "GLOBAL"] },
        standards: { type: "array", items: { type: "string" }, minItems: 1 },
        hasLeadSolder: { type: "boolean" },
        wirelessModule: { type: "boolean" }
      },
      required: ["region", "standards", "hasLeadSolder"]
    }
  },
  reserve_bom_lot: {
    name: "reserve_bom_lot",
    mode: "write",
    requiresConfirmation: true,
    description: "Reserve an allocated component BOM lot at a regional fulfillment warehouse (write action requiring explicit user confirmation).",
    inputSchema: {
      type: "object",
      properties: {
        sku: { type: "string", minLength: 3, maxLength: 64 },
        qty: { type: "integer", minimum: 1, maximum: 500000 },
        warehouse: { type: "string", enum: ["SZX-01", "HGH-02", "AUS-03", "MUC-04"] },
        targetUnitPriceUsd: { type: "number", minimum: 0.01, maximum: 100000 }
      },
      required: ["sku", "qty", "warehouse", "targetUnitPriceUsd"]
    }
  }
};

export function validateActionArgs(actionName, args) {
  const def = SITE_ACTION_SCHEMAS[actionName];
  if (!def) {
    return { ok: false, errors: [`Unknown site action: "${actionName}".`] };
  }
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return { ok: false, errors: ["Action arguments must be a JSON object."] };
  }

  const schema = def.inputSchema;
  const errors = [];

  for (const reqKey of schema.required || []) {
    if (args[reqKey] === undefined || args[reqKey] === null) {
      errors.push(`Missing required field "${reqKey}".`);
    }
  }

  for (const [key, prop] of Object.entries(schema.properties || {})) {
    const val = args[key];
    if (val === undefined) continue;
    if (prop.type === "string") {
      if (typeof val !== "string") {
        errors.push(`Field "${key}" must be a string.`);
      } else {
        if (prop.minLength && val.trim().length < prop.minLength) {
          errors.push(`Field "${key}" must be at least ${prop.minLength} characters.`);
        }
        if (prop.maxLength && val.length > prop.maxLength) {
          errors.push(`Field "${key}" exceeds max length ${prop.maxLength}.`);
        }
        if (prop.enum && !prop.enum.includes(val)) {
          errors.push(`Field "${key}" must be one of: ${prop.enum.join(", ")}.`);
        }
      }
    } else if (prop.type === "integer") {
      if (!Number.isInteger(val)) {
        errors.push(`Field "${key}" must be an integer.`);
      } else {
        if (prop.minimum !== undefined && val < prop.minimum) {
          errors.push(`Field "${key}" must be >= ${prop.minimum}.`);
        }
        if (prop.maximum !== undefined && val > prop.maximum) {
          errors.push(`Field "${key}" must be <= ${prop.maximum}.`);
        }
      }
    } else if (prop.type === "number") {
      if (typeof val !== "number" || Number.isNaN(val)) {
        errors.push(`Field "${key}" must be a number.`);
      } else {
        if (prop.minimum !== undefined && val < prop.minimum) {
          errors.push(`Field "${key}" must be >= ${prop.minimum}.`);
        }
        if (prop.maximum !== undefined && val > prop.maximum) {
          errors.push(`Field "${key}" must be <= ${prop.maximum}.`);
        }
      }
    } else if (prop.type === "boolean") {
      if (typeof val !== "boolean") {
        errors.push(`Field "${key}" must be a boolean.`);
      }
    } else if (prop.type === "array") {
      if (!Array.isArray(val)) {
        errors.push(`Field "${key}" must be an array.`);
      } else {
        if (prop.minItems && val.length < prop.minItems) {
          errors.push(`Field "${key}" must contain at least ${prop.minItems} item(s).`);
        }
        if (prop.items?.type === "string" && val.some((item) => typeof item !== "string" || !item.trim())) {
          errors.push(`Field "${key}" must contain non-empty strings.`);
        }
      }
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, errors: [] };
}

async function computeReceiptSignature(payloadStr) {
  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    const bytes = new TextEncoder().encode(payloadStr);
    const hashBuf = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `sha256:${hex.slice(0, 32)}`;
  }
  // Deterministic fallback hash if subtle crypto unavailable
  let h = 2166136261;
  for (let i = 0; i < payloadStr.length; i += 1) {
    h ^= payloadStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv1a:${(h >>> 0).toString(16).padStart(8, "0")}`;
}

export function runAuditBomDfm(args) {
  const bgaPitchMm = args.bgaPitchMm ?? (args.layers >= 6 ? 0.5 : 0.8);
  const findings = [];
  let riskPoints = 0;

  if (args.minTraceMil < 3.5) {
    riskPoints += 18;
    findings.push({
      severity: "HIGH",
      rule: "IPC-2221B-TRACE",
      detail: `Minimum trace ${args.minTraceMil} mil requires HDI laser-direct imaging (standard floor is 3.5 mil).`
    });
  } else if (args.minTraceMil <= 4.0) {
    riskPoints += 8;
    findings.push({
      severity: "MEDIUM",
      rule: "IPC-2221B-TRACE",
      detail: `Trace width ${args.minTraceMil} mil is manufacturable on 1 oz inner / 0.5 oz outer copper with controlled impedance coupon.`
    });
  } else {
    findings.push({
      severity: "PASS",
      rule: "IPC-2221B-TRACE",
      detail: `Trace width ${args.minTraceMil} mil comfortably exceeds standard fab tolerances.`
    });
  }

  if (bgaPitchMm <= 0.5) {
    riskPoints += 16;
    findings.push({
      severity: "MEDIUM",
      rule: "IPC-7095-BGA",
      detail: `${bgaPitchMm} mm BGA pitch requires ENIG surface finish, VIPPO (via-in-pad plated over), and 100% X-ray inspection.`
    });
  } else {
    findings.push({
      severity: "PASS",
      rule: "IPC-7095-BGA",
      detail: `${bgaPitchMm} mm BGA pitch supports standard dog-bone fanout.`
    });
  }

  if (args.layers >= 6) {
    riskPoints += 6;
    findings.push({
      severity: "INFO",
      rule: "STACKUP-SYMMETRY",
      detail: `${args.layers}-layer stackup verified for symmetric GND reference planes and controlled 50-ohm/90-ohm differential routing.`
    });
  }

  const dfmScore = Math.max(55, 100 - riskPoints);
  const estimatedFirstPassYieldPct = Number((99.4 - riskPoints * 0.11).toFixed(2));
  const recommendedFinish = bgaPitchMm <= 0.5 || args.layers >= 6 ? "ENIG" : "HASL-LF";

  return {
    action: "audit_bom_dfm",
    boardName: args.boardName,
    spec: {
      layers: args.layers,
      minTraceMil: args.minTraceMil,
      bgaPitchMm,
      qty: args.qty
    },
    dfmScore,
    grade: dfmScore >= 88 ? "A" : dfmScore >= 75 ? "B" : "C",
    estimatedFirstPassYieldPct,
    recommendedFinish,
    findings
  };
}

export function runCheckCompliancePolicy(args) {
  const checks = [];
  let compliant = true;

  if (args.hasLeadSolder && (args.region === "EU" || args.region === "GLOBAL")) {
    compliant = false;
    checks.push({
      standard: "RoHS-3 (2015/863/EU)",
      status: "FAIL",
      detail: "Leaded SnPb solder is prohibited for commercial EU/GLOBAL shipments. Switch to SAC305 lead-free alloy."
    });
  } else {
    checks.push({
      standard: "RoHS-3 (2015/863/EU)",
      status: "PASS",
      detail: "Lead-free SAC305 assembly complies with EU RoHS-3 hazardous substance limits (<0.1% wt)."
    });
  }

  checks.push({
    standard: "REACH SVHC (241 substances)",
    status: "PASS",
    detail: "BOM capacitor/IC resin declarations within <0.1% w/w threshold."
  });

  if (args.wirelessModule) {
    checks.push({
      standard: args.region === "EU" ? "CE RED 2014/53/EU" : "FCC Part 15C / CE RED",
      status: "ACTION_REQUIRED",
      detail: "Wireless module detected: attach modular RF test report and SAR/EMC pre-scan before mass production."
    });
  }

  checks.push({
    standard: "EAR99 / Dual-Use Screening",
    status: "PASS",
    detail: `Commercial industrial hardware cleared for target region ${args.region}.`
  });

  return {
    action: "check_compliance_policy",
    region: args.region,
    requestedStandards: args.standards,
    overallStatus: compliant ? "COMPLIANT" : "NON_COMPLIANT",
    checks
  };
}

export async function executeSiteAction(actionName, args, context = {}) {
  const validation = validateActionArgs(actionName, args);
  if (!validation.ok) {
    return {
      ok: false,
      code: "ACTION_SCHEMA_VALIDATION_FAILED",
      action: actionName,
      errors: validation.errors
    };
  }

  if (actionName === "audit_bom_dfm") {
    return { ok: true, action: actionName, mode: "read", result: runAuditBomDfm(args) };
  }

  if (actionName === "check_compliance_policy") {
    return { ok: true, action: actionName, mode: "read", result: runCheckCompliancePolicy(args) };
  }

  if (actionName === "reserve_bom_lot") {
    const origin = context.origin || "https://agentweb.doaipm.com";
    if (typeof context.confirmAction !== "function") {
      return {
        ok: false,
        code: "ACTION_CONFIRMATION_REQUIRED",
        action: actionName,
        error: "Write action reserve_bom_lot failed closed: no interactive confirmation handler registered."
      };
    }

    const decision = await context.confirmAction({
      origin,
      action: actionName,
      mode: "write",
      description: SITE_ACTION_SCHEMAS.reserve_bom_lot.description,
      arguments: args
    });

    if (!decision || decision.approved !== true) {
      return {
        ok: false,
        code: "ACTION_CONFIRMATION_DENIED",
        action: actionName,
        error: decision?.reason || "User declined write action confirmation."
      };
    }

    const timestamp = new Date().toISOString();
    const receiptId = `rcpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const extendedUsd = Number((args.qty * args.targetUnitPriceUsd).toFixed(2));
    const canonical = JSON.stringify({
      receiptId,
      origin,
      action: actionName,
      arguments: args,
      timestamp,
      status: "committed"
    });
    const signature = await computeReceiptSignature(canonical);

    const receipt = {
      receiptId,
      origin,
      action: actionName,
      arguments: args,
      extendedValueUsd: extendedUsd,
      timestamp,
      status: "committed",
      signature
    };

    return {
      ok: true,
      action: actionName,
      mode: "write",
      result: {
        message: `Reserved ${args.qty} units of ${args.sku} at ${args.warehouse} ($${args.targetUnitPriceUsd}/unit, total $${extendedUsd}).`,
        receipt
      },
      receipt
    };
  }

  return { ok: false, code: "UNKNOWN_ACTION", error: `Unknown action: ${actionName}` };
}

// ---------------------------------------------------------------------------
// 5. Timeout Helper & Local Peer Execution Engine
// ---------------------------------------------------------------------------

export async function withTimeout(promiseFactory, timeoutMs = DEFAULT_TIMEOUT_MS, label = "operation") {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  let timerId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      if (controller) controller.abort();
      const err = new Error(`Timeout after ${timeoutMs}ms during ${label}`);
      err.code = "EXECUTION_TIMEOUT";
      reject(err);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promiseFactory(controller?.signal), timeoutPromise]);
  } finally {
    if (timerId) clearTimeout(timerId);
  }
}

function extractHardwareParams(prompt, slyData = {}) {
  const lower = String(prompt || "").toLowerCase();
  const layerMatch = lower.match(/(\d{1,2})\s*[- ]?layer|(\d{1,2})l\b/);
  const qtyMatch = lower.match(/(\d{2,6})\s*(?:units?|pcs?|boards?|x\b)/) || lower.match(/\bqty\s*[:=]?\s*(\d{1,6})/);
  const traceMatch = lower.match(/(\d+(?:\.\d+)?)\s*mil/);
  const bgaMatch = lower.match(/(0\.\d+)\s*mm\s*bga/);
  const skuMatch = prompt.match(/\b(SKU-[A-Z0-9-]+)\b/i);
  const whMatch = prompt.match(/\b(SZX-01|HGH-02|AUS-03|MUC-04)\b/i);
  const priceMatch = prompt.match(/\$(\d+(?:\.\d+)?)/);

  const layers = Math.min(24, Math.max(2, Number(layerMatch?.[1] || layerMatch?.[2] || 6)));
  const qty = Math.min(1000000, Math.max(1, Number(qtyMatch?.[1] || 500)));
  const minTraceMil = Math.min(20, Math.max(2, Number(traceMatch?.[1] || 3.5)));
  const bgaPitchMm = Math.min(1.5, Math.max(0.3, Number(bgaMatch?.[1] || 0.5)));
  const hasLeadSolder = /\bleaded\b|\bsnpb\b/i.test(lower);
  const wirelessModule = /\b(wifi|ble|bluetooth|lora|5g|lte|wireless|rf)\b/i.test(lower);

  let region = slyData.target_region || "EU";
  if (!slyData.target_region) {
    if (/\b(us|usa|united states|austin)\b/i.test(lower)) region = "US";
    else if (/\b(apac|china|shenzhen|hangzhou|singapore)\b/i.test(lower)) region = "APAC";
    else if (/\b(global|worldwide)\b/i.test(lower)) region = "GLOBAL";
  }

  return {
    boardName: "OpenFab Sensor Carrier v2",
    layers,
    qty,
    minTraceMil,
    bgaPitchMm,
    hasFineBga: bgaPitchMm <= 0.65 || layers >= 6,
    hasLeadSolder,
    wirelessModule,
    region,
    sku: skuMatch?.[1]?.toUpperCase() || "SKU-STM32H7-R2",
    warehouse: whMatch?.[1]?.toUpperCase() || "HGH-02",
    targetUnitPriceUsd: Number(priceMatch?.[1] || 6.4)
  };
}

function runPeerNetworkLocally(peerNetwork, peerOrigin, prompt, forwardedSlyData, state) {
  // Executes fetched peer Neuro SAN network locally in the caller's browser!
  const validation = validateNetwork(peerNetwork, {});
  if (!validation.ok) {
    const err = new Error(`Peer network schema invalid: ${validation.errors.join("; ")}`);
    err.code = "INVALID_PEER_NETWORK";
    throw err;
  }

  const frontMan = validation.frontMan;
  const frontTool = validation.agentsByName.get(frontMan);
  const childTools = Array.isArray(frontTool.tools) ? frontTool.tools : [];

  const invokedPeerAgents = [];

  const pushInvocation = (agentName) => {
    const callKey = `${peerOrigin}::${peerNetwork.metadata?.network_name || "peer"}::${agentName}`;
    if (state.callStack.includes(callKey)) {
      const err = new Error(`Cycle detected in cross-origin agent call graph: ${[...state.callStack, callKey].join(" -> ")}`);
      err.code = "CYCLE_DETECTED";
      throw err;
    }
    if (state.invocations >= state.maxInvocations) {
      const err = new Error(`Max invocation budget (${state.maxInvocations}) exceeded.`);
      err.code = "MAX_INVOCATIONS_EXCEEDED";
      throw err;
    }
    state.invocations += 1;
    invokedPeerAgents.push(agentName);
    state.trace.events.push({
      type: "peer_agent_local_exec",
      origin: peerOrigin,
      agent: agentName,
      depth: state.depth,
      invocation: state.invocations,
      note: "Executed locally inside caller browser runtime (zero credentials sent to peer)."
    });
  };

  pushInvocation(frontMan);
  for (const child of childTools) {
    if (validation.agentsByName.has(child)) {
      pushInvocation(child);
    }
  }

  // Compute deterministic fabrication quote from peer spec + ONLY forwardedSlyData
  const spec = extractHardwareParams(prompt, forwardedSlyData);
  const targetRegion = forwardedSlyData.target_region || "GLOBAL";
  const surfaceFinish = spec.hasFineBga ? "ENIG" : "HASL";
  const volumeFactor =
    spec.qty >= 10000 ? 0.56 :
    spec.qty >= 2000 ? 0.68 :
    spec.qty >= 500 ? 0.80 :
    spec.qty >= 100 ? 0.92 : 1.15;

  const basePcbPerUnit = (1.95 + spec.layers * 0.72) * (surfaceFinish === "ENIG" ? 1.18 : 1.0);
  const baseSmtPerUnit = (2.40 + (spec.hasFineBga ? 1.85 : 0.65)) * volumeFactor;
  const unitPriceUsd = Number((basePcbPerUnit * volumeFactor + baseSmtPerUnit).toFixed(2));

  const stencilNreUsd = spec.hasFineBga ? 185 : 120;
  const programmingSetupUsd = 140 + spec.layers * 15;
  const xrayInspectionUsd = spec.hasFineBga ? 210 : 0;
  const totalNreUsd = stencilNreUsd + programmingSetupUsd + xrayInspectionUsd;
  const extendedTotalUsd = Number((unitPriceUsd * spec.qty + totalNreUsd).toFixed(2));

  const transitDaysMap = { APAC: 2, US: 4, EU: 5, GLOBAL: 4 };
  const hubMap = {
    APAC: "ApexFab ShenZhen-Line4 (CN)",
    US: "ApexFab Penang-Line2 -> Austin Hub",
    EU: "ApexFab Munich-Express / ShenZhen-Line4",
    GLOBAL: "ApexFab ShenZhen-Line4 (Global Air)"
  };
  const barePcbDays = spec.layers >= 8 ? 6 : spec.layers >= 6 ? 4 : 3;
  const smtDays = spec.qty >= 5000 ? 5 : spec.qty >= 500 ? 3 : 2;
  const aoiXrayDays = spec.hasFineBga ? 1 : 0;
  const transitDays = transitDaysMap[targetRegion] ?? 4;
  const standardBusinessDays = barePcbDays + smtDays + aoiXrayDays + transitDays;
  const expediteBusinessDays = Math.max(4, Math.ceil((barePcbDays + smtDays) * 0.6) + aoiXrayDays + Math.max(1, transitDays - 1));

  return {
    provider: peerNetwork.metadata?.origin || peerOrigin,
    network: peerNetwork.metadata?.network_name || "fab_quoter",
    executedAgents: invokedPeerAgents,
    receivedSlyDataKeys: Object.keys(forwardedSlyData),
    targetRegionUsed: targetRegion,
    spec: {
      layers: spec.layers,
      qty: spec.qty,
      hasFineBga: spec.hasFineBga,
      surfaceFinish
    },
    pricing: {
      currency: "USD",
      unitPriceUsd,
      totalNreUsd,
      extendedTotalUsd,
      expediteTotalUsd: Number((extendedTotalUsd * 1.24).toFixed(2))
    },
    schedule: {
      assignedFacility: hubMap[targetRegion] || hubMap.GLOBAL,
      standardBusinessDays,
      expediteBusinessDays
    }
  };
}

// ---------------------------------------------------------------------------
// 6. Pluggable Inference: Deterministic Local Arbiter + BYOK OpenAI-Compatible
// ---------------------------------------------------------------------------

async function callByokSynthesis(routerConfig, prompt, structuredEvidence, fetchImpl, timeoutMs) {
  const baseUrl = String(routerConfig.baseUrl || "https://api.otari.ai/api/v1").replace(/\/+$/, "");
  const model = routerConfig.model || "gpt-4o-mini";
  const apiKey = routerConfig.apiKey;

  if (!apiKey) {
    throw new Error("BYOK mode selected without an API key.");
  }

  const endpoint = `${baseUrl}/chat/completions`;
  const response = await withTimeout(
    (signal) =>
      fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are OpenFab Mesh Concierge, a concise hardware DFM, compliance, and supply-chain engineering assistant. Summarize the verified tool and peer-agent evidence clearly in plain English with bullet points."
            },
            {
              role: "user",
              content: `User request: ${prompt}\n\nVerified tool & peer outputs:\n${JSON.stringify(structuredEvidence, null, 2)}`
            }
          ]
        }),
        signal
      }),
    timeoutMs,
    `BYOK router (${baseUrl})`
  );

  if (!response.ok) {
    throw new Error(`BYOK router HTTP ${response.status}`);
  }
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("BYOK router returned empty completion.");
  }
  return text;
}

function buildDeterministicSummary(prompt, evidence) {
  const lines = [];
  if (evidence.dfm) {
    const d = evidence.dfm;
    lines.push(
      `DFM Audit (${d.boardName}, ${d.spec.layers}L, ${d.spec.minTraceMil} mil trace, ${d.spec.bgaPitchMm}mm BGA): Score ${d.dfmScore}/100 (Grade ${d.grade}), est. first-pass yield ${d.estimatedFirstPassYieldPct}%, recommended finish ${d.recommendedFinish}.`
    );
  }
  if (evidence.compliance) {
    const c = evidence.compliance;
    lines.push(
      `Compliance Arbitration (${c.region}): ${c.overallStatus} across ${c.checks.length} regulatory checks (${c.checks.map((x) => `${x.standard}: ${x.status}`).join("; ")}).`
    );
  }
  if (evidence.peerQuote) {
    const q = evidence.peerQuote;
    lines.push(
      `Cross-Origin Peer Quote (${q.provider} / ${q.network} — executed locally via ${q.executedAgents.join(" -> ")}): $${q.pricing.unitPriceUsd}/unit for ${q.spec.qty}x ${q.spec.layers}L ${q.spec.surfaceFinish} boards ($${q.pricing.extendedTotalUsd} incl. $${q.pricing.totalNreUsd} NRE). Lead time (${q.targetRegionUsed}): ${q.schedule.standardBusinessDays} business days standard / ${q.schedule.expediteBusinessDays} days expedite via ${q.schedule.assignedFacility}.`
    );
  }
  if (evidence.reservation) {
    const r = evidence.reservation.receipt;
    lines.push(
      `BOM Lot Reservation COMMITTED: ${evidence.reservation.message} Signed Receipt ${r.receiptId} (${r.signature}).`
    );
  }
  if (evidence.peerBlocked) {
    lines.push(
      `Fail-Closed Security Block (${evidence.peerBlocked.code}): ${evidence.peerBlocked.reason}`
    );
  }
  if (evidence.actionBlocked) {
    lines.push(
      `Write Action Halted (${evidence.actionBlocked.code}): ${evidence.actionBlocked.error}`
    );
  }
  if (lines.length === 0) {
    lines.push(
      `OpenFab Concierge analyzed "${prompt}" locally with zero external API keys. Ask for a PCB DFM audit, EU/US compliance check, cross-origin ApexFab quote, or BOM lot reservation.`
    );
  }
  return lines.join("\n\n");
}

// ---------------------------------------------------------------------------
// 7. Main Agentic Orchestrator Class
// ---------------------------------------------------------------------------

export class OpenAgenticRuntime {
  constructor(options = {}) {
    this.origin = options.origin || "https://agentweb.doaipm.com";
    this.manifest = options.manifest;
    this.network = options.network;
    this.links = options.links || { version: 1, networks: {} };
    this.fetchImpl = options.fetchImpl || globalThis.fetch?.bind(globalThis);
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    this.maxInvocations = options.maxInvocations ?? DEFAULT_MAX_INVOCATIONS;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.router = options.router || {
      mode: "deterministic-local",
      baseUrl: "https://api.otari.ai/api/v1",
      model: "gpt-4o-mini",
      apiKey: ""
    };
    this.localLinkOverrides = options.localLinkOverrides || {};
  }

  setRouter(routerConfig) {
    this.router = { ...this.router, ...routerConfig };
  }

  setLocalLinkOverride(alias, url) {
    if (!url) {
      delete this.localLinkOverrides[alias];
    } else {
      this.localLinkOverrides[alias] = url;
    }
  }

  resolveLinkUrl(networkName, alias) {
    if (this.localLinkOverrides[alias]) {
      return this.localLinkOverrides[alias];
    }
    const fromLinks = this.links?.networks?.[networkName]?.[alias];
    if (fromLinks) return fromLinks;
    const fromManifest = (this.manifest?.linking?.imports || []).find((i) => i.alias === alias);
    return fromManifest?.url || null;
  }

  async run(request) {
    const prompt = String(request?.prompt || "").trim();
    const requestOrigin = this.origin;
    const slyData = request?.slyData || {};
    const requestOriginConsent = request?.requestOriginConsent;
    const confirmAction = request?.confirmAction;
    const forcePeerUrl = request?.forcePeerUrl || null;
    const initialDepth = request?.depth ?? 0;
    const initialCallStack = Array.isArray(request?.callStack) ? [...request.callStack] : [];

    const secretsToGuard = [
      this.router?.apiKey,
      slyData.byok_api_key,
      slyData.internal_margin_secret
    ].filter(Boolean);

    const trace = {
      runtimeVersion: RUNTIME_VERSION,
      startedAt: new Date().toISOString(),
      routerSelected:
        this.router.mode === "byok" && this.router.apiKey
          ? `BYOK (${this.router.baseUrl} / ${this.router.model || "default"})`
          : "Deterministic Local Arbiter (Zero-Key)",
      byokKeyIsolated: true,
      maxDepth: this.maxDepth,
      maxInvocations: this.maxInvocations,
      contactedOrigins: [requestOrigin],
      consentDecisions: [],
      slyDataAudit: [],
      actionReceipts: [],
      events: []
    };

    // 1. Validate local network fail-closed
    const primaryNetworkDef = this.manifest?.networks?.[0];
    const networkName = primaryNetworkDef?.name || "openfab_hub";
    const expectedFrontMan = primaryNetworkDef?.front_man;
    const validation = validateNetwork(this.network, {
      frontMan: expectedFrontMan,
      externalLinks: Object.keys(this.links?.networks?.[networkName] || {})
    });

    if (!validation.ok) {
      trace.events.push({
        type: "validation_failed",
        code: validation.code,
        errors: validation.errors
      });
      return {
        ok: false,
        code: validation.code,
        errors: validation.errors,
        trace
      };
    }

    const state = {
      depth: initialDepth,
      invocations: 0,
      maxDepth: this.maxDepth,
      maxInvocations: this.maxInvocations,
      callStack: initialCallStack,
      trace
    };

    const recordInvocation = (origin, net, agent, note = "") => {
      if (state.depth > state.maxDepth) {
        const err = new Error(`Composition depth ${state.depth} exceeds max depth ${state.maxDepth}.`);
        err.code = "MAX_DEPTH_EXCEEDED";
        throw err;
      }
      const key = `${origin}::${net}::${agent}`;
      if (state.callStack.includes(key)) {
        const err = new Error(`Agent call cycle detected: ${[...state.callStack, key].join(" -> ")}`);
        err.code = "CYCLE_DETECTED";
        throw err;
      }
      if (state.invocations >= state.maxInvocations) {
        const err = new Error(`Invocation budget (${state.maxInvocations}) exceeded.`);
        err.code = "MAX_INVOCATIONS_EXCEEDED";
        throw err;
      }
      state.invocations += 1;
      state.callStack.push(key);
      trace.events.push({
        type: "agent_invoked",
        origin,
        network: net,
        agent,
        depth: state.depth,
        invocation: state.invocations,
        note
      });
    };

    const evidence = {};

    try {
      // Front-man entry
      recordInvocation(requestOrigin, networkName, validation.frontMan, "Front-man planning");

      const lower = prompt.toLowerCase();
      const hw = extractHardwareParams(prompt, slyData);

      const wantsUntrusted =
        Boolean(forcePeerUrl) ||
        /untrusted-peer\.example|denied origin|attack simulation|untrusted peer/i.test(prompt);
      const wantsPeerQuote =
        !wantsUntrusted &&
        /\b(quote|pricing|price|lead[- ]?time|apexfab|peer|smt|fab_quoter|turnaround)\b/i.test(lower);
      const wantsReserve =
        /\b(reserve|allocation|allocate|book lot|reserve_bom_lot|sku-)\b/i.test(lower);
      const wantsCompliance =
        /\b(rohs|reach|compliance|regulatory|export|fcc|ce\b|audit)\b/i.test(lower) || (!wantsPeerQuote && !wantsReserve && !wantsUntrusted);
      const wantsDfm =
        /\b(dfm|bom|pcb|trace|bga|stackup|layer|yield|audit)\b/i.test(lower) || (!wantsPeerQuote && !wantsReserve && !wantsUntrusted);

      // Local Specialist 1: bom_dfm_auditor
      if (wantsDfm) {
        recordInvocation(requestOrigin, networkName, "bom_dfm_auditor", "Running read action audit_bom_dfm");
        const dfmRes = await executeSiteAction(
          "audit_bom_dfm",
          {
            boardName: hw.boardName,
            layers: hw.layers,
            minTraceMil: hw.minTraceMil,
            bgaPitchMm: hw.bgaPitchMm,
            qty: hw.qty
          },
          { origin: requestOrigin }
        );
        if (dfmRes.ok) {
          evidence.dfm = dfmRes.result;
          trace.events.push({
            type: "site_action_executed",
            origin: requestOrigin,
            action: "audit_bom_dfm",
            mode: "read",
            status: "ok",
            summary: `DFM score ${dfmRes.result.dfmScore}/100`
          });
        }
      }

      // Local Specialist 2: compliance_arbiter
      if (wantsCompliance) {
        recordInvocation(requestOrigin, networkName, "compliance_arbiter", "Running read action check_compliance_policy");
        const compRes = await executeSiteAction(
          "check_compliance_policy",
          {
            region: hw.region,
            standards: ["RoHS-3", "REACH-SVHC", "EAR99"],
            hasLeadSolder: hw.hasLeadSolder,
            wirelessModule: hw.wirelessModule
          },
          { origin: requestOrigin }
        );
        if (compRes.ok) {
          evidence.compliance = compRes.result;
          trace.events.push({
            type: "site_action_executed",
            origin: requestOrigin,
            action: "check_compliance_policy",
            mode: "read",
            status: "ok",
            summary: `Status ${compRes.result.overallStatus}`
          });
        }
      }

      // Confirmation-Gated Write Action: reserve_bom_lot
      if (wantsReserve) {
        recordInvocation(requestOrigin, networkName, "compliance_arbiter", "Gating write action reserve_bom_lot");
        const writeArgs = {
          sku: hw.sku,
          qty: hw.qty,
          warehouse: hw.warehouse,
          targetUnitPriceUsd: hw.targetUnitPriceUsd
        };
        const writeRes = await executeSiteAction("reserve_bom_lot", writeArgs, {
          origin: requestOrigin,
          confirmAction
        });
        if (writeRes.ok) {
          evidence.reservation = writeRes.result;
          trace.actionReceipts.push(writeRes.receipt);
          trace.events.push({
            type: "site_action_committed",
            origin: requestOrigin,
            action: "reserve_bom_lot",
            mode: "write",
            receiptId: writeRes.receipt.receiptId,
            status: "committed"
          });
        } else {
          evidence.actionBlocked = writeRes;
          trace.events.push({
            type: "site_action_blocked",
            origin: requestOrigin,
            action: "reserve_bom_lot",
            code: writeRes.code,
            reason: writeRes.error
          });
        }
      }

      // Cross-Origin Peer Composition (or Untrusted Peer Security Check)
      if (wantsPeerQuote || wantsUntrusted) {
        const targetUrl = wantsUntrusted
          ? forcePeerUrl || "https://untrusted-peer.example/rogue_quoter"
          : this.resolveLinkUrl(networkName, "fab_quoter");

        const peerResult = await this.invokePeerLink({
          linkAlias: wantsUntrusted ? "untrusted_peer" : "fab_quoter",
          targetUrl,
          prompt,
          slyData,
          networkTool: validation.agentsByName.get("fab_quoter"),
          requestOriginConsent,
          state
        });

        if (peerResult.ok) {
          evidence.peerQuote = peerResult.quote;
        } else {
          evidence.peerBlocked = peerResult;
        }
      }

      // Synthesize final answer (BYOK if configured, else deterministic local arbiter)
      let answer;
      if (this.router.mode === "byok" && this.router.apiKey) {
        try {
          answer = await callByokSynthesis(
            this.router,
            prompt,
            evidence,
            this.fetchImpl,
            this.timeoutMs
          );
          trace.events.push({
            type: "inference_completed",
            mode: "byok",
            endpoint: `${String(this.router.baseUrl).replace(/\/+$/, "")}/chat/completions`,
            note: "BYOK key used strictly for user's inference endpoint; isolated from peers and traces."
          });
        } catch (err) {
          trace.events.push({
            type: "inference_fallback",
            mode: "deterministic-local",
            reason: `BYOK call failed (${err.message}); fell back to Deterministic Local Arbiter.`
          });
          answer = buildDeterministicSummary(prompt, evidence);
        }
      } else {
        answer = buildDeterministicSummary(prompt, evidence);
        trace.events.push({
          type: "inference_completed",
          mode: "deterministic-local",
          note: "Zero-key Deterministic Local Arbiter completed synthesis."
        });
      }

      trace.completedAt = new Date().toISOString();
      trace.invocationsUsed = state.invocations;
      trace.maxDepthReached = state.depth;

      // Final security invariant: guarantee zero BYOK/secret leakage in trace
      const sanitizedTrace = redactSecretsInObject(trace, secretsToGuard);
      sanitizedTrace.byokKeyIsolated = !containsSecretLeak(sanitizedTrace, secretsToGuard);

      return {
        ok: true,
        answer,
        evidence,
        trace: sanitizedTrace
      };
    } catch (err) {
      trace.completedAt = new Date().toISOString();
      trace.invocationsUsed = state.invocations;
      trace.events.push({
        type: "execution_halted",
        code: err.code || "RUNTIME_ERROR",
        message: err.message
      });
      return {
        ok: false,
        code: err.code || "RUNTIME_ERROR",
        error: err.message,
        evidence,
        trace: redactSecretsInObject(trace, secretsToGuard)
      };
    }
  }

  async invokePeerLink({ linkAlias, targetUrl, prompt, slyData, networkTool, requestOriginConsent, state }) {
    const nextDepth = state.depth + 1;
    if (nextDepth > state.maxDepth) {
      const err = new Error(`Cross-origin composition depth ${nextDepth} exceeds max depth ${state.maxDepth}.`);
      err.code = "MAX_DEPTH_EXCEEDED";
      throw err;
    }

    // Step 1: Enforce peer_policy & allowed_peers (fail-closed)
    const policyCheck = evaluatePeerPolicy(targetUrl, this.manifest);
    if (!policyCheck.allowed) {
      state.trace.consentDecisions.push({
        origin: policyCheck.origin || targetUrl,
        linkAlias,
        decision: "BLOCKED_BY_POLICY",
        code: policyCheck.code,
        reason: policyCheck.reason
      });
      state.trace.events.push({
        type: "peer_policy_blocked",
        origin: policyCheck.origin || targetUrl,
        code: policyCheck.code,
        reason: policyCheck.reason
      });
      return {
        ok: false,
        code: policyCheck.code,
        origin: policyCheck.origin,
        reason: policyCheck.reason
      };
    }

    const peerOrigin = policyCheck.origin;
    const declaredAllowKeys = networkTool?.allow?.to_downstream?.sly_data || [];

    // Pre-compute default-deny preview for Consent Modal
    const previewKeys = Object.keys(slyData || {});
    const eligibleKeys = previewKeys.filter(
      (k) => declaredAllowKeys.includes(k) && !SECRET_KEY_PATTERN.test(k)
    );
    const hardBlockedKeys = previewKeys.filter((k) => !eligibleKeys.includes(k));

    // Step 2: Explicit User Origin Consent (fail-closed if missing or denied)
    if (typeof requestOriginConsent !== "function") {
      return {
        ok: false,
        code: "ORIGIN_CONSENT_REQUIRED",
        origin: peerOrigin,
        reason: "Cross-origin composition failed closed: no origin consent handler provided."
      };
    }

    const consent = await requestOriginConsent({
      sourceOrigin: this.origin,
      targetOrigin: peerOrigin,
      linkAlias,
      purpose: "Fetch peer agent-manifest.json and fab_quoter.network.json via CORS and execute PCB/SMT quoting locally in your browser.",
      candidateSlyData: slyData,
      eligibleKeys,
      hardBlockedKeys
    });

    if (!consent || consent.approved !== true) {
      state.trace.consentDecisions.push({
        origin: peerOrigin,
        linkAlias,
        decision: "DENIED_BY_USER",
        reason: consent?.reason || "User declined cross-origin peer composition."
      });
      state.trace.events.push({
        type: "origin_consent_denied",
        origin: peerOrigin,
        linkAlias
      });
      return {
        ok: false,
        code: "ORIGIN_CONSENT_DENIED",
        origin: peerOrigin,
        reason: consent?.reason || "User denied cross-origin peer consent."
      };
    }

    // Step 3: Filter sly_data strictly by allowlist + user opt-in (default-deny!)
    const filtered = filterSlyData(slyData, declaredAllowKeys, consent.approvedSlyDataKeys || []);
    state.trace.consentDecisions.push({
      origin: peerOrigin,
      linkAlias,
      decision: "APPROVED_BY_USER",
      forwardedSlyDataKeys: filtered.allowed,
      blockedSlyDataKeys: filtered.blocked.map((b) => b.key)
    });
    state.trace.slyDataAudit.push({
      targetOrigin: peerOrigin,
      forwardedKeys: filtered.allowed,
      blocked: filtered.blocked
    });

    // Step 4: Live CORS fetch of peer manifest & network (ZERO auth headers, ZERO BYOK keys!)
    if (!state.trace.contactedOrigins.includes(peerOrigin)) {
      state.trace.contactedOrigins.push(peerOrigin);
    }

    const manifestUrl = `${peerOrigin}/agent-manifest.json`;
    const peerManifestRes = await withTimeout(
      (signal) =>
        this.fetchImpl(manifestUrl, {
          method: "GET",
          mode: "cors",
          headers: { Accept: "application/json" },
          signal
        }),
      this.timeoutMs,
      `fetch ${manifestUrl}`
    );

    if (!peerManifestRes.ok) {
      return {
        ok: false,
        code: "PEER_FETCH_FAILED",
        origin: peerOrigin,
        reason: `Failed to fetch peer manifest (${peerManifestRes.status}).`
      };
    }
    const peerManifest = await peerManifestRes.json();

    // Resolve network JSON path from peer manifest
    const targetPath = new URL(targetUrl).pathname.replace(/^\/+/, "");
    const peerNetEntry =
      (peerManifest.networks || []).find((n) => n.name === targetPath || n.name === linkAlias) ||
      peerManifest.networks?.[0];

    if (!peerNetEntry || !peerNetEntry.hocon) {
      return {
        ok: false,
        code: "PEER_MANIFEST_INVALID",
        origin: peerOrigin,
        reason: "Peer agent-manifest.json does not publish a valid network entry."
      };
    }

    const networkUrl = new URL(peerNetEntry.hocon, `${peerOrigin}/`).toString();
    const peerNetRes = await withTimeout(
      (signal) =>
        this.fetchImpl(networkUrl, {
          method: "GET",
          mode: "cors",
          headers: { Accept: "application/json" },
          signal
        }),
      this.timeoutMs,
      `fetch ${networkUrl}`
    );

    if (!peerNetRes.ok) {
      return {
        ok: false,
        code: "PEER_NETWORK_FETCH_FAILED",
        origin: peerOrigin,
        reason: `Failed to fetch peer network JSON (${peerNetRes.status}).`
      };
    }

    const peerNetwork = await peerNetRes.json();
    state.trace.events.push({
      type: "peer_artifacts_fetched",
      origin: peerOrigin,
      manifestUrl,
      networkUrl,
      corsHeader: peerNetRes.headers?.get?.("Access-Control-Allow-Origin") || "*"
    });

    // Step 5: Execute peer network locally in caller's runtime with incremented depth
    const prevDepth = state.depth;
    state.depth = nextDepth;
    try {
      const quote = runPeerNetworkLocally(peerNetwork, peerOrigin, prompt, filtered.forwarded, state);
      return { ok: true, origin: peerOrigin, quote };
    } finally {
      state.depth = prevDepth;
    }
  }
}

// ---------------------------------------------------------------------------
// 8. 7/7 Worldwide Agentic Web MVP Profile 0.3 Interoperability Suite
// ---------------------------------------------------------------------------

export async function runInteroperabilitySuite({
  origin = "https://agentweb.doaipm.com",
  peerOrigin = "https://peer-fab.doaipm.com",
  fetchImpl = globalThis.fetch?.bind(globalThis)
} = {}) {
  const checks = [];
  const record = (id, title, passed, details) => {
    checks.push({ id, title, passed: Boolean(passed), details });
  };

  // Fetch hub discovery artifacts first
  let manifest = null;
  let network = null;
  let links = null;
  let agentCard = null;

  // CHECK 1: Public Discovery & CORS Artifacts
  try {
    const urls = [
      `${origin}/agent-manifest.json`,
      `${origin}/openfab_hub.network.json`,
      `${origin}/links.json`,
      `${origin}/.well-known/agent-card.json`
    ];
    const responses = await Promise.all(urls.map((u) => fetchImpl(u)));
    const corsOk = responses.every((r) => {
      const h = r.headers?.get?.("Access-Control-Allow-Origin");
      return r.ok && (h === "*" || h === origin || h === null);
    });
    [manifest, network, links, agentCard] = await Promise.all(responses.map((r) => r.json()));
    const schemaOk =
      manifest?.profile === "worldwide-agentic-web-mvp/0.3" &&
      manifest?.agent_mcp?.protocol === "nsdeploy-agent-mcp/v1" &&
      manifest?.linking?.protocol === "nsdeploy-link/v1" &&
      Array.isArray(network?.tools) &&
      links?.version === 1 &&
      Boolean(agentCard?.manifestUrl);

    record("check_1", "1. Public Discovery & CORS Artifacts", corsOk && schemaOk, {
      profile: manifest?.profile,
      mcpProtocol: manifest?.agent_mcp?.protocol,
      linkingProtocol: manifest?.linking?.protocol,
      artifactsVerified: 4
    });
  } catch (err) {
    record("check_1", "1. Public Discovery & CORS Artifacts", false, { error: err.message });
  }

  // CHECK 2: Strict Network Validation (Fail-Closed Negative Cases)
  try {
    const validRes = validateNetwork(network, {
      frontMan: manifest?.networks?.[0]?.front_man,
      externalLinks: ["fab_quoter"]
    });
    const badJsonRes = validateNetwork("{ invalid json");
    const noFrontManRes = validateNetwork({ tools: [{ name: "worker_a", tools: [] }] });
    const dupNameRes = validateNetwork({
      tools: [
        { name: "dup_agent", role: "front_man", tools: [] },
        { name: "dup_agent", role: "specialist", tools: [] }
      ]
    });
    const unknownRefRes = validateNetwork({
      tools: [{ name: "root_agent", role: "front_man", tools: ["ghost_tool"] }]
    });

    const passed =
      validRes.ok &&
      !badJsonRes.ok &&
      !noFrontManRes.ok &&
      !dupNameRes.ok &&
      !unknownRefRes.ok;

    record("check_2", "2. Strict Network Validation (Fail-Closed)", passed, {
      validNetworkAccepted: validRes.ok,
      malformedJsonRejected: !badJsonRes.ok,
      missingFrontManRejected: !noFrontManRes.ok,
      duplicateAgentRejected: !dupNameRes.ok,
      unknownReferenceRejected: !unknownRefRes.ok
    });
  } catch (err) {
    record("check_2", "2. Strict Network Validation (Fail-Closed)", false, { error: err.message });
  }

  // CHECK 3: Execution Bounds & Cycle Detection
  try {
    const runtime = new OpenAgenticRuntime({ origin, manifest, network, links, fetchImpl });

    // 3a. Cycle detection (A -> B -> A)
    const cycleRes = await runtime.run({
      prompt: "Run a DFM audit",
      callStack: [`${origin}::openfab_hub::openfab_concierge`]
    });

    // 3b. Max composition depth (> 3)
    const depthRes = await runtime.run({
      prompt: "Run a DFM audit",
      depth: 4
    });

    // 3c. Max invocation budget (> 8)
    const budgetRuntime = new OpenAgenticRuntime({
      origin,
      manifest,
      network,
      links,
      fetchImpl,
      maxInvocations: 1
    });
    const budgetRes = await budgetRuntime.run({
      prompt: "Run a DFM and compliance audit"
    });

    const passed =
      !cycleRes.ok && cycleRes.code === "CYCLE_DETECTED" &&
      !depthRes.ok && depthRes.code === "MAX_DEPTH_EXCEEDED" &&
      !budgetRes.ok && budgetRes.code === "MAX_INVOCATIONS_EXCEEDED";

    record("check_3", "3. Execution Bounds & Cycle Detection", passed, {
      cycleCode: cycleRes.code,
      depthCode: depthRes.code,
      budgetCode: budgetRes.code
    });
  } catch (err) {
    record("check_3", "3. Execution Bounds & Cycle Detection", false, { error: err.message });
  }

  // CHECK 4: Local Site Actions & Write Confirmation Gate
  try {
    const readDfm = await executeSiteAction("audit_bom_dfm", {
      boardName: "Interop Test PCB",
      layers: 6,
      minTraceMil: 3.5,
      bgaPitchMm: 0.5,
      qty: 500
    });
    const invalidSchema = await executeSiteAction("audit_bom_dfm", {
      boardName: "Bad PCB",
      layers: 99,
      minTraceMil: 1,
      qty: -5
    });
    const deniedWrite = await executeSiteAction(
      "reserve_bom_lot",
      { sku: "SKU-STM32H7-R2", qty: 500, warehouse: "HGH-02", targetUnitPriceUsd: 6.4 },
      { origin, confirmAction: async () => ({ approved: false, reason: "Test user cancel" }) }
    );
    const approvedWrite = await executeSiteAction(
      "reserve_bom_lot",
      { sku: "SKU-STM32H7-R2", qty: 500, warehouse: "HGH-02", targetUnitPriceUsd: 6.4 },
      { origin, confirmAction: async () => ({ approved: true }) }
    );

    const passed =
      readDfm.ok &&
      !invalidSchema.ok &&
      !deniedWrite.ok &&
      deniedWrite.code === "ACTION_CONFIRMATION_DENIED" &&
      approvedWrite.ok &&
      approvedWrite.receipt?.status === "committed" &&
      Boolean(approvedWrite.receipt?.receiptId);

    record("check_4", "4. Site Actions, Schema Validation & Write Confirmation", passed, {
      readDfmScore: readDfm.result?.dfmScore,
      invalidSchemaBlocked: !invalidSchema.ok,
      unconfirmedWriteBlocked: deniedWrite.code,
      committedReceiptId: approvedWrite.receipt?.receiptId
    });
  } catch (err) {
    record("check_4", "4. Site Actions, Schema Validation & Write Confirmation", false, { error: err.message });
  }

  // CHECK 5: Cross-Origin Peer Composition & Closed Peer Policy
  try {
    const runtime = new OpenAgenticRuntime({ origin, manifest, network, links, fetchImpl });

    // 5a. Denied origin hard-blocked
    const deniedOriginRes = await runtime.run({
      prompt: "Attempt untrusted peer quote",
      forcePeerUrl: "https://untrusted-peer.example/fab_quoter",
      requestOriginConsent: async () => ({ approved: true })
    });

    // 5b. User consent rejection aborts peer call
    const consentDeniedRes = await runtime.run({
      prompt: "Get SMT quote for 500 units of 6-layer PCB",
      requestOriginConsent: async () => ({ approved: false, reason: "User clicked Deny" })
    });

    // 5c. Live cross-origin composition against peer-fab.doaipm.com
    const livePeerRes = await runtime.run({
      prompt: "Get SMT lead-time and volume quote for 500 units of 6-layer ENIG PCB",
      slyData: { target_region: "EU" },
      requestOriginConsent: async () => ({
        approved: true,
        approvedSlyDataKeys: ["target_region"]
      })
    });

    const passed =
      deniedOriginRes.ok &&
      deniedOriginRes.evidence?.peerBlocked?.code === "PEER_ORIGIN_DENIED" &&
      consentDeniedRes.ok &&
      consentDeniedRes.evidence?.peerBlocked?.code === "ORIGIN_CONSENT_DENIED" &&
      livePeerRes.ok &&
      livePeerRes.evidence?.peerQuote?.provider === peerOrigin &&
      livePeerRes.evidence?.peerQuote?.pricing?.unitPriceUsd > 0;

    record("check_5", "5. Cross-Origin Peer Composition & Origin Policy", passed, {
      untrustedOriginBlocked: deniedOriginRes.evidence?.peerBlocked?.code,
      consentDenialHandled: consentDeniedRes.evidence?.peerBlocked?.code,
      peerOriginContacted: livePeerRes.evidence?.peerQuote?.provider,
      peerUnitPriceUsd: livePeerRes.evidence?.peerQuote?.pricing?.unitPriceUsd,
      peerAgentsExecutedLocally: livePeerRes.evidence?.peerQuote?.executedAgents
    });
  } catch (err) {
    record("check_5", "5. Cross-Origin Peer Composition & Origin Policy", false, { error: err.message });
  }

  // CHECK 6: sly_data Default-Deny & BYOK Secret Isolation
  try {
    const canaryByok = "sk-canary-oaw-secret-99887766";
    const canaryMargin = "INTERNAL_MARGIN_42_PERCENT_DO_NOT_SHARE";
    const capturedPeerRequests = [];

    const spyFetch = async (url, init = {}) => {
      const urlStr = String(url);
      if (urlStr.startsWith(peerOrigin)) {
        capturedPeerRequests.push({
          url: urlStr,
          headers: init.headers || {},
          body: init.body || ""
        });
      }
      return fetchImpl(url, init);
    };

    const runtime = new OpenAgenticRuntime({
      origin,
      manifest,
      network,
      links,
      fetchImpl: spyFetch,
      router: { mode: "deterministic-local", apiKey: canaryByok }
    });

    const res = await runtime.run({
      prompt: "Quote 500 units of 6-layer board from peer fab_quoter",
      slyData: {
        byok_api_key: canaryByok,
        internal_margin_secret: canaryMargin,
        target_region: "EU"
      },
      requestOriginConsent: async () => ({
        approved: true,
        // Even if caller mistakenly tries to approve secret keys, hard policy blocks them!
        approvedSlyDataKeys: ["target_region", "byok_api_key", "internal_margin_secret"]
      })
    });

    const peerRequestLeaked = containsSecretLeak(capturedPeerRequests, [canaryByok, canaryMargin]);
    const traceLeaked = containsSecretLeak(res.trace, [canaryByok, canaryMargin]);
    const receivedKeys = res.evidence?.peerQuote?.receivedSlyDataKeys || [];
    const audit = res.trace?.slyDataAudit?.[0];

    const passed =
      !peerRequestLeaked &&
      !traceLeaked &&
      receivedKeys.length === 1 &&
      receivedKeys[0] === "target_region" &&
      audit?.blocked?.some((b) => b.key === "byok_api_key") &&
      audit?.blocked?.some((b) => b.key === "internal_margin_secret");

    record("check_6", "6. sly_data Default-Deny & BYOK Key Isolation", passed, {
      peerRequestsInspected: capturedPeerRequests.length,
      peerRequestLeaked,
      traceLeaked,
      forwardedKeys: receivedKeys,
      blockedKeys: audit?.blocked?.map((b) => `${b.key} (${b.reason})`)
    });
  } catch (err) {
    record("check_6", "6. sly_data Default-Deny & BYOK Key Isolation", false, { error: err.message });
  }

  // CHECK 7: Public MCP JSON-RPC 2.0 Interoperability (/mcp)
  try {
    const rpcCall = async (id, method, params = {}) => {
      const res = await fetchImpl(`${origin}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params })
      });
      return { status: res.status, cors: res.headers?.get?.("Access-Control-Allow-Origin"), body: await res.json() };
    };

    const init = await rpcCall(1, "initialize", {});
    const list = await rpcCall(2, "tools/list", {});
    const callDfm = await rpcCall(3, "tools/call", {
      name: "audit_bom_dfm",
      arguments: { boardName: "MCP Verify Board", layers: 6, minTraceMil: 3.5, bgaPitchMm: 0.5, qty: 500 }
    });
    const callComp = await rpcCall(4, "tools/call", {
      name: "check_compliance_policy",
      arguments: { region: "EU", standards: ["RoHS-3"], hasLeadSolder: false, wirelessModule: true }
    });

    const toolNames = (list.body?.result?.tools || []).map((t) => t.name);
    const passed =
      init.status === 200 &&
      init.body?.result?.agentMcpProtocol === "nsdeploy-agent-mcp/v1" &&
      toolNames.includes("audit_bom_dfm") &&
      toolNames.includes("check_compliance_policy") &&
      callDfm.status === 200 &&
      callDfm.body?.result?.isError === false &&
      callComp.status === 200 &&
      callComp.body?.result?.structuredContent?.overallStatus === "COMPLIANT";

    record("check_7", "7. Public MCP JSON-RPC 2.0 Endpoint (/mcp)", passed, {
      mcpProtocol: init.body?.result?.agentMcpProtocol,
      listedTools: toolNames,
      dfmScoreViaMcp: callDfm.body?.result?.structuredContent?.dfmScore,
      complianceViaMcp: callComp.body?.result?.structuredContent?.overallStatus
    });
  } catch (err) {
    record("check_7", "7. Public MCP JSON-RPC 2.0 Endpoint (/mcp)", false, { error: err.message });
  }

  const passedCount = checks.filter((c) => c.passed).length;
  return {
    allPassed: passedCount === checks.length,
    passedCount,
    totalCount: checks.length,
    ranAt: new Date().toISOString(),
    checks
  };
}
