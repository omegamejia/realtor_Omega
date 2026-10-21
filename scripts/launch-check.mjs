#!/usr/bin/env node
/**
 * LAUNCH CHECK — the gate that stops filler/incorrect data from going live.
 *
 * A structurally-valid schema can still be full of filler ("placehold.co",
 * a .example email, a fake name, lorem ipsum). Google's validator will happily
 * pass all of it. This check exists precisely because "no schema errors" does
 * NOT mean "safe to publish."
 *
 * Three layers, because no single one is enough:
 *
 *   1. FILLER MARKERS (this script) — scans the RENDERED site for tell-tale
 *      placeholder/test tokens that must never reach a real user. Hard fail.
 *
 *   2. HUMAN SIGN-OFF (this script) — requires site.config `launchReady: true`,
 *      which a person only sets after reviewing every field. A machine can't
 *      know whether "1200 Test Plaza" is the agent's real address; only the
 *      agent can confirm. The flag encodes that confirmation.
 *
 *   3. INTAKE ECHO-BACK (the intake skill, not this script) — every collected
 *      field is read back to the agent for explicit confirmation before it's
 *      ever written. That's what catches realistic-but-WRONG data, which no
 *      pattern scan can detect.
 *
 * Usage:  node scripts/launch-check.mjs [baseUrl]
 * Exit 1 on any filler marker or if launchReady is not true.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fetchRoutes } from "./site-routes.mjs";

const BASE =
  process.argv[2] || process.env.SCHEMA_BASE_URL || "http://localhost:3000";

// Routes are discovered from the site's own sitemap, never hardcoded — so this
// gate always checks exactly the pages that exist. See scripts/site-routes.mjs.

// Tokens that must NEVER appear on a live client site. Case-insensitive.
// These catch KNOWN filler. They do NOT catch a plausible wrong value a human
// typed — that's what layers 2 and 3 are for.
const FILLER_MARKERS = [
  "placehold.co",
  "placeholder",
  "lorem ipsum",
  "example.com",
  ".example",
  "@example",
  "yourdomain",
  "fill in",
  "test-000000",
  "(555)",
  "555-01",
  "n/a",
  "tbd",
  "todo",
];

// Bracketed placeholders like [AGENT NAME], [CITY], [Describe this area...].
// Must START with an uppercase LETTER so it doesn't match Tailwind arbitrary
// classes like aspect-[4/5], [16/9], [var(--brand)], or [&_p] in the HTML.
const BRACKET_RE_G = /\[[A-Z][^\]\n]{0,80}\]/g;

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, "..", "site.config.ts");

let failures = 0;
const hits = [];
// Rendered <main> text per route, for the duplication pass.
const bodies = new Map();

// ---- Layer 2: human sign-off ----------------------------------------------
function checkLaunchReady() {
  let src;
  try {
    src = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    console.error("✗ cannot read site.config.ts");
    failures++;
    return;
  }
  // Match the actual field at the start of a line — NOT a substring anywhere in
  // the file, so an explanatory comment mentioning "launchReady: true" can't
  // trip the gate.
  if (/^\s*launchReady:\s*true\b/m.test(src)) {
    console.log("✓ launchReady: true (human sign-off present)");
  } else {
    console.error(
      "✗ launchReady is not true — no human has signed off that the data is real."
    );
    failures++;
  }
}

// ---- Layer 1: filler markers in the rendered site -------------------------
async function scanRoute(route) {
  let html;
  try {
    const res = await fetch(`${BASE}${route}`);
    if (!res.ok) {
      console.error(`✗ ${route} — HTTP ${res.status}`);
      failures++;
      return;
    }
    html = await res.text();
  } catch (err) {
    console.error(`✗ ${route} — fetch failed: ${err.message}`);
    failures++;
    return;
  }

  // Strip `placeholder="…"` ATTRIBUTES before scanning. They're legitimate form
  // hints ("Buying, selling, or just have a question…") and the literal word
  // `placeholder` in the attribute name would otherwise match the filler marker
  // on every page that has a form — a false positive no real site could clear.
  // The attribute's VALUE is still scanned (minus the attribute name), so filler
  // written inside a placeholder hint is still caught.
  const scanned = html.replace(/\splaceholder=(["'])([\s\S]*?)\1/gi, " $2 ");

  const lower = scanned.toLowerCase();
  const found = new Set();
  for (const marker of FILLER_MARKERS) {
    if (lower.includes(marker.toLowerCase())) found.add(marker);
  }
  // Bracket placeholders — match on original case.
  for (const b of scanned.match(BRACKET_RE_G) || []) found.add(b);

  // HARD RULE: interlinking. Every page must link home + contact and carry a
  // healthy number of internal links (funnel + crawlability).
  const hasHome = /href="\/"/.test(html);
  const hasContact = /href="\/contact"/.test(html);
  const internalLinks = (html.match(/href="\/[^"]*"/g) || []).length;
  const linkIssues = [];
  if (!hasHome) linkIssues.push("no home link");
  if (!hasContact) linkIssues.push("no /contact CTA link");
  if (internalLinks < 5)
    linkIssues.push(`only ${internalLinks} internal links (min 5)`);

  // Unsafe href schemes that could ship via a raw content `html` field.
  if (/href=["']\s*(javascript:|data:text\/html)/i.test(html)) {
    linkIssues.push("unsafe href scheme (javascript:/data:)");
  }

  // Keep the main-content text for the duplication check (chrome excluded, so
  // shared nav/footer doesn't inflate similarity).
  {
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const raw = main ? main[1] : html;
    bodies.set(
      route,
      raw
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    );
  }

  // Thin-content WARNING (not a hard fail) for the long-form pages that carry
  // the SEO weight — surfaces a page that passed structurally but is too short.
  if (/^\/(areas|buyers|sellers|blog)\//.test(route)) {
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ");
    const words = (text.match(/\b[\w'-]+\b/g) || []).length;
    if (words < 700)
      console.warn(
        `⚠ ${route} — thin content (~${words} words; long-form target is 900+)`
      );
  }

  if (found.size > 0) {
    [...found].forEach((f) => hits.push({ route, marker: f }));
    console.error(`✗ ${route} — filler found: ${[...found].join(", ")}`);
    failures += found.size;
  }
  if (linkIssues.length > 0) {
    console.error(`✗ ${route} — interlinking: ${linkIssues.join(", ")}`);
    failures += linkIssues.length;
  }
  if (found.size === 0 && linkIssues.length === 0) {
    console.log(`✓ ${route} — no filler, interlinking OK`);
  }
}

console.log(`\nLAUNCH CHECK against ${BASE}\n`);
checkLaunchReady();
console.log("");

let ROUTES;
try {
  ROUTES = await fetchRoutes(BASE);
} catch (err) {
  console.error(`✗ ${err.message}\n`);
  process.exit(1);
}
console.log(`Checking ${ROUTES.length} route(s) from the sitemap…\n`);

for (const route of ROUTES) {
  // eslint-disable-next-line no-await-in-loop
  await scanRoute(route);
}

// ---- Layer 4: near-duplicate content ---------------------------------------
// Location×service pages are generated from the same shape, which makes it easy
// to ship 25 pages that are the same text with the city swapped. Search engines
// treat that as duplicate content and can suppress the whole set — the exact
// opposite of what money pages are for. content-model.md forbids it
// ("never swap-and-repeat another city's text"); this enforces it.
function trigrams(text) {
  const w = text.toLowerCase().match(/[a-z']+/g) || [];
  const s = new Set();
  for (let i = 0; i + 2 < w.length; i++) s.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
  return s;
}
function overlap(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function checkDuplication() {
  const entries = [...bodies.entries()].map(([r, t]) => [r, trigrams(t)]);
  const WARN = 0.4;
  const FAIL = 0.55;
  const pairs = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const score = overlap(entries[i][1], entries[j][1]);
      if (score >= WARN) pairs.push({ a: entries[i][0], b: entries[j][0], score });
    }
  }
  if (pairs.length === 0) {
    console.log("✓ no near-duplicate pages");
    return;
  }
  pairs.sort((x, y) => y.score - x.score);
  const bad = pairs.filter((p) => p.score >= FAIL);
  for (const p of pairs.slice(0, 12)) {
    const pct = `${Math.round(p.score * 100)}%`;
    const line = `${p.a}  ↔  ${p.b}  (${pct} identical)`;
    if (p.score >= FAIL) console.error(`✗ near-duplicate: ${line}`);
    else console.warn(`⚠ similar: ${line}`);
  }
  if (pairs.length > 12) console.log(`  …and ${pairs.length - 12} more pair(s) over ${WARN * 100}%`);
  if (bad.length) {
    console.error(
      `✗ ${bad.length} page pair(s) are ${FAIL * 100}%+ identical — rewrite them with genuinely local detail, don't swap the city name.`
    );
    failures += bad.length;
  }
}

// ---- Layer 5: voice process actually ran ----------------------------------
// Krista's copy skills (copywriter / hooks) and content/brand-voice.md are what
// stop this site sounding like every other generated real-estate site. Nothing
// used to verify they were used, so they were easy to skip — which is exactly
// what happened. These checks are mechanical proxies: they cannot prove the
// 14-criteria rubric was run, but they catch the tell-tale signs that it wasn't.
function checkVoice() {
  const anyContent = bodies.size > 0;
  if (!anyContent) return;

  // 1. The voice file has to exist and be filled. Writing without it means
  //    inventing a voice, which this repo forbids.
  try {
    const voice = readFileSync(join(__dirname, "..", "content", "brand-voice.md"), "utf8");
    const unfilled = (voice.match(/\[[A-Z][^\]\n]{0,80}\]/g) || []).length;
    if (unfilled > 0) {
      console.error(
        `✗ content/brand-voice.md still has ${unfilled} unfilled placeholder(s) — run content-engine-builder before writing content.`
      );
      failures++;
    } else {
      console.log("✓ brand-voice.md is filled (voice defined)");
    }
  } catch {
    console.error("✗ content/brand-voice.md is missing — run content-engine-builder.");
    failures++;
  }

  // 2. Krista Humanizer pass, the mechanically checkable parts. Her voice rules
  //    ban em-dashes outright and flag copula avoidance as AI slop.
  const SLOP = [
    { re: /—/g, label: "em-dash (Krista's voice rules ban it — use a period or comma)" },
    { re: /\bserves as\b/gi, label: `"serves as" (copula avoidance, write "is")` },
    { re: /\bplays a (?:vital|key|crucial|pivotal) role\b/gi, label: `"plays a … role" (puffery)` },
    { re: /\bwhen it comes to\b/gi, label: `"when it comes to" (filler opener)` },
    { re: /\bin today's (?:market|world|landscape)\b/gi, label: `"in today's market" (generic filler)` },
  ];
  const offenders = new Map();
  for (const [route, text] of bodies) {
    for (const { re, label } of SLOP) {
      const n = (text.match(re) || []).length;
      if (n) {
        if (!offenders.has(label)) offenders.set(label, []);
        offenders.get(label).push(`${route} (${n})`);
      }
    }
  }
  if (offenders.size === 0) {
    console.log("✓ no Humanizer violations in page content");
    return;
  }
  for (const [label, routes] of offenders) {
    console.error(
      `✗ ${label} — ${routes.length} page(s): ${routes.slice(0, 4).join(", ")}${routes.length > 4 ? ` +${routes.length - 4} more` : ""}`
    );
    failures++;
  }
  console.error(
    "  Run the copy through `copywriter` (Humanizer pass) instead of writing it freehand."
  );
}

console.log("");
checkDuplication();
console.log("");
checkVoice();

console.log("");
if (failures > 0) {
  console.error(
    `✗ NOT READY TO LAUNCH — ${failures} issue(s). This site still contains filler or is unsigned. Do NOT publish to a real user.\n`
  );
  process.exit(1);
} else {
  console.log("✓ LAUNCH READY — no filler markers, human sign-off present.\n");
}
