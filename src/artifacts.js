export const HUB_ORIGIN = "https://agentweb.doaipm.com";
export const PEER_FAB_ORIGIN = "https://peer-fab.doaipm.com";
export const UNTRUSTED_PEER_ORIGIN = "https://untrusted-peer.example";

export const AGENT_MANIFEST = {
  profile: "worldwide-agentic-web-mvp/0.3",
  brand: {
    name: "OpenFab Mesh",
    tagline: "Open Agentic Hardware & Supply-Chain Hub",
    origin: HUB_ORIGIN,
    theme: "slate-cyan-emerald"
  },
  networks: [
    {
      name: "openfab_hub",
      front_man: "openfab_concierge",
      hocon: "./openfab_hub.network.json",
      description:
        "Browser-local multi-agent hardware engineering hub performing PCB DFM audits, RoHS/REACH/export compliance arbitration, confirmation-gated BOM lot reservations, and cross-origin SMT fabrication quoting via linked peer agents.",
      tags: [
        "hardware",
        "dfm",
        "supply-chain",
        "bom",
        "compliance",
        "open-agentic-web",
        "oaw-mvp-0.3"
      ],
      sample_queries: [
        "Run a DFM & EU RoHS compliance audit on a 6-layer ENIG controller board (3.5 mil trace, 0.5mm BGA, 500 units)",
        "Get a cross-origin PCB/SMT lead-time and volume quote from ApexFab for 500x 6-layer boards shipping to EU",
        "Reserve BOM lot SKU-STM32H7-R2 (500 units) at warehouse HGH-02 with target unit price $6.40",
        "Attempt to compose with denied origin https://untrusted-peer.example to verify fail-closed peer policy"
      ]
    }
  ],
  llm_router: {
    base_url: "https://api.otari.ai/api/v1",
    mock: false,
    byok_router: "https://api.otari.ai/api/v1"
  },
  allowed_peers: [PEER_FAB_ORIGIN],
  peer_policy: {
    mode: "closed",
    deny_origins: [UNTRUSTED_PEER_ORIGIN],
    note: "Closed allowlist policy: browser-local cross-origin composition is allowed only for origins in allowed_peers after explicit interactive user origin consent. Denied origins always fail closed."
  },
  agent_mcp: {
    protocol: "nsdeploy-agent-mcp/v1",
    network: "openfab_hub",
    front_man: "openfab_concierge",
    available: true,
    endpoint: "/mcp"
  },
  linking: {
    protocol: "nsdeploy-link/v1",
    exports: [
      {
        name: "openfab_hub",
        front_man: "openfab_concierge",
        network: "./openfab_hub.network.json",
        url: `${HUB_ORIGIN}/openfab_hub.network.json`,
        description: "OpenFab Mesh DFM, compliance, and supply-chain concierge network"
      }
    ],
    imports: [
      {
        alias: "fab_quoter",
        url: `${PEER_FAB_ORIGIN}/fab_quoter`
      }
    ],
    link_updates: {
      mode: "browser-local"
    }
  },
  actions: {
    version: 1,
    agentTools: ["audit_bom_dfm", "check_compliance_policy", "reserve_bom_lot"]
  }
};

