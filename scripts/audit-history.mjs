#!/usr/bin/env node
/**
 * THE SAME NUMBERS, EVERY TIME, KEPT.
 *
 * `npm run audit:history`          show the trend
 * `npm run audit:history -- --record`  take a reading and append it
 *
 * ---------------------------------------------------------------------------
 * WHY A FILE IN THE REPOSITORY RATHER THAN A DASHBOARD
 *
 * An owner who comes back in three months wants to know whether the site got
 * better or worse. Every tool that answers that lives behind somebody's login,
 * keeps ninety days of data, and goes away when the subscription does.
 *
 * `content/audit-history.json` is a plain file in their own repository. It is
 * committed with the site, it survives changing host, agency or analytics
 * vendor, and in five years it still opens. Git already timestamps every entry
 * independently of what the file says.
 *
 * ---------------------------------------------------------------------------
 * WHAT CAN AND CANNOT BE AUTOMATED, STATED PLAINLY
 *
 * This file records FOUR groups and only the first is fully automatic. Saying
 * which is which matters more than the numbers, because a report that implies
 * it is tracking rankings when it is not is worse than one that admits it.
 *
 * 1. LAB MEASUREMENTS — automatic, no account, no connection.
 *    Lighthouse's four scores, WCAG violations, contrast failures, structured
 *    data, meta tags, page count, word counts. Taken on demand against a
 *    running build. This is the bulk of it and it needs nothing from anybody.
 *
 * 2. REAL VISITORS — first party, no Google, but read from a dashboard.
 *    Vercel Analytics counts visits and Speed Insights reports Core Web Vitals
 *    from real phones, which is the number Google actually ranks on rather
 *    than a lab score. Both are on by default (site.config.ts → tracking) and
 *    both are cookieless. Reading them programmatically needs Vercel's API,
 *    which is a paid plan, so the report links to the dashboard instead of
 *    pretending to have the figures.
 *
 * 3. BEHAVIOUR — Microsoft Clarity. Free, unlimited, not Google. Heat maps,
 *    scroll depth and session recordings: the only thing here that answers
 *    "why did nobody fill the form in". Also a dashboard rather than an API.
 *
 * 4. SEARCH RANKINGS — and this is the one to be straight about.
 *
 *    There is no reliable, free, automatic way to track where a site ranks.
 *    Scraping Google's results is against their terms, breaks whenever the
 *    markup changes, is rate-limited by IP within a few queries, and returns a
 *    personalised, location-skewed answer that is not what anybody else sees.
 *    A scraper here would produce numbers that look authoritative and are not,
 *    which is the worst possible outcome for somebody making decisions on them.
 *
 *    The two honest routes:
 *
 *    · GOOGLE SEARCH CONSOLE. Free, and it is the owner's OWN data — actual
 *      impressions, clicks and average position for every query that found
 *      them. It is a one-time verification of the domain, not an analytics
 *      vendor taking their visitors. If rankings matter, this is the answer,
 *      and `npm run audit:history -- --record` will read it once somebody
 *      pastes the figures in or wires the API.
 *    · A paid rank API (DataForSEO, SerpApi and similar). Accurate, roughly
 *      $20-50 a month, and overkill for one site.
 *
 *    So the primary keyword is recorded here from the first day, and the
 *    position stays null until one of those is connected. A null is honest; a
 *    scraped number is not.
 * ---------------------------------------------------------------------------
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = resolve(ROOT, "content/audit-history.json");
const BASE = process.env.CHECK_BASE || "http://localhost:3000";
const RECORD = process.argv.includes("--record");

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

const load = () => {
  if (!existsSync(FILE)) return { keyword: null, readings: [] };
  try {
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch {
    console.error(c.red(`${FILE} is not valid JSON. Not touching it.`));
    process.exit(1);
  }
};

/**
 * THE SITE'S MAIN KEYWORD, worked out rather than asked for.
 *
 * The home page's `primaryKeyword` in `content/pages.ts` is the phrase the
 * whole site is pointed at — it came out of the market research and it is the
 * one worth watching. Falling back to what the business does plus where it is,
 * which is the same phrase a research pass would arrive at.
 */
function mainKeyword() {
  const pages = resolve(ROOT, "content/pages.ts");
  if (existsSync(pages)) {
    const src = readFileSync(pages, "utf8");
    const home = src.match(/"\/"\s*:\s*\{[\s\S]*?primaryKeyword:\s*"([^"]+)"/);
    if (home?.[1]) return home[1];
  }
  const cfg = resolve(ROOT, "site.config.ts");
  if (existsSync(cfg)) {
    const src = readFileSync(cfg, "utf8");
    const what = src.match(/\bwhat:\s*"([^"]+)"/)?.[1];
    const city = src.match(/\bcity:\s*"([^"]+)"/)?.[1];
    const state = src.match(/\bstate:\s*"([^"]+)"/)?.[1];
    if (what && city) return `${what.toLowerCase()} ${city}${state ? ` ${state}` : ""}`;
  }
  return null;
}

