#!/usr/bin/env node
/**
 * The build Vercel runs (package.json "vercel-build" takes precedence over
 * "build" there). Production builds exactly as before. PREVIEW builds, the ones
 * every pull request gets, also run the content rules (launch-check --content)
 * against the freshly built site and fail the preview if the words break them.
 *
 * WHY ON VERCEL: the same rules run in .github/workflows/gate.yml, but a free
 * GitHub account runs out of Actions minutes, and from 2026-10-17 no check ran
 * on any pull request at all. Vercel builds every PR regardless, and its red
 * mark shows on the pull request, so the problem is seen when it is introduced
 * instead of on launch day.
 *
 * WHY NOT PRODUCTION: a production build that fails leaves the live site on its
 * previous version, which silently holds back everything else in that deploy,
 * including the daily article. Wording is caught at the pull request; nothing
 * that reaches main is blocked from going live.
 */
import { spawn } from "node:child_process";

const run = (cmd, args, opts = {}) =>
  new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: "inherit", ...opts });
    p.on("close", (code) => resolve(code ?? 1));
  });

const built = await run("npx", ["next", "build"]);
if (built !== 0) process.exit(built);
if (process.env.VERCEL_ENV !== "preview") process.exit(0);

const PORT = 3999;
const base = `http://127.0.0.1:${PORT}`;
const server = spawn("npx", ["next", "start", "-p", String(PORT)], { stdio: "ignore", detached: true });
let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try {
    up = (await fetch(base)).status < 500;
  } catch {}
  if (!up) await new Promise((r) => setTimeout(r, 1000));
}
let code = 1;
if (!up) {
  console.error("✗ the built site never answered, so its content could not be checked.");
} else {
  console.log("\nChecking the words on this preview against the content rules...\n");
  code = await run("node", ["scripts/launch-check.mjs", "--content", base]);
}
try {
  process.kill(-server.pid);
} catch {}
process.exit(code);
