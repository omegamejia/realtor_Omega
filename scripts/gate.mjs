#!/usr/bin/env node
/**
 * ONE-COMMAND GATE.
 *
 * Every gate previously needed two terminals: `npm run dev` in one, the checks in
 * another. That is a small thing for a developer and a genuine wall for someone
 * who has never used a terminal — and it appears in every skill, the README, and
 * CI. This boots the server itself, runs everything, and tears it down.
 *
 *   npm run gate
 */
import { spawn } from "node:child_process";

const PORT = process.env.PORT || 3000;
const BASE = `http://localhost:${PORT}`;

const run = (cmd, args, opts = {}) =>
  new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: true, ...opts });
    p.on("close", (code) => resolve(code ?? 1));
  });

async function waitForServer(ms = 90_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(BASE);
      if (r.ok || r.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 700));
  }
  return false;
}

console.log("\nStarting your site so we can check it…\n");
const server = spawn("npm", ["run", "dev"], {
  shell: true,
  stdio: ["ignore", "ignore", "pipe"],
  env: { ...process.env, PORT: String(PORT) },
});
let serverErr = "";
server.stderr.on("data", (d) => (serverErr += d.toString()));

const stop = () => {
  try { process.kill(-server.pid, "SIGTERM"); } catch {}
  try { server.kill("SIGTERM"); } catch {}
};
process.on("exit", stop);
process.on("SIGINT", () => { stop(); process.exit(130); });

if (!(await waitForServer())) {
  console.error("✗ Could not start the site.\n");
  if (serverErr.trim()) console.error(serverErr.trim().split("\n").slice(-12).join("\n"));
  console.error(
    "\n  Most common causes:\n" +
      "    • Something else is already using this port — close it, or run: PORT=3001 npm run gate\n" +
      "    • Dependencies are missing — run: npm install\n" +
      "  More help: docs/TROUBLESHOOTING.md\n"
  );
  stop();
  process.exit(1);
}

let failed = 0;
for (const [label, script] of [
  ["Does the site work?", "smoke"],
  ["Is the structured data valid?", "validate:schema"],
  ["Is it ready to go live?", "launch:check"],
]) {
  console.log(`\n─── ${label} ───`);
  const code = await run("npm", ["run", "--silent", script, "--", BASE]);
  if (code !== 0) failed++;
}

stop();
console.log("");
if (failed) {
  console.log(
    `Not ready yet — ${failed} of 3 checks still have things to fix.\n` +
      `That is normal until the site is finished. Ask Claude to keep going.\n`
  );
  process.exit(1);
}
console.log("✓ All three checks passed. This site is ready to go live.\n");