async function lighthouse(url, preset) {
  const out = join(mkdtempSync(join(tmpdir(), "lh-")), "r.json");
  const args = [
    "--yes", "lighthouse", url, "--quiet",
    "--chrome-flags=--headless=new --no-sandbox",
    "--only-categories=performance,accessibility,best-practices,seo",
    "--output=json", `--output-path=${out}`,
  ];
  if (preset === "desktop") args.push("--preset=desktop");
  const code = await new Promise((done) => {
    const p = spawn("npx", args, { stdio: "ignore", env: process.env });
    p.on("close", done);
    p.on("error", () => done(1));
  });
  if (code !== 0 || !existsSync(out)) return null;
  const r = JSON.parse(readFileSync(out, "utf8"));
  const g = (k) => {
    const v = r.categories?.[k]?.score;
    return v == null ? null : Math.round(v * 100);
  };
  return {
    performance: g("performance"),
    accessibility: g("accessibility"),
    bestPractices: g("best-practices"),
    seo: g("seo"),
    lcpMs: r.audits?.["largest-contentful-paint"]?.numericValue ?? null,
    cls: r.audits?.["cumulative-layout-shift"]?.numericValue ?? null,
  };
}

/** Counts that describe the shape of the site, not its quality. */
async function shape() {
  try {
    const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
    const urls = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].length;
    const home = await (await fetch(BASE)).text();
    return {
      pagesInSitemap: urls,
      schemaBlocks: (home.match(/application\/ld\+json/g) ?? []).length,
    };
  } catch {
    return { pagesInSitemap: null, schemaBlocks: null };
  }
}

async function take() {
  console.log(c.dim("  taking a reading — Lighthouse twice, then the browser battery…"));
  const [mobile, desktop] = [await lighthouse(BASE, "mobile"), await lighthouse(BASE, "desktop")];

  let browser = { failures: null, warnings: null };
  try {
    const mod = await import(pathToFileURL(resolve(ROOT, "scripts/audit-browser.mjs")).href);
    const prev = process.env.AUDIT_ONLY;
    process.env.AUDIT_ONLY = "axe,contrast,overlap,focus,targets";
    const log = console.log;
    console.log = () => {};
    try {
      const r = await mod.run();
      browser = { failures: r.skipped ? null : r.failures, warnings: r.skipped ? null : r.warnings };
    } finally {
      console.log = log;
      if (prev === undefined) delete process.env.AUDIT_ONLY;
      else process.env.AUDIT_ONLY = prev;
    }
  } catch {
    /* no browser available; recorded as null rather than zero */
  }

  return {
    date: new Date().toISOString().slice(0, 10),
    lighthouseMobile: mobile,
    lighthouseDesktop: desktop,
    browserAudit: browser,
    shape: await shape(),
    /*
     * Left null on purpose. See the note at the top of this file: a scraped
     * search position is a number that looks authoritative and is not, and the
     * honest sources are Search Console or a paid API. Fill `position` in from
     * either and the trend below starts drawing it.
     */
    ranking: { keyword: mainKeyword(), position: null, source: null },
  };
}

/* ----------------------------------------------------------------- report */

const arrow = (older, newer, higherIsBetter = true) => {
  if (typeof older !== "number" || typeof newer !== "number") return c.dim("    ·");
  const d = newer - older;
  if (d === 0) return c.dim("   ──");
  const good = higherIsBetter ? d > 0 : d < 0;
  const s = `${d > 0 ? "+" : ""}${Math.round(d)}`;
  return good ? c.green(s.padStart(5)) : c.red(s.padStart(5));
};

