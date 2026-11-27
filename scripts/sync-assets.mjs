import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AGENT_MANIFEST,
  OPENFAB_NETWORK,
  LINKS_JSON,
  AGENT_CARD
} from "../src/artifacts.js";
import {
  PEER_MANIFEST,
  FAB_QUOTER_NETWORK,
  PEER_LINKS,
  PEER_AGENT_CARD
} from "../../oaw-peer-fab/src/artifacts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hubRoot = path.resolve(__dirname, "..");
const peerRoot = path.resolve(hubRoot, "..", "oaw-peer-fab");

// 1. Sync src/runtime.js -> src/runtime-source.js for zero-dependency Cloudflare Worker serving
const runtimePath = path.join(hubRoot, "src", "runtime.js");
const runtimeSource = fs.readFileSync(runtimePath, "utf8");
const generatedModule = `// Auto-generated from src/runtime.js by scripts/sync-assets.mjs — do not edit manually.\nexport const RUNTIME_SOURCE = ${JSON.stringify(runtimeSource)};\n`;
fs.writeFileSync(path.join(hubRoot, "src", "runtime-source.js"), generatedModule, "utf8");

// 2. Write static inspectable mirrors of public MVP 0.3 JSON artifacts for both repos
function writeJson(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

writeJson(path.join(hubRoot, "public", "agent-manifest.json"), AGENT_MANIFEST);
writeJson(path.join(hubRoot, "public", "openfab_hub.network.json"), OPENFAB_NETWORK);
writeJson(path.join(hubRoot, "public", "links.json"), LINKS_JSON);
writeJson(path.join(hubRoot, "public", ".well-known", "agent-card.json"), AGENT_CARD);

writeJson(path.join(peerRoot, "public", "agent-manifest.json"), PEER_MANIFEST);
writeJson(path.join(peerRoot, "public", "fab_quoter.network.json"), FAB_QUOTER_NETWORK);
writeJson(path.join(peerRoot, "public", "links.json"), PEER_LINKS);
writeJson(path.join(peerRoot, "public", ".well-known", "agent-card.json"), PEER_AGENT_CARD);

console.log("Synced runtime-source.js and static public/*.json artifacts for both sites.");
