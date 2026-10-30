import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const PORT = Number(process.env.PORT || 10000);
const ORIGIN = String(process.env.ALLOWED_ORIGIN || "").replace(/\/$/, "");
const ROOT = process.env.SESSION_ROOT || "/tmp/agentic-wallet-sessions";
const TTL_MS = 30 * 60 * 1000;
const ADDR = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const ALLOWED_TO = new Set(
  String(process.env.ALLOWED_TO || "0x245E6156B43253f76A8B201Ca8fdc82bDF9064e0,0x55d398326f99059fF775485246999027B3197955")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => ADDR.test(value))
);
const sessions = new Map();

function send(res, code, body) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function cors(req, res) {
  const origin = String(req.headers.origin || "").replace(/\/$/, "");
  if (!ORIGIN || origin !== ORIGIN) return false;
  res.setHeader("access-control-allow-origin", ORIGIN);
  res.setHeader("vary", "Origin");
  res.setHeader("access-control-allow-methods", "POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
  return true;
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 32_000) throw new Error("Request too large");
  }
  return JSON.parse(raw || "{}");
}

function jsonFromOutput(stdout) {
  const lines = String(stdout).trim().split(/\r?\n/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try { return JSON.parse(lines[index]); } catch {}
  }
  try { return JSON.parse(stdout); } catch { throw new Error("Wallet CLI did not return JSON"); }
}

function runBaw(profile, args, timeout = 45_000) {
  return new Promise((resolve, reject) => {
    const child = spawn("baw", [...args, "--json"], {
      env: { ...process.env, HOME: profile, XDG_CONFIG_HOME: path.join(profile, ".config") },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), timeout);
    child.stdout.on("data", (part) => { stdout += part; });
    child.stderr.on("data", (part) => { stderr += part; });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      try {
        const payload = jsonFromOutput(stdout);
        if (code !== 0 || payload.success === false) {
          const message = payload?.error?.message || stderr || "Binance Agentic Wallet request failed";
          reject(new Error(message));
          return;
        }
        resolve(payload.data ?? payload);
      } catch (error) {
        reject(code === 0 ? error : new Error(stderr || "Binance Agentic Wallet request failed"));
      }
    });
  });
}

async function newSession() {
  const id = randomUUID();
  const profile = path.join(ROOT, id);
  await mkdir(profile, { recursive: true });
  const session = { id, profile, expiresAt: Date.now() + TTL_MS };
  sessions.set(id, session);
  return session;
}

function getSession(id) {
  const session = sessions.get(String(id || ""));
  if (!session || session.expiresAt < Date.now()) throw new Error("Login session expired. Connect again.");
  session.expiresAt = Date.now() + TTL_MS;
  return session;
}

function findAddress(value) {
  if (typeof value === "string" && ADDR.test(value)) return value;
  if (!value || typeof value !== "object") return null;
  for (const item of Object.values(value)) {
    const found = findAddress(item);
    if (found) return found;
  }
  return null;
}

async function action(body) {
  const name = String(body.action || "");
  if (name === "login") {
    const session = await newSession();
    const result = await runBaw(session.profile, ["auth", "signin"]);
    return { sessionId: session.id, result };
  }

  const session = getSession(body.sessionId);
  if (name === "confirm") {
    if (!body.qrCodeId) throw new Error("Missing QR code ID");
    return { result: await runBaw(session.profile, ["auth", "verify", "--qrCodeId", String(body.qrCodeId)], 310_000) };
  }
  if (name === "wallet") {
    const result = await runBaw(session.profile, ["wallet", "address", "--binanceChainId", "56"]);
    const address = findAddress(result);
    if (!address) throw new Error("No BSC Agentic Wallet address was returned");
    return { address, result };
  }
  if (name === "preview") {
    const tx = body.tx || {};
    if (!ADDR.test(tx.from || "") || !ADDR.test(tx.to || "") || !ALLOWED_TO.has(String(tx.to).toLowerCase())) {
      throw new Error("Transaction destination is not allowed");
    }
    if (!/^0x[0-9a-fA-F]*$/.test(tx.inputData || "")) throw new Error("Invalid transaction data");
    const args = ["contract-call", "preview", "--binanceChainId", "56", "--from", tx.from, "--to", tx.to, "--inputData", tx.inputData];
    if (tx.value) args.push("--value", String(tx.value));
    if (tx.gasLimit) args.push("--gasLimit", String(tx.gasLimit));
    return { result: await runBaw(session.profile, args) };
  }
  if (name === "execute") {
    if (!body.requestId) throw new Error("Missing preview request ID");
    return { result: await runBaw(session.profile, ["contract-call", "execute", "--requestId", String(body.requestId)], 190_000) };
  }
  if (name === "logout") {
    try { await runBaw(session.profile, ["auth", "signout"]); } finally { sessions.delete(session.id); await rm(session.profile, { recursive: true, force: true }); }
    return { ok: true };
  }
  throw new Error("Unsupported action");
}

setInterval(() => {
  const now = Date.now();
  for (const session of sessions.values()) {
    if (session.expiresAt < now) {
      sessions.delete(session.id);
      rm(session.profile, { recursive: true, force: true }).catch(() => {});
    }
  }
}, 60_000).unref();

await mkdir(ROOT, { recursive: true });
createServer(async (req, res) => {
  if (req.url === "/health") return send(res, 200, { ok: true });
  if (!cors(req, res)) return send(res, 403, { error: "Origin is not allowed" });
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "POST" || req.url !== "/api/agent-wallet") return send(res, 404, { error: "Not found" });
  try {
    send(res, 200, await action(await readJson(req)));
  } catch (error) {
    send(res, 400, { error: error.message || "Request failed" });
  }
}).listen(PORT, () => console.log(`Agentic Wallet API listening on ${PORT}`));