export const OPENFAB_NETWORK = {
  metadata: {
    schema: "neuro-san/0.3",
    network_name: "openfab_hub",
    version: "1.0.0",
    origin: HUB_ORIGIN,
    description:
      "OpenFab Mesh multi-agent hardware engineering & supply-chain network with strict default-deny sly_data boundary controls and cross-origin peer link to fab_quoter.",
    tags: ["hardware", "pcb-dfm", "compliance", "bom-reservation", "cross-origin-peer"],
    sly_data_policy: {
      default: "deny",
      allowed_peer_keys: ["target_region"],
      blocked_secret_keys: ["byok_api_key", "internal_margin_secret"]
    }
  },
  commondefs: {
    replacement_strings: {
      quality_standard: "IPC-A-610 Class 2 / IPC-2221B"
    }
  },
  tools: [
    {
      name: "openfab_concierge",
      role: "front_man",
      function: {
        description:
          "Front-man orchestrator for OpenFab Mesh. Routes hardware requests across local specialists (bom_dfm_auditor, compliance_arbiter), registered site actions, and the cross-origin peer fab_quoter.",
        parameters: {
          type: "object",
          properties: {
            inquiry: {
              type: "string",
              description: "Engineering audit, compliance check, fabrication quote, or BOM lot reservation request."
            }
          },
          required: ["inquiry"]
        }
      },
      instructions:
        "You are openfab_concierge, the front_man for OpenFab Mesh. Delegate manufacturability checks to bom_dfm_auditor, regulatory policy checks to compliance_arbiter, and PCB/SMT volume quoting to the linked peer fab_quoter (requiring explicit user origin consent). Gate any write action (reserve_bom_lot) behind explicit user confirmation. Enforce default-deny on sly_data: never forward byok_api_key or internal_margin_secret across origins.",
      tools: ["bom_dfm_auditor", "compliance_arbiter", "fab_quoter"],
      actions: ["audit_bom_dfm", "check_compliance_policy", "reserve_bom_lot"],
      allow: {
        to_downstream: {
          sly_data: ["target_region"]
        }
      }
    },
    {
      name: "bom_dfm_auditor",
      role: "specialist",
      function: {
        description:
          "Evaluates PCB layer stackup, trace/space geometry, fine-pitch BGA risk, solder finish, and expected SMT first-pass yield via the registered read action audit_bom_dfm.",
        parameters: {
          type: "object",
          properties: {
            boardName: { type: "string" },
            layers: { type: "integer", minimum: 2, maximum: 24 },
            minTraceMil: { type: "number", minimum: 2, maximum: 20 },
            bgaPitchMm: { type: "number", minimum: 0.3, maximum: 1.5 },
            qty: { type: "integer", minimum: 1, maximum: 1000000 }
          },
          required: ["boardName", "layers", "minTraceMil", "qty"]
        }
      },
      instructions:
        "Execute audit_bom_dfm against IPC-2221B/IPC-A-610 rules. Report DFM score, fine-pitch risks, via-in-pad requirements, and concrete manufacturability recommendations.",
      tools: [],
      actions: ["audit_bom_dfm"],
      allow: {
        to_downstream: {
          sly_data: []
        }
      }
    },
    {
      name: "compliance_arbiter",
      role: "specialist",
      function: {
        description:
          "Verifies EU RoHS-3, REACH SVHC, FCC/CE wireless readiness, and gates warehouse BOM lot reservations through confirmation-protected reserve_bom_lot.",
        parameters: {
          type: "object",
          properties: {
            region: { type: "string", enum: ["EU", "US", "APAC", "GLOBAL"] },
            standards: { type: "array", items: { type: "string" } },
            hasLeadSolder: { type: "boolean" },
            wirelessModule: { type: "boolean" }
          },
          required: ["region", "standards", "hasLeadSolder"]
        }
      },
      instructions:
        "Execute check_compliance_policy for regulatory verification. Only invoke reserve_bom_lot after explicit interactive user confirmation showing origin, action name, and validated arguments.",
      tools: [],
      actions: ["check_compliance_policy", "reserve_bom_lot"],
      allow: {
        to_downstream: {
          sly_data: []
        }
      }
    },
    {
      name: "fab_quoter",
      role: "external_peer_link",
      external_link: "fab_quoter",
      origin_hint: PEER_FAB_ORIGIN,
      function: {
        description:
          "Cross-origin peer agent (ApexFab Open Peer Quoter at peer-fab.doaipm.com) providing independent bare PCB + SMT volume tier pricing and regional lead-time schedules.",
        parameters: {
          type: "object",
          properties: {
            inquiry: { type: "string" },
            layers: { type: "integer", minimum: 2, maximum: 24 },
            qty: { type: "integer", minimum: 1, maximum: 1000000 },
            hasFineBga: { type: "boolean" }
          },
          required: ["inquiry"]
        }
      },
      allow: {
        to_downstream: {
          sly_data: ["target_region"]
        }
      }
    }
  ]
};

export const LINKS_JSON = {
  version: 1,
  networks: {
    openfab_hub: {
      fab_quoter: `${PEER_FAB_ORIGIN}/fab_quoter`
    }
  }
};

export const AGENT_CARD = {
  protocolVersion: "0.3",
  name: "OpenFab Mesh — Open Agentic Hardware & Supply-Chain Hub",
  description:
    "Worldwide Agentic Web MVP Profile 0.3 reference implementation demonstrating browser-local multi-agent orchestration, strict peer origin consent, default-deny sly_data isolation, BYOK inference, confirmation-gated site actions, and public MCP JSON-RPC 2.0 interoperability.",
  url: HUB_ORIGIN,
  manifestUrl: `${HUB_ORIGIN}/agent-manifest.json`,
  mcpEndpoint: `${HUB_ORIGIN}/mcp`,
  provider: {
    organization: "OpenFab Mesh (DO AI PM)",
    url: HUB_ORIGIN
  },
  capabilities: {
    browserLocalRuntime: true,
    crossOriginPeerComposition: true,
    explicitOriginConsent: true,
    slyDataDefaultDeny: true,
    byokRouterIsolation: true,
    confirmationGatedWriteActions: true,
    mcpJsonRpc: true
  },
  skills: [
    {
      id: "audit_bom_dfm",
      name: "PCB & BOM DFM Auditor",
      description: "Read-only IPC-2221B/IPC-A-610 manufacturability scoring and risk audit.",
      tags: ["hardware", "pcb", "dfm"]
    },
    {
      id: "check_compliance_policy",
      name: "Regulatory & Export Compliance Arbiter",
      description: "Read-only RoHS-3, REACH SVHC, and wireless CE/FCC compliance checks.",
      tags: ["compliance", "rohs", "reach"]
    },
    {
      id: "reserve_bom_lot",
      name: "Confirmation-Gated BOM Lot Reservation",
      description: "Write action protected by explicit interactive user confirmation and signed Action Receipt.",
      tags: ["supply-chain", "write-action", "receipt"]
    },
    {
      id: "fab_quoter",
      name: "Linked Cross-Origin Peer Quoter",
      description: "Delegates SMT/PCB volume pricing to peer-fab.doaipm.com after explicit origin consent.",
      tags: ["cross-origin", "peer", "smt"]
    }
  ]
};
