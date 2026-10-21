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

/**
 * Refuse to run if something is already on this port.
 *
 * This is not tidiness, it is the worst failure this script can have. When the
 * port is taken, `next dev` does not fail — it quietly starts on the next port
 * up. But everything below still fetches THIS port, so the entire checklist gets
 * graded against whatever stranger's site is already running, and reports their
 * problems as yours.
 *
 * Seen in the field: a gate run reported 1,915 problems and a `[YOURDOMAIN]`
 * placeholder belonging to an entirely different project that happened to hold
 * 3000. Nothing warned. It is the exact failure this project keeps writing rules
 * about — confidently wrong, and invisible.
 */
async function portIsBusy() {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 1500);
    await fetch(BASE, { signal: c.signal });
    clearTimeout(t);
    return true;
  } catch {
    return false;
  }
}

if (await portIsBusy()) {
  console.log(
    `\n✗ Something is already running on port ${PORT}, so this check was not run.\n\n` +
      `  If it is left over from earlier, close it and try again.\n` +
      `  If it is another website, run this instead:  PORT=3001 npm run gate\n\n` +
      `  Why this stops rather than carries on: your site would have started on a\n` +
      `  different port, and every check below would have graded the other site\n` +
      `  instead of yours — and told you its problems were yours.\n`
  );
  process.exit(1);
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

/**
 * "Will it still build?" runs first, and it is here because of a real failure.
 *
 * An engine update added code reading a `site.config.ts` key that older sites
 * do not have. Every check below passed — because all three test a running dev
 * server, and **a dev server does not typecheck**. The agent's site worked
 * perfectly right up until they tried to publish it, at which point the Vercel
 * build failed on a file they had never opened.
 *
 * A typecheck is the cheapest thing that catches that whole class, so it goes
 * before the checks that need a server.
 */
const CHECKS = [
  { label: "Will it still build?", cmd: "npx", args: ["tsc", "--noEmit"] },
  { label: "Does the site work?", script: "smoke" },
  { label: "Is the structured data valid?", script: "validate:schema" },
  { label: "Is it ready to go live?", script: "launch:check" },
  /*
   * THE HALF OF THE GATE THAT NEEDS A REAL BROWSER.
   *
   * Everything above reads HTML. That is blind by construction to anything
   * which only exists after CSS is applied and the page is laid out — and the
   * two worst defects ever found in the sibling seed were exactly that kind:
   * section headings rendering at 1.02:1 in dark mode, and a breadcrumb trail
   * printed on top of the logo on every desktop page. Perfect markup in both
   * cases, found by a human looking at a screenshot.
   *
   * So the gate opens a browser: axe-core at two widths in both colour
   * schemes, contrast measured against what is actually painted, elements
   * covering each other, focus rings, and tap targets at phone width.
   *
   * IT DOES NOT FAIL WHEN NO BROWSER IS INSTALLED, deliberately. This command
   * is run by estate agents on their own laptops, and failing their gate over
   * a missing binary teaches them the gate is unreliable — which costs more
   * than the check gains. It says plainly that it did not run. CI runs it
   * always, where a browser is guaranteed.
   */
  { label: "Does it hold up in a real browser?", script: "audit:browser" },
];

let failed = 0;
for (const check of CHECKS) {
  console.log(`\n─── ${check.label} ───`);
  const code = check.script
    ? await run("npm", ["run", "--silent", check.script, "--", BASE])
    : await run(check.cmd, check.args);
  if (code !== 0) {
    failed++;
    if (!check.script) {
      console.log(
        "\n  That is a code error, not a content one — usually after an engine update\n" +
          "  that expects something your site.config.ts does not have yet.\n" +
          "  Your live site is unaffected until you publish. Ask Claude to fix it.\n"
      );
    }
  }
}

stop();
console.log("");
if (failed) {
  console.log(
    `Not ready yet — ${failed} of ${CHECKS.length} checks still have things to fix.\n` +
      `That is normal until the site is finished. Ask Claude to keep going.\n`
  );
  process.exit(1);
}
console.log(`✓ All ${CHECKS.length} checks passed. This site is ready to go live.\n`);
console.log("Two things the gate still cannot do. It cannot tell you whether the");
console.log("writing is any good, and it cannot tell you whether this site beats");
console.log("the one the agent already had. For that:\n");
console.log("  npm run audit:compare              their old site against this one");
console.log("  npm run audit:history -- --record  keep today's numbers\n");
