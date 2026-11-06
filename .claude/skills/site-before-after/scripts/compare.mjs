#!/usr/bin/env node
/**
 * THE BEFORE AND THE AFTER, SIDE BY SIDE.
 *
 * `website-health` writes a full report every time it runs. Two of those is
 * not a comparison: they are two 70KB pages nobody reads twice, and the
 * question an owner actually asks is "is my new site better than my old one,
 * and by how much". This answers that in one screen.
 *
 *   node .claude/skills/site-before-after/scripts/compare.mjs
 *
 * It reads the newest report in content/website-health/before and the newest
 * in content/website-health/after. The before one is taken during setup, while
 * the old site still exists, because once the domain points at the new site
 * the old one is gone and with it any way of showing what they moved up from.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: average the two, or invent a single
 * "improvement" number. A site can gain fifteen points of speed and lose a
 * compliance check, and rolling that into one figure hides the thing that
 * matters. Categories are shown individually, and anything that got WORSE is
 * printed first, because that is the part somebody needs to act on.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DIR = join(ROOT, "content", "website-health");

/** The newest report under content/website-health/<phase>, or null. */
function newestReport(phase) {
  const base = join(DIR, phase);
  if (!existsSync(base)) return null;
  // Each run writes its own <host>-<date>-<time> folder, so the names sort
  // chronologically on their own.
  const runs = readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const run of runs.reverse()) {
    const dir = join(base, run);
    const json = readdirSync(dir).find((f) => f.endsWith(".json"));
    if (json) {
      try {
        return { run, data: JSON.parse(readFileSync(join(dir, json), "utf8")) };
      } catch {
        /* a half-written report: try the one before it */
      }
    }
  }
  return null;
}

function categories(report) {
  const out = new Map();
  for (const c of report.data.categories || []) {
    if (typeof c.score === "number") out.set(c.name, c.score);
  }
  return out;
}

/** Checks that are failing, by name. */
function failing(report) {
  return new Set(
    (report.data.checks || [])
      .filter((c) => String(c.status).toLowerCase() === "fail")
      .map((c) => c.name)
      .filter(Boolean)
  );
}

const before = newestReport("before");
const after = newestReport("after");

console.log("");
if (!before && !after) {
  console.log("  There is no reading to compare yet.\n");
  console.log("  The BEFORE one is taken during setup, while their old site still");
  console.log("  exists. Once the domain moves, that chance is gone for good.\n");
  console.log("    bash .claude/skills/website-health/scripts/run.sh <their-old-site> \\");
  console.log("      --out-dir content/website-health/before --open\n");
  process.exit(1);
}
if (!before) {
  console.log("  There is an AFTER reading but no BEFORE one.\n");
  console.log("  A baseline can only be taken while the old site is still up, so if");
  console.log("  the domain has already moved this comparison cannot be made. Say");
  console.log("  that plainly rather than implying it can be recovered.\n");
  process.exit(1);
}
if (!after) {
  console.log(`  BEFORE: ${before.run}   (overall ${before.data.overall} ${before.data.letter})`);
  console.log("\n  No AFTER reading yet. Take one against the finished site:\n");
  console.log("    bash .claude/skills/website-health/scripts/run.sh <their-site> \\");
  console.log("      --out-dir content/website-health/after --open\n");
  process.exit(1);
}

const b = before.data;
const a = after.data;
const delta = (a.overall ?? 0) - (b.overall ?? 0);
const sign = delta > 0 ? "+" : "";

console.log("  THE OLD SITE AND THE NEW ONE");
console.log(`    before   ${String(b.overall).padStart(3)} (${b.letter})   ${b.url}`);
console.log(`    after    ${String(a.overall).padStart(3)} (${a.letter})   ${a.url}`);
console.log(`    change   ${sign}${delta}\n`);

const bc = categories(before);
const ac = categories(after);
const rows = [...new Set([...bc.keys(), ...ac.keys()])].map((name) => ({
  name,
  from: bc.has(name) ? bc.get(name) : null,
  to: ac.has(name) ? ac.get(name) : null,
}));

const worse = rows.filter((r) => r.from !== null && r.to !== null && r.to < r.from);
const better = rows.filter((r) => r.from !== null && r.to !== null && r.to > r.from);
const same = rows.filter((r) => r.from !== null && r.to !== null && r.to === r.from);
const onlyAfter = rows.filter((r) => r.from === null);

const line = (r) => {
  const d = r.to - r.from;
  const s = d > 0 ? `+${d}` : `${d}`;
  return `    ${r.name.slice(0, 44).padEnd(46)} ${String(r.from).padStart(3)} -> ${String(r.to).padStart(3)}  ${s}`;
};

// Worse first. It is the only part that needs a decision.
if (worse.length) {
  console.log("  WENT BACKWARDS, look at these first");
  worse.forEach((r) => console.log(line(r)));
  console.log("");
}
if (better.length) {
  console.log("  IMPROVED");
  better.forEach((r) => console.log(line(r)));
  console.log("");
}
if (same.length) {
  console.log("  UNCHANGED");
  same.forEach((r) => console.log(`    ${r.name.slice(0, 44).padEnd(46)} ${String(r.from).padStart(3)}`));
  console.log("");
}
if (onlyAfter.length) {
  // Usually means the newer engine runs checks the older report never did, so
  // there is no honest "before" number to compare against.
  console.log("  ONLY IN THE AFTER READING (not measured before, so not a change)");
  onlyAfter.forEach((r) => console.log(`    ${r.name.slice(0, 44).padEnd(46)}  ${r.to}`));
  console.log("");
}

const fb = failing(before);
const fa = failing(after);
const fixed = [...fb].filter((n) => !fa.has(n));
const introduced = [...fa].filter((n) => !fb.has(n));
const stillFailing = [...fa].filter((n) => fb.has(n));

if (introduced.length) {
  console.log("  NEW FAILURES the old site did not have");
  introduced.forEach((n) => console.log(`    ${n}`));
  console.log("");
}
if (fixed.length) {
  console.log("  FIXED since the old site");
  fixed.forEach((n) => console.log(`    ${n}`));
  console.log("");
}
if (stillFailing.length) {
  console.log("  STILL FAILING on both");
  stillFailing.forEach((n) => console.log(`    ${n}`));
  console.log("");
}

console.log(`  Full reports:\n    before  content/website-health/before/${before.run}/report.html`);
console.log(`    after   content/website-health/after/${after.run}/report.html\n`);
