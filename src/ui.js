export function renderOpenFabHomeHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenFab Mesh — Open Agentic Hardware &amp; Supply-Chain Hub (OAW MVP 0.3)</title>
  <style>
    :root {
      --bg: #070c12;
      --bg-2: #0b131e;
      --panel: #0f1926;
      --panel-soft: #132132;
      --border: #1e3147;
      --border-hi: #2a4666;
      --text: #e8f1fa;
      --muted: #8ea6bf;
      --cyan: #22d3ee;
      --cyan-soft: rgba(34, 211, 238, 0.12);
      --emerald: #34d399;
      --emerald-soft: rgba(52, 211, 153, 0.13);
      --amber: #fbbf24;
      --amber-soft: rgba(251, 191, 36, 0.12);
      --rose: #fb7185;
      --rose-soft: rgba(251, 113, 133, 0.13);
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--sans);
      color: var(--text);
      background:
        radial-gradient(circle at 12% 0%, rgba(14, 116, 144, 0.24), transparent 38%),
        radial-gradient(circle at 88% 8%, rgba(16, 185, 129, 0.16), transparent 34%),
        var(--bg);
      min-height: 100vh;
    }
    a { color: var(--cyan); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* Top Header */
    .topbar {
      position: sticky; top: 0; z-index: 20;
      backdrop-filter: blur(12px);
      background: rgba(7, 12, 18, 0.88);
      border-bottom: 1px solid var(--border);
    }
    .topbar-inner {
      max-width: 1420px; margin: 0 auto; padding: 12px 20px;
      display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, #06b6d4, #10b981);
      display: grid; place-items: center; font-weight: 800; color: #041219; font-size: 16px;
      box-shadow: 0 0 24px rgba(34, 211, 238, 0.28);
    }
    .brand-title { font-size: 17px; font-weight: 700; letter-spacing: -0.02em; }
    .brand-sub { font-size: 12px; color: var(--muted); }
    .status-strip { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .pill {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 999px;
      border: 1px solid var(--border); background: var(--panel); color: var(--text);
    }
    .pill.cyan { border-color: rgba(34, 211, 238, 0.35); color: var(--cyan); background: var(--cyan-soft); }
    .pill.emerald { border-color: rgba(52, 211, 153, 0.38); color: var(--emerald); background: var(--emerald-soft); }
    .pill.amber { border-color: rgba(251, 191, 36, 0.38); color: var(--amber); background: var(--amber-soft); }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--emerald); }

    /* Buttons */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      border: 1px solid var(--border-hi); background: var(--panel-soft); color: var(--text);
      font-size: 12px; font-weight: 600; padding: 8px 13px; border-radius: 9px; cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn:hover { border-color: var(--cyan); color: var(--cyan); }
    .btn.primary {
      background: linear-gradient(135deg, #06b6d4, #10b981); border: none; color: #031319;
      box-shadow: 0 4px 18px rgba(16, 185, 129, 0.25);
    }
    .btn.primary:hover { filter: brightness(1.08); color: #031319; }
    .btn.danger {
      border-color: rgba(251, 113, 133, 0.45); background: var(--rose-soft); color: var(--rose);
    }
    .btn.danger:hover { border-color: var(--rose); }
    .btn.sm { font-size: 11px; padding: 5px 9px; border-radius: 7px; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Layout */
    .shell {
      max-width: 1420px; margin: 0 auto; padding: 18px 20px 40px;
      display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(380px, 0.85fr); gap: 18px;
    }
    @media (max-width: 1060px) {
      .shell { grid-template-columns: 1fr; }
    }

    .card {
      background: var(--panel); border: 1px solid var(--border); border-radius: 14px;
      overflow: hidden;
    }
    .card-hd {
      padding: 13px 16px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
      background: rgba(19, 33, 50, 0.55);
    }
    .card-hd h2 { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: 0.01em; }
    .card-bd { padding: 16px; }

    /* Artifact Quickbar */
    .artifact-bar {
      display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
      margin-bottom: 14px; padding: 10px 14px; border-radius: 12px;
      background: rgba(15, 25, 38, 0.85); border: 1px solid var(--border);
      font-size: 12px; color: var(--muted);
    }
    .artifact-bar a {
      font-family: var(--mono); font-size: 11px; padding: 3px 8px; border-radius: 6px;
      background: #0a121c; border: 1px solid var(--border); color: var(--cyan);
    }
    .artifact-bar a:hover { border-color: var(--cyan); text-decoration: none; }

    /* Scenario Grid */
    .scenarios {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px;
    }
    @media (max-width: 680px) { .scenarios { grid-template-columns: 1fr; } }
    .scenario-btn {
      text-align: left; padding: 11px 12px; border-radius: 10px; cursor: pointer;
      border: 1px solid var(--border); background: var(--bg-2); color: var(--text);
      transition: border-color 0.15s ease, transform 0.12s ease;
    }
    .scenario-btn:hover { border-color: var(--cyan); transform: translateY(-1px); }
    .scenario-tag {
      display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; padding: 2px 6px; border-radius: 4px; margin-bottom: 5px;
    }
    .tag-local { background: var(--cyan-soft); color: var(--cyan); }
    .tag-peer { background: var(--emerald-soft); color: var(--emerald); }
    .tag-write { background: var(--amber-soft); color: var(--amber); }
    .tag-sec { background: var(--rose-soft); color: var(--rose); }
    .scenario-title { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
    .scenario-desc { font-size: 11.5px; color: var(--muted); line-height: 1.4; }

    /* Private Context Bar */
    .vault-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
      padding: 10px 12px; border-radius: 10px; margin-bottom: 12px;
      background: #09111b; border: 1px dashed var(--border-hi); font-size: 12px;
    }
    .vault-items { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .vault-chip {
      font-family: var(--mono); font-size: 11px; padding: 3px 8px; border-radius: 6px;
      border: 1px solid var(--border); background: #0d1724;
    }
    .vault-chip.locked { color: var(--rose); border-color: rgba(251, 113, 133, 0.35); }
    .vault-chip.optin { color: var(--emerald); border-color: rgba(52, 211, 153, 0.35); }
    select, input[type="text"], input[type="password"], textarea {
      background: #08101a; color: var(--text); border: 1px solid var(--border-hi);
      border-radius: 8px; padding: 8px 10px; font-family: var(--sans); font-size: 13px;
    }
    select:focus, input:focus, textarea:focus { outline: none; border-color: var(--cyan); }

    /* Composer & Transcript */
    .composer { display: flex; gap: 10px; margin-bottom: 14px; }
    .composer textarea { flex: 1; min-height: 54px; resize: vertical; line-height: 1.45; }
    .transcript {
      display: flex; flex-direction: column; gap: 12px;
      max-height: 540px; overflow-y: auto; padding-right: 4px;
    }
    .msg {
      padding: 13px 14px; border-radius: 12px; border: 1px solid var(--border);
      background: var(--bg-2); font-size: 13px; line-height: 1.55;
    }
    .msg.user { border-color: rgba(34, 211, 238, 0.35); background: rgba(14, 34, 52, 0.55); }
    .msg-meta {
      display: flex; justify-content: space-between; font-size: 11px; color: var(--muted);
      margin-bottom: 6px; font-family: var(--mono);
    }
    .evidence-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px; margin-top: 10px;
    }
    .ev-box {
      padding: 10px 12px; border-radius: 9px; border: 1px solid var(--border);
      background: #08101a; font-size: 12px;
    }
    .ev-box h4 { margin: 0 0 6px; font-size: 12px; color: var(--cyan); }
    .ev-box.emerald h4 { color: var(--emerald); }
    .ev-box.amber h4 { color: var(--amber); }
    .ev-box.rose h4 { color: var(--rose); }
    .kv { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 3px; font-size: 11.5px; }
    .kv span:first-child { color: var(--muted); }
    .kv span:last-child { font-family: var(--mono); text-align: right; }

    /* Right Inspector Tabs */
    .tabs { display: flex; border-bottom: 1px solid var(--border); background: #0b131e; }
    .tab-btn {
      flex: 1; padding: 11px 8px; border: none; background: transparent; color: var(--muted);
      font-size: 12px; font-weight: 700; cursor: pointer; border-bottom: 2px solid transparent;
    }
    .tab-btn.active { color: var(--cyan); border-bottom-color: var(--cyan); background: rgba(34, 211, 238, 0.06); }
    .tab-pane { display: none; padding: 14px 16px; }
    .tab-pane.active { display: block; }

    /* Interop Checks */
    .check-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
    .check-item {
      padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border);
      background: #09111b;
    }
    .check-hd { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12.5px; font-weight: 600; }
    .badge-pass {
      font-family: var(--mono); font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 999px;
      background: var(--emerald-soft); color: var(--emerald); border: 1px solid rgba(52, 211, 153, 0.45);
    }
    .badge-fail {
      font-family: var(--mono); font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 999px;
      background: var(--rose-soft); color: var(--rose); border: 1px solid rgba(251, 113, 133, 0.45);
    }
    .check-detail {
      margin-top: 6px; font-family: var(--mono); font-size: 11px; color: var(--muted);
      white-space: pre-wrap; word-break: break-word;
    }

    /* Trace Timeline */
    .trace-summary {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px;
    }
    .metric {
      padding: 9px 10px; border-radius: 9px; background: #09111b; border: 1px solid var(--border);
    }
    .metric-label { font-size: 10.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .metric-val { font-family: var(--mono); font-size: 12px; font-weight: 700; margin-top: 3px; color: var(--cyan); }
    pre.code {
      margin: 10px 0 0; padding: 12px; border-radius: 10px; background: #060b11;
      border: 1px solid var(--border); font-family: var(--mono); font-size: 11px; color: #b9e6fe;
      overflow: auto; max-height: 360px; white-space: pre-wrap; word-break: break-word;
    }

    /* Form Grid */
    .field { margin-bottom: 11px; }
    .field label { display: block; font-size: 11.5px; font-weight: 600; color: var(--muted); margin-bottom: 4px; }
    .field input, .field select { width: 100%; }

    /* Modals */
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 100; display: none; align-items: center; justify-content: center;
      background: rgba(2, 6, 12, 0.78); backdrop-filter: blur(5px); padding: 16px;
    }
    .modal-backdrop.open { display: flex; }
    .modal {
      width: 100%; max-width: 560px; background: #0e1825; border: 1px solid var(--border-hi);
      border-radius: 16px; overflow: hidden; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.65);
    }
    .modal-hd {
      padding: 15px 18px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(15, 29, 44, 0.9);
    }
    .modal-hd h3 { margin: 0; font-size: 15px; }
    .modal-bd { padding: 16px 18px; font-size: 13px; line-height: 1.5; }
    .modal-ft {
      padding: 13px 18px; border-top: 1px solid var(--border);
      display: flex; justify-content: flex-end; gap: 10px; background: #09111b;
    }
    .firewall-row {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border);
      background: #08101a; margin-bottom: 7px; font-family: var(--mono); font-size: 12px;
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand">
        <div class="logo">OF</div>
        <div>
          <div class="brand-title">OpenFab Mesh</div>
          <div class="brand-sub">Open Agentic Hardware &amp; Supply-Chain Hub</div>
        </div>
      </div>
      <div class="status-strip">
        <span class="pill cyan"><span class="dot"></span>OAW MVP Profile 0.3</span>
        <span class="pill" id="originPill">Origin: loading...</span>
        <span class="pill emerald" id="routerPill">Router: Deterministic Local (Zero-Key)</span>
        <button class="btn primary sm" id="quickInteropBtn">Run 7/7 MVP Interop Suite</button>
      </div>
    </div>
  </header>

  <main class="shell">
    <!-- LEFT: Agentic Workbench -->
    <section>
      <div class="artifact-bar">
        <strong>Public OAW Artifacts (CORS *):</strong>
        <a href="/agent-manifest.json" target="_blank">/agent-manifest.json</a>
        <a href="/openfab_hub.network.json" target="_blank">/openfab_hub.network.json</a>
        <a href="/links.json" target="_blank">/links.json</a>
        <a href="/.well-known/agent-card.json" target="_blank">/.well-known/agent-card.json</a>
        <a href="https://peer-fab.doaipm.com" target="_blank" style="color:var(--emerald);">Peer: peer-fab.doaipm.com ↗</a>
      </div>

      <div class="card">
        <div class="card-hd">
          <h2>Browser-Local Multi-Agent Workbench (front_man: openfab_concierge)</h2>
          <span class="pill">Max Depth: 3 · Budget: 8</span>
        </div>
        <div class="card-bd">
          <div class="scenarios">
            <button class="scenario-btn" data-prompt="Run a DFM &amp; EU RoHS compliance audit on a 6-layer ENIG controller board (3.5 mil trace, 0.5mm BGA, 500 units, wireless BLE module)">
              <span class="scenario-tag tag-local">Local Multi-Agent + Read Actions</span>
              <div class="scenario-title">1. DFM + Compliance Audit</div>
              <div class="scenario-desc">Delegates to <code>bom_dfm_auditor</code> &amp; <code>compliance_arbiter</code> using schema-validated read actions.</div>
            </button>
            <button class="scenario-btn" data-prompt="Get a cross-origin PCB/SMT lead-time and volume quote from ApexFab peer fab_quoter for 500 units of 6-layer ENIG PCB">
              <span class="scenario-tag tag-peer">Real Cross-Origin Peer (CORS)</span>
              <div class="scenario-title">2. Cross-Origin SMT Quote (peer-fab)</div>
              <div class="scenario-desc">Triggers Explicit Origin Consent + <code>sly_data</code> firewall, fetches <code>peer-fab.doaipm.com</code> live, runs peer locally.</div>
            </button>
            <button class="scenario-btn" data-prompt="Reserve BOM lot SKU-STM32H7-R2 (500 units) at warehouse HGH-02 with target unit price $6.40">
              <span class="scenario-tag tag-write">Write Action + Signed Receipt</span>
              <div class="scenario-title">3. Reserve BOM Lot (Confirm Gate)</div>
              <div class="scenario-desc">Pops up interactive Write Confirmation Modal before committing <code>reserve_bom_lot</code> &amp; issuing SHA-256 receipt.</div>
            </button>
            <button class="scenario-btn" data-prompt="Attempt to compose with denied origin https://untrusted-peer.example to verify fail-closed peer policy">
              <span class="scenario-tag tag-sec">Security Negative Test</span>
              <div class="scenario-title">4. Untrusted Peer Attack Check</div>
              <div class="scenario-desc">Proves closed <code>peer_policy</code> &amp; <code>deny_origins</code> block unauthorized origins before any network fetch.</div>
            </button>
          </div>

          <div class="vault-bar">
            <div class="vault-items">
              <strong>Local <code>sly_data</code> Vault:</strong>
              <span class="vault-chip locked" title="Never leaves browser or crosses origins">🔒 byok_api_key: BLOCKED</span>
              <span class="vault-chip locked" title="Never crosses origins">🔒 internal_margin_secret: BLOCKED</span>
              <span class="vault-chip optin">
                target_region:
                <select id="regionSelect" style="padding:2px 6px;font-size:11px;margin-left:4px;">
                  <option value="EU" selected>EU</option>
                  <option value="US">US</option>
                  <option value="APAC">APAC</option>
                  <option value="GLOBAL">GLOBAL</option>
                </select>
              </span>
            </div>
            <span style="font-size:11px;color:var(--muted);">Default-deny across origins</span>
          </div>

          <div class="composer">
            <textarea id="promptInput" placeholder="Ask openfab_concierge to audit a PCB BOM, check EU/US compliance, fetch a cross-origin quote from ApexFab (peer-fab.doaipm.com), or reserve a BOM lot..."></textarea>
            <button class="btn primary" id="sendBtn" style="min-width:110px;">Run Agent</button>
          </div>

          <div class="transcript" id="transcript">
            <div class="msg">
              <div class="msg-meta">
                <span>openfab_concierge · ready</span>
                <span>Zero-Key Deterministic Local Arbiter active</span>
              </div>
              Welcome to <strong>OpenFab Mesh</strong>. Click any of the 4 scenarios above (or type your own hardware prompt), or click <strong>Run 7/7 MVP Interop Suite</strong> to verify full Worldwide Agentic Web MVP Profile 0.3 compliance live in your browser.
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- RIGHT: Observable Inspector Rail -->
    <section>
      <div class="card">
        <div class="tabs">
          <button class="tab-btn active" data-tab="trace">Execution Trace</button>
          <button class="tab-btn" data-tab="interop">7/7 MVP Interop</button>
          <button class="tab-btn" data-tab="byok">BYOK Router</button>
          <button class="tab-btn" data-tab="artifacts">Artifacts &amp; MCP</button>
        </div>

        <!-- TAB 1: Observable Execution Trace -->
        <div class="tab-pane active" id="tab-trace">
          <div class="trace-summary">
            <div class="metric">
              <div class="metric-label">Selected Router</div>
              <div class="metric-val" id="mRouter">Deterministic Local</div>
            </div>
            <div class="metric">
              <div class="metric-label">Contacted Origins</div>
              <div class="metric-val" id="mOrigins">1 (self)</div>
            </div>
            <div class="metric">
              <div class="metric-label">Invocations / Depth</div>
              <div class="metric-val" id="mBudget">0 / 8 · d=0/3</div>
            </div>
            <div class="metric">
              <div class="metric-label">BYOK &amp; Secret Audit</div>
              <div class="metric-val" id="mSecrets" style="color:var(--emerald);">ZERO LEAKS</div>
            </div>
          </div>
          <div id="traceBadges" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;"></div>
          <pre class="code" id="traceJson">Run any scenario to inspect the observable, secret-free execution trace (contacted origins, consent decisions, sly_data redaction audit, and signed action receipts).</pre>
        </div>

        <!-- TAB 2: 7/7 MVP Interoperability Suite -->
        <div class="tab-pane" id="tab-interop">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <div>
              <strong style="font-size:13px;">Section 6 MVP Profile 0.3 Self-Test</strong>
              <div style="font-size:11.5px;color:var(--muted);">Verifies discovery, fail-closed validation, cycles/bounds, write confirmation, live CORS peer composition, sly_data/BYOK isolation, and /mcp JSON-RPC 2.0.</div>
            </div>
            <button class="btn primary" id="runInteropBtn">Run 7/7 Suite</button>
          </div>
          <div id="interopSummary" style="margin-top:10px;font-size:12px;color:var(--muted);">Not run yet.</div>
          <div class="check-list" id="interopList"></div>
        </div>

        <!-- TAB 3: BYOK Router Config -->
        <div class="tab-pane" id="tab-byok">
          <div class="ev-box emerald" style="margin-bottom:12px;">
            <h4>Strict Browser-Local BYOK Isolation</h4>
            <div style="font-size:11.5px;color:var(--muted);line-height:1.45;">
              Your API key is stored <strong>only</strong> in this browser's <code>localStorage</code>, is deletable with one click, and is <strong>never</strong> sent to peer websites, query URLs, manifests, or execution traces. Leave in Deterministic Local mode for instant zero-key evaluation.
            </div>
          </div>
          <div class="field">
            <label for="routerMode">Inference Mode</label>
            <select id="routerMode">
              <option value="deterministic-local">Deterministic Local Arbiter (Zero-Key Default)</option>
              <option value="byok">BYOK OpenAI-Compatible Router</option>
            </select>
          </div>
          <div class="field">
            <label for="byokPreset">Router Preset</label>
            <select id="byokPreset">
              <option value="https://api.otari.ai/api/v1">Mozilla Otari (https://api.otari.ai/api/v1)</option>
              <option value="https://api.openai.com/v1">OpenAI (https://api.openai.com/v1)</option>
              <option value="custom">Custom OpenAI-Compatible Base URL</option>
            </select>
          </div>
          <div class="field">
            <label for="byokBaseUrl">Base URL</label>
            <input type="text" id="byokBaseUrl" value="https://api.otari.ai/api/v1" />
          </div>
          <div class="field">
            <label for="byokModel">Model ID</label>
            <input type="text" id="byokModel" value="gpt-4o-mini" />
          </div>
          <div class="field">
            <label for="byokKey">API Key (Stored ONLY in browser localStorage)</label>
            <input type="password" id="byokKey" placeholder="sk-... (optional; never sent to peer origins)" />
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn primary" id="saveByokBtn">Save Router Config</button>
            <button class="btn danger" id="clearByokBtn">Delete Key from Browser</button>
          </div>
          <div id="byokStatus" style="margin-top:9px;font-size:12px;color:var(--emerald);"></div>
        </div>

        <!-- TAB 4: Artifacts, Browser-Local Links & Live /mcp Tester -->
        <div class="tab-pane" id="tab-artifacts">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
            <button class="btn sm artifact-view-btn" data-url="/agent-manifest.json">agent-manifest.json</button>
            <button class="btn sm artifact-view-btn" data-url="/openfab_hub.network.json">network.json</button>
            <button class="btn sm artifact-view-btn" data-url="/links.json">links.json</button>
            <button class="btn sm artifact-view-btn" data-url="/.well-known/agent-card.json">agent-card.json</button>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
            <button class="btn sm primary" id="mcpListBtn">POST /mcp tools/list</button>
            <button class="btn sm" id="mcpCallDfmBtn">POST /mcp audit_bom_dfm</button>
            <button class="btn sm" id="mcpCallCompBtn">POST /mcp check_compliance_policy</button>
          </div>
          <div class="field" style="margin-top:10px;">
            <label for="localLinkOverride">Browser-Local Link Override for <code>fab_quoter</code> (<code>link_updates.mode: "browser-local"</code>)</label>
            <div style="display:flex;gap:6px;">
              <input type="text" id="localLinkOverride" value="https://peer-fab.doaipm.com/fab_quoter" />
              <button class="btn sm" id="saveLinkBtn">Apply</button>
            </div>
          </div>
          <pre class="code" id="artifactViewer">Click any artifact or /mcp button above to inspect live JSON.</pre>
        </div>
      </div>
    </section>
  </main>

  <!-- MODAL 1: Explicit Cross-Origin Peer Consent & sly_data Firewall -->
  <div class="modal-backdrop" id="consentModal">
    <div class="modal">
      <div class="modal-hd">
        <h3 style="color:var(--cyan);">Cross-Origin Peer Composition Consent</h3>
        <span class="pill amber">Explicit Origin Gate</span>
      </div>
      <div class="modal-bd">
        <p style="margin-top:0;">
          <strong>OpenFab Mesh</strong> wants to fetch and execute a peer agent network locally inside your browser:
        </p>
        <div class="ev-box" style="margin-bottom:12px;">
          <div class="kv"><span>Caller Origin</span><span id="cSourceOrigin"></span></div>
          <div class="kv"><span>Destination Peer Origin</span><span id="cTargetOrigin" style="color:var(--emerald);font-weight:700;"></span></div>
          <div class="kv"><span>Symbolic Link Alias</span><span id="cLinkAlias"></span></div>
          <div class="kv"><span>Purpose</span><span id="cPurpose" style="font-family:var(--sans);max-width:340px;"></span></div>
        </div>
        <div style="font-size:12px;font-weight:700;margin-bottom:6px;color:var(--text);">
          <code>sly_data</code> Private Context Firewall (Default-Deny)
        </div>
        <div id="cFirewallList"></div>
        <div style="font-size:11.5px;color:var(--muted);margin-top:8px;">
          Only checked allowlisted keys are passed into the peer's local browser execution. Your BYOK key and internal margin secrets are hard-blocked and never leave this origin.
        </div>
      </div>
      <div class="modal-ft">
        <button class="btn danger" id="consentDenyBtn">Deny Cross-Origin Call</button>
        <button class="btn primary" id="consentApproveBtn">Approve &amp; Run Peer Locally</button>
      </div>
    </div>
  </div>

  <!-- MODAL 2: Explicit Write Action Confirmation -->
  <div class="modal-backdrop" id="actionModal">
    <div class="modal">
      <div class="modal-hd">
        <h3 style="color:var(--amber);">Confirm Write Site Action</h3>
        <span class="pill amber">Irreversible Write Gate</span>
      </div>
      <div class="modal-bd">
        <p style="margin-top:0;">
          An agent is requesting to commit a state-changing site action on this origin. Review the validated arguments before approving:
        </p>
        <div class="ev-box amber" style="margin-bottom:10px;">
          <div class="kv"><span>Origin</span><span id="aOrigin"></span></div>
          <div class="kv"><span>Action</span><span id="aName" style="color:var(--amber);font-weight:700;"></span></div>
          <div class="kv"><span>Description</span><span id="aDesc" style="font-family:var(--sans);max-width:340px;"></span></div>
        </div>
        <div style="font-size:12px;font-weight:700;margin-bottom:4px;">Validated Arguments</div>
        <pre class="code" id="aArgsJson" style="max-height:180px;"></pre>
      </div>
      <div class="modal-ft">
        <button class="btn danger" id="actionCancelBtn">Cancel (Fail Closed)</button>
        <button class="btn primary" id="actionApproveBtn">Confirm &amp; Issue Signed Receipt</button>
      </div>
    </div>
  </div>

  <script type="module">
    import {
      OpenAgenticRuntime,
      runInteroperabilitySuite,
      BYOK_STORAGE_KEY,
      LOCAL_LINKS_STORAGE_KEY
    } from "/runtime.js";

    const origin = window.location.origin;
    document.getElementById("originPill").textContent = "Origin: " + window.location.host;

    let runtime = null;
    let manifest = null;
    let network = null;
    let links = null;

    // Load saved BYOK router config strictly from localStorage
    function loadSavedRouter() {
      try {
        const raw = localStorage.getItem(BYOK_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
      return {
        mode: "deterministic-local",
        baseUrl: "https://api.otari.ai/api/v1",
        model: "gpt-4o-mini",
        apiKey: ""
      };
    }

    function loadLocalLinks() {
      try {
        const raw = localStorage.getItem(LOCAL_LINKS_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
      return {};
    }

    function updateRouterPill(cfg) {
      const pill = document.getElementById("routerPill");
      if (cfg.mode === "byok" && cfg.apiKey) {
        pill.textContent = "Router: BYOK (" + (cfg.model || "custom") + ")";
        pill.className = "pill amber";
      } else {
        pill.textContent = "Router: Deterministic Local (Zero-Key)";
        pill.className = "pill emerald";
      }
    }

    async function boot() {
      const [mRes, nRes, lRes] = await Promise.all([
        fetch("/agent-manifest.json"),
        fetch("/openfab_hub.network.json"),
        fetch("/links.json")
      ]);
      manifest = await mRes.json();
      network = await nRes.json();
      links = await lRes.json();

      const routerCfg = loadSavedRouter();
      const linkOverrides = loadLocalLinks();
      runtime = new OpenAgenticRuntime({
        origin,
        manifest,
        network,
        links,
        router: routerCfg,
        localLinkOverrides: linkOverrides
      });

      document.getElementById("routerMode").value = routerCfg.mode;
      document.getElementById("byokBaseUrl").value = routerCfg.baseUrl || "https://api.otari.ai/api/v1";
      document.getElementById("byokModel").value = routerCfg.model || "gpt-4o-mini";
      document.getElementById("byokKey").value = routerCfg.apiKey || "";
      if (linkOverrides.fab_quoter) {
        document.getElementById("localLinkOverride").value = linkOverrides.fab_quoter;
      }
      updateRouterPill(routerCfg);
      document.getElementById("artifactViewer").textContent = JSON.stringify(manifest, null, 2);
    }

    // Tab switching
    function activateTab(tabName) {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabName));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.toggle("active", p.id === "tab-" + tabName));
    }
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => activateTab(btn.dataset.tab));
    });

    // Interactive Cross-Origin Consent Modal Promise
    function openConsentModal(req) {
      return new Promise((resolve) => {
        const modal = document.getElementById("consentModal");
        document.getElementById("cSourceOrigin").textContent = req.sourceOrigin;
        document.getElementById("cTargetOrigin").textContent = req.targetOrigin;
        document.getElementById("cLinkAlias").textContent = req.linkAlias;
        document.getElementById("cPurpose").textContent = req.purpose;

        const list = document.getElementById("cFirewallList");
        list.innerHTML = "";

        for (const key of req.hardBlockedKeys) {
          const row = document.createElement("div");
          row.className = "firewall-row";
          row.innerHTML = '<span>🔒 ' + escapeHtml(key) + '</span><span class="badge-fail">BLOCKED (SECRET / DEFAULT-DENY)</span>';
          list.appendChild(row);
        }
        for (const key of req.eligibleKeys) {
          const val = req.candidateSlyData[key];
          const row = document.createElement("div");
          row.className = "firewall-row";
          row.innerHTML =
            '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0;color:var(--text);">' +
            '<input type="checkbox" class="sly-optin" value="' + escapeHtml(key) + '" checked />' +
            '<span>' + escapeHtml(key) + ' = "' + escapeHtml(String(val)) + '"</span></label>' +
            '<span class="badge-pass">ALLOWLISTED OPT-IN</span>';
          list.appendChild(row);
        }

        modal.classList.add("open");

        const cleanup = () => {
          modal.classList.remove("open");
          approveBtn.onclick = null;
          denyBtn.onclick = null;
        };
        const approveBtn = document.getElementById("consentApproveBtn");
        const denyBtn = document.getElementById("consentDenyBtn");

        approveBtn.onclick = () => {
          const approvedSlyDataKeys = Array.from(list.querySelectorAll("input.sly-optin:checked")).map((el) => el.value);
          cleanup();
          resolve({ approved: true, approvedSlyDataKeys });
        };
        denyBtn.onclick = () => {
          cleanup();
          resolve({ approved: false, reason: "User clicked Deny in Origin Consent Modal." });
        };
      });
    }

    // Interactive Write Action Confirmation Modal Promise
    function openActionModal(req) {
      return new Promise((resolve) => {
        const modal = document.getElementById("actionModal");
        document.getElementById("aOrigin").textContent = req.origin;
        document.getElementById("aName").textContent = req.action;
        document.getElementById("aDesc").textContent = req.description;
        document.getElementById("aArgsJson").textContent = JSON.stringify(req.arguments, null, 2);
        modal.classList.add("open");

        const approveBtn = document.getElementById("actionApproveBtn");
        const cancelBtn = document.getElementById("actionCancelBtn");
        const cleanup = () => {
          modal.classList.remove("open");
          approveBtn.onclick = null;
          cancelBtn.onclick = null;
        };
        approveBtn.onclick = () => {
          cleanup();
          resolve({ approved: true });
        };
        cancelBtn.onclick = () => {
          cleanup();
          resolve({ approved: false, reason: "User cancelled write action in Confirmation Modal." });
        };
      });
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function appendMessage(role, metaRight, text, evidence = null) {
      const container = document.getElementById("transcript");
      const el = document.createElement("div");
      el.className = "msg" + (role === "user" ? " user" : "");

      let html =
        '<div class="msg-meta"><span>' +
        escapeHtml(role === "user" ? "you · browser" : "openfab_concierge · browser-local runtime") +
        "</span><span>" +
        escapeHtml(metaRight) +
        "</span></div>" +
        '<div style="white-space:pre-wrap;">' +
        escapeHtml(text) +
        "</div>";

      if (evidence) {
        const cards = [];
        if (evidence.dfm) {
          const d = evidence.dfm;
          cards.push(
            '<div class="ev-box"><h4>DFM Audit (audit_bom_dfm)</h4>' +
            '<div class="kv"><span>Score / Grade</span><span>' + d.dfmScore + '/100 (' + d.grade + ')</span></div>' +
            '<div class="kv"><span>Est. Yield</span><span>' + d.estimatedFirstPassYieldPct + '%</span></div>' +
            '<div class="kv"><span>Finish</span><span>' + escapeHtml(d.recommendedFinish) + '</span></div></div>'
          );
        }
        if (evidence.compliance) {
          const c = evidence.compliance;
          cards.push(
            '<div class="ev-box emerald"><h4>Compliance (' + escapeHtml(c.region) + ')</h4>' +
            '<div class="kv"><span>Status</span><span>' + escapeHtml(c.overallStatus) + '</span></div>' +
            '<div class="kv"><span>Checks</span><span>' + c.checks.length + ' verified</span></div></div>'
          );
        }
        if (evidence.peerQuote) {
          const q = evidence.peerQuote;
          cards.push(
            '<div class="ev-box emerald"><h4>Peer Quote (' + escapeHtml(q.network) + ')</h4>' +
            '<div class="kv"><span>Peer Origin</span><span>' + escapeHtml(q.provider) + '</span></div>' +
            '<div class="kv"><span>Unit Price</span><span>$' + q.pricing.unitPriceUsd + ' × ' + q.spec.qty + '</span></div>' +
            '<div class="kv"><span>Extended + NRE</span><span>$' + q.pricing.extendedTotalUsd + '</span></div>' +
            '<div class="kv"><span>Lead Time (' + escapeHtml(q.targetRegionUsed) + ')</span><span>' + q.schedule.standardBusinessDays + 'd std / ' + q.schedule.expediteBusinessDays + 'd exp</span></div></div>'
          );
        }
        if (evidence.reservation) {
          const r = evidence.reservation.receipt;
          cards.push(
            '<div class="ev-box amber"><h4>Signed Action Receipt</h4>' +
            '<div class="kv"><span>Receipt ID</span><span>' + escapeHtml(r.receiptId) + '</span></div>' +
            '<div class="kv"><span>Status</span><span>' + escapeHtml(r.status) + '</span></div>' +
            '<div class="kv"><span>Signature</span><span>' + escapeHtml(r.signature.slice(0, 22)) + '…</span></div></div>'
          );
        }
        if (evidence.peerBlocked) {
          cards.push(
            '<div class="ev-box rose"><h4>Fail-Closed Peer Block</h4>' +
            '<div class="kv"><span>Code</span><span>' + escapeHtml(evidence.peerBlocked.code) + '</span></div>' +
            '<div style="color:var(--muted);margin-top:4px;">' + escapeHtml(evidence.peerBlocked.reason) + '</div></div>'
          );
        }
        if (evidence.actionBlocked) {
          cards.push(
            '<div class="ev-box rose"><h4>Write Action Halted</h4>' +
            '<div class="kv"><span>Code</span><span>' + escapeHtml(evidence.actionBlocked.code) + '</span></div>' +
            '<div style="color:var(--muted);margin-top:4px;">' + escapeHtml(evidence.actionBlocked.error) + '</div></div>'
          );
        }
        if (cards.length) {
          html += '<div class="evidence-grid">' + cards.join("") + "</div>";
        }
      }

      el.innerHTML = html;
      container.appendChild(el);
      container.scrollTop = container.scrollHeight;
    }

    function renderTrace(trace) {
      document.getElementById("mRouter").textContent = trace.routerSelected || "Deterministic Local";
      document.getElementById("mOrigins").textContent =
        (trace.contactedOrigins?.length || 1) + " (" + (trace.contactedOrigins || []).map((o) => {
          try { return new URL(o).host; } catch { return o; }
        }).join(", ") + ")";
      document.getElementById("mBudget").textContent =
        (trace.invocationsUsed ?? 0) + " / " + (trace.maxInvocations ?? 8) + " · d=" + (trace.maxDepthReached ?? 0) + "/" + (trace.maxDepth ?? 3);
      document.getElementById("mSecrets").textContent = trace.byokKeyIsolated ? "ZERO LEAKS VERIFIED" : "ALERT";

      const badgesEl = document.getElementById("traceBadges");
      badgesEl.innerHTML = "";
      for (const audit of trace.slyDataAudit || []) {
        for (const b of audit.blocked || []) {
          const span = document.createElement("span");
          span.className = "badge-fail";
          span.textContent = "BLOCKED: " + b.key;
          badgesEl.appendChild(span);
        }
        for (const f of audit.forwardedKeys || []) {
          const span = document.createElement("span");
          span.className = "badge-pass";
          span.textContent = "FORWARDED: " + f;
          badgesEl.appendChild(span);
        }
      }
      for (const rcpt of trace.actionReceipts || []) {
        const span = document.createElement("span");
        span.className = "pill amber";
        span.textContent = "Receipt: " + rcpt.receiptId;
        badgesEl.appendChild(span);
      }

      document.getElementById("traceJson").textContent = JSON.stringify(trace, null, 2);
    }

    async function handleRunPrompt(promptText) {
      const prompt = String(promptText || "").trim();
      if (!prompt || !runtime) return;
      const sendBtn = document.getElementById("sendBtn");
      sendBtn.disabled = true;

      appendMessage("user", new Date().toLocaleTimeString(), prompt);

      // Local private session sly_data containing canary secrets + optional target_region
      const region = document.getElementById("regionSelect").value;
      const savedRouter = loadSavedRouter();
      const slyData = {
        byok_api_key: savedRouter.apiKey || "sk-local-vault-canary-never-leaves-origin",
        internal_margin_secret: "MARGIN_TARGET_38_PCT_CONFIDENTIAL",
        target_region: region
      };

      const res = await runtime.run({
        prompt,
        slyData,
        requestOriginConsent: openConsentModal,
        confirmAction: openActionModal
      });

      if (res.ok) {
        appendMessage(
          "agent",
          res.trace.invocationsUsed + " hops · " + res.trace.contactedOrigins.length + " origin(s)",
          res.answer,
          res.evidence
        );
      } else {
        appendMessage("agent", "HALTED · " + res.code, res.error || (res.errors || []).join("; "));
      }
      if (res.trace) renderTrace(res.trace);
      sendBtn.disabled = false;
    }

    document.getElementById("sendBtn").addEventListener("click", () => {
      const input = document.getElementById("promptInput");
      const text = input.value;
      input.value = "";
      handleRunPrompt(text);
    });
    document.getElementById("promptInput").addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        document.getElementById("sendBtn").click();
      }
    });
    document.querySelectorAll(".scenario-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleRunPrompt(btn.dataset.prompt));
    });

    // 7/7 MVP Interoperability Suite Runner
    async function triggerInteropSuite() {
      activateTab("interop");
      const summaryEl = document.getElementById("interopSummary");
      const listEl = document.getElementById("interopList");
      summaryEl.textContent = "Running all 7 Worldwide Agentic Web MVP Profile 0.3 checks live...";
      listEl.innerHTML = "";

      const report = await runInteroperabilitySuite({
        origin,
        peerOrigin: "https://peer-fab.doaipm.com"
      });

      summaryEl.innerHTML = report.allPassed
        ? '<span class="badge-pass">ALL ' + report.passedCount + '/' + report.totalCount + ' MVP 0.3 CHECKS PASSED</span>'
        : '<span class="badge-fail">' + report.passedCount + '/' + report.totalCount + ' PASSED</span>';

      for (const chk of report.checks) {
        const div = document.createElement("div");
        div.className = "check-item";
        div.innerHTML =
          '<div class="check-hd"><span>' + escapeHtml(chk.title) + '</span>' +
          '<span class="' + (chk.passed ? "badge-pass" : "badge-fail") + '">' + (chk.passed ? "PASS" : "FAIL") + "</span></div>" +
          '<div class="check-detail">' + escapeHtml(JSON.stringify(chk.details, null, 2)) + "</div>";
        listEl.appendChild(div);
      }
    }
    document.getElementById("runInteropBtn").addEventListener("click", triggerInteropSuite);
    document.getElementById("quickInteropBtn").addEventListener("click", triggerInteropSuite);

    // BYOK Router Controls
    document.getElementById("byokPreset").addEventListener("change", (e) => {
      if (e.target.value !== "custom") {
        document.getElementById("byokBaseUrl").value = e.target.value;
      }
    });
    document.getElementById("saveByokBtn").addEventListener("click", () => {
      const cfg = {
        mode: document.getElementById("routerMode").value,
        baseUrl: document.getElementById("byokBaseUrl").value.trim() || "https://api.otari.ai/api/v1",
        model: document.getElementById("byokModel").value.trim() || "gpt-4o-mini",
        apiKey: document.getElementById("byokKey").value.trim()
      };
      localStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify(cfg));
      runtime?.setRouter(cfg);
      updateRouterPill(cfg);
      document.getElementById("byokStatus").textContent = "Saved locally in browser localStorage (never synced to server or peers).";
    });
    document.getElementById("clearByokBtn").addEventListener("click", () => {
      localStorage.removeItem(BYOK_STORAGE_KEY);
      document.getElementById("routerMode").value = "deterministic-local";
      document.getElementById("byokKey").value = "";
      const resetCfg = {
        mode: "deterministic-local",
        baseUrl: "https://api.otari.ai/api/v1",
        model: "gpt-4o-mini",
        apiKey: ""
      };
      runtime?.setRouter(resetCfg);
      updateRouterPill(resetCfg);
      document.getElementById("byokStatus").textContent = "BYOK key permanently deleted from browser localStorage.";
    });

    // Artifacts & MCP Tester
    const viewer = document.getElementById("artifactViewer");
    document.querySelectorAll(".artifact-view-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        viewer.textContent = "Fetching " + btn.dataset.url + "...";
        const r = await fetch(btn.dataset.url);
        viewer.textContent = JSON.stringify(await r.json(), null, 2);
      });
    });
    document.getElementById("saveLinkBtn").addEventListener("click", () => {
      const val = document.getElementById("localLinkOverride").value.trim();
      const map = loadLocalLinks();
      map.fab_quoter = val;
      localStorage.setItem(LOCAL_LINKS_STORAGE_KEY, JSON.stringify(map));
      runtime?.setLocalLinkOverride("fab_quoter", val);
      viewer.textContent = JSON.stringify({ mode: "browser-local", updatedLink: { fab_quoter: val } }, null, 2);
    });

    async function callMcpUi(method, params) {
      viewer.textContent = "POST /mcp (" + method + ")...";
      const res = await fetch("/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params })
      });
      viewer.textContent = JSON.stringify(await res.json(), null, 2);
    }
    document.getElementById("mcpListBtn").addEventListener("click", () => callMcpUi("tools/list", {}));
    document.getElementById("mcpCallDfmBtn").addEventListener("click", () =>
      callMcpUi("tools/call", {
        name: "audit_bom_dfm",
        arguments: { boardName: "OpenFab Sensor Carrier v2", layers: 6, minTraceMil: 3.5, bgaPitchMm: 0.5, qty: 500 }
      })
    );
    document.getElementById("mcpCallCompBtn").addEventListener("click", () =>
      callMcpUi("tools/call", {
        name: "check_compliance_policy",
        arguments: { region: "EU", standards: ["RoHS-3", "REACH-SVHC"], hasLeadSolder: false, wirelessModule: true }
      })
    );

    boot();
  </script>
</body>
</html>`;
}