function show(hist) {
  const r = hist.readings;
  if (!r.length) {
    console.log(
      `\n  ${c.dim("·")} No readings yet.\n\n    Take the first one with:\n` +
        `      ${c.bold("npm run audit:history -- --record")}\n\n` +
        c.dim("    Do it the day the site goes live. That reading is the baseline\n") +
        c.dim("    everything afterwards is compared against, and it cannot be\n") +
        c.dim("    recovered later.\n"),
    );
    return;
  }

  const first = r[0];
  const last = r[r.length - 1];
  const prev = r.length > 1 ? r[r.length - 2] : null;

  console.log(
    `\n  ${r.length} reading(s), ${first.date} to ${last.date}` +
      (hist.keyword ? `\n  main keyword: ${c.bold(hist.keyword)}` : ""),
  );

  console.log(
    "\n  " + "measure".padEnd(28) + "first".padEnd(9) + "previous".padEnd(11) +
      "now".padEnd(8) + "since last".padEnd(12) + "since first",
  );
  console.log("  " + "─".repeat(78));

  const line = (label, path, higherIsBetter = true, fmt = (v) => (v == null ? "—" : String(Math.round(v)))) => {
    const get = (reading) => path.split(".").reduce((o, k) => (o == null ? null : o[k]), reading);
    const f = get(first);
    const p = prev ? get(prev) : null;
    const n = get(last);
    console.log(
      "  " + label.padEnd(28) + fmt(f).padEnd(9) + (prev ? fmt(p) : c.dim("—")).padEnd(11) +
        fmt(n).padEnd(8) + arrow(p, n, higherIsBetter).padEnd(12) + arrow(f, n, higherIsBetter),
    );
  };

  console.log(c.bold("\n  Lighthouse, mobile"));
  line("Performance", "lighthouseMobile.performance");
  line("Accessibility", "lighthouseMobile.accessibility");
  line("Best practices", "lighthouseMobile.bestPractices");
  line("SEO", "lighthouseMobile.seo");
  line("LCP, milliseconds", "lighthouseMobile.lcpMs", false);

  console.log(c.bold("\n  Measured in a browser"));
  line("Accessibility failures", "browserAudit.failures", false);
  line("Warnings", "browserAudit.warnings", false);

  console.log(c.bold("\n  Shape of the site"));
  line("Pages in the sitemap", "shape.pagesInSitemap");

  const ranked = r.filter((x) => typeof x.ranking?.position === "number");
  console.log(c.bold("\n  Search position"));
  if (ranked.length) {
    line("Position for the main keyword", "ranking.position", false);
    console.log(c.dim(`  source: ${last.ranking.source ?? "unrecorded"}`));
  } else {
    console.log(
      c.dim(
        "  Not tracked. There is no reliable free way to measure this — see the note\n" +
          "  at the top of scripts/audit-history.mjs. The two honest routes are Google\n" +
          "  Search Console, which is free and is your own data, or a paid rank API.\n" +
          "  Until one is connected this stays empty rather than guessed.",
      ),
    );
  }

  /* --------------------------------------------------------- what to do next */

  console.log(c.bold("\n  What this suggests"));
  const todo = [];
  const lm = last.lighthouseMobile ?? {};
  if (typeof lm.accessibility === "number" && lm.accessibility < 100)
    todo.push(`accessibility is ${lm.accessibility} on mobile — run \`npm run audit:browser\` for the specific failures`);
  if (typeof last.browserAudit?.failures === "number" && last.browserAudit.failures > 0)
    todo.push(`${last.browserAudit.failures} accessibility or contrast failure(s) — \`npm run audit:browser\` lists them`);
  if (typeof lm.performance === "number" && lm.performance < 85)
    todo.push(`mobile performance is ${lm.performance} — usually one oversized image; \`npm run gate\` layer 17 names it`);
  if (prev) {
    for (const [k, label] of [
      ["performance", "mobile performance"],
      ["accessibility", "accessibility"],
      ["seo", "SEO"],
    ]) {
      const a = prev.lighthouseMobile?.[k];
      const b = lm[k];
      if (typeof a === "number" && typeof b === "number" && b < a - 2)
        todo.push(`${label} dropped ${a - b} points since ${prev.date} — something changed, and this is the file that says when`);
    }
  }
  if (!ranked.length && hist.keyword)
    todo.push(`connect Google Search Console to start recording where you rank for "${hist.keyword}" — free, and it is your own data`);
  if (!todo.length) todo.push("nothing. Everything measured here is at or above its bar.");
  for (const t of todo) console.log(`    · ${t}`);

  console.log(
    c.dim(
      "\n  Visits, referrers and real-visitor Core Web Vitals are in your Vercel\n" +
        "  dashboard — first party, cookieless, no Google. Heat maps and session\n" +
        "  recordings are in Microsoft Clarity. Neither has a free API, so they are\n" +
        "  a link rather than a column here.\n",
    ),
  );
}

/* ------------------------------------------------------------------- main */

const hist = load();
console.log(c.bold("\nHow this site has done over time\n") + "─".repeat(80));

if (RECORD) {
  try {
    const r = await fetch(BASE, { redirect: "follow" });
    if (r.status !== 200) throw new Error(String(r.status));
  } catch {
    console.error(
      c.red(`\n  Nothing is running at ${BASE}.`) +
        "\n  Start the site, or run this through `npm run gate`, which starts one.\n",
    );
    process.exit(1);
  }
  const reading = await take();
  hist.keyword = reading.ranking.keyword ?? hist.keyword ?? null;
  hist.readings = [...(hist.readings ?? []), reading].slice(-200);
  writeFileSync(FILE, `${JSON.stringify(hist, null, 2)}\n`);
  console.log(c.green(`\n  Recorded ${reading.date}. ${hist.readings.length} reading(s) kept.`));
  console.log(c.dim("  Commit content/audit-history.json so the history travels with the site."));
}

show(hist);
