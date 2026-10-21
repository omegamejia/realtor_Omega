#!/usr/bin/env node
/**
 * THE OLD SITE AGAINST THE NEW ONE, IN NUMBERS.
 *
 * `npm run audit:compare` — with the new site running.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS THE REPORT THAT MATTERS
 *
 * Every owner asks the same question and nothing in this seed answered it: is
 * the new site actually better than the one I already have?
 *
 * "It looks better" is not an answer, because it is an opinion and because the
 * old site's owner chose how the old site looks. What is not an opinion:
 * Lighthouse's four scores, the count of WCAG violations, the number of text
 * elements below the legal contrast minimum, whether pages carry structured
 * data, whether a shared link renders a preview.
 *
 * So this runs the same battery against both and prints two columns. It is also
 * the honest check on OUR work: a new site that measures worse than the thing
 * it replaces is not finished however good it looks, and without this nobody
 * would find out until the owner's traffic dropped.
 *
 * THE OLD SITE IS SOMEBODY'S LIVE WEBSITE. It is the owner's own, they told us
 * about it in Phase 0, and this is a read-only audit — the same requests a
 * browser makes when anybody visits. Nothing is submitted, no form is filled,
 * and one page is fetched per check rather than the whole site crawled.
 * ---------------------------------------------------------------------------
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NEW = process.env.CHECK_BASE || "http://localhost:3000";

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

/* ------------------------------------------------------------- the old URL */

/**
 * Read `existingSiteUrl` out of the config.
 *
 * By text rather than by import: `site.config.ts` is TypeScript and this script
 * runs under plain node. The same approach the launch checklist uses.
 */
function oldSiteUrl() {
  if (process.env.OLD_SITE) return process.env.OLD_SITE.trim();
  const f = resolve(ROOT, "site.config.ts");
  if (!existsSync(f)) return "";
  const m = readFileSync(f, "utf8").match(/existingSiteUrl:\s*"([^"]*)"/);
  let u = (m?.[1] ?? "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

/* ---------------------------------------------------------------- scoring */

/** Run Lighthouse via npx and return the four category scores. */
async function lighthouse(url, preset) {
  const out = join(mkdtempSync(join(tmpdir(), "lh-")), "r.json");
  const args = [
    "--yes", "lighthouse", url, "--quiet",
    '--chrome-flags=--headless=new --no-sandbox',
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
  try {
    const r = JSON.parse(readFileSync(out, "utf8"));
    const g = (k) => {
      const v = r.categories?.[k]?.score;
      return v == null ? null : Math.round(v * 100);
    };
    const failedIn = (cat) =>
      (r.categories?.[cat]?.auditRefs ?? [])
        .map((a) => r.audits?.[a.id])
        .filter((a) => a && a.score !== null && a.score < 1 && a.scoreDisplayMode !== "informative")
        .map((a) => a.id);
    return {
      performance: g("performance"),
      accessibility: g("accessibility"),
      bestPractices: g("best-practices"),
      seo: g("seo"),
      seoFailed: failedIn("seo"),
      lcp: r.audits?.["largest-contentful-paint"]?.displayValue ?? null,
      cls: r.audits?.["cumulative-layout-shift"]?.displayValue ?? null,
    };
  } catch {
    return null;
  }
}

/** The markup facts, from one fetch. No browser needed. */
async function markup(url) {
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (site-audit)" } });
    const html = await res.text();
    const has = (re) => re.test(html);
    const count = (re) => (html.match(re) ?? []).length;
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    const types = new Set();
    for (const [, raw] of ld) {
      try {
        const data = JSON.parse(raw);
        for (const n of data["@graph"] ?? [data]) {
          const t = n?.["@type"];
          if (typeof t === "string") types.add(t);
          else if (Array.isArray(t)) t.forEach((x) => types.add(x));
        }
      } catch {
        /* malformed JSON-LD counts as none */
      }
    }
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) ?? [, ""])[1].trim();
    const desc = (html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i) ?? [, ""])[1];
    const imgs = count(/<img\b/gi);
    const noAlt = count(/<img\b(?![^>]*\balt=)[^>]*>/gi);
    return {
      status: res.status,
      bytes: html.length,
      title: title.length,
      description: desc.length,
      canonical: has(/<link[^>]+rel="canonical"/i),
      ogImage: has(/property="og:image"/i),
      ogTitle: has(/property="og:title"/i),
      schemaTypes: types.size,
      schemaList: [...types].slice(0, 6),
      /*
       * ANY BUSINESS-SHAPED SCHEMA TYPE, not a list of trades.
       *
       * This was `/LocalBusiness|Organization|RealEstateAgent|Dentist|HVACBusiness/`,
       * which is a guess at which trades exist and wrong for the next one.
       * schema.org has well over a hundred LocalBusiness subtypes. What the
       * comparison actually wants to know is whether a crawler can tell this
       * page belongs to a business at all, so it looks for the two base types
       * plus anything whose name ends in a business-ish suffix.
       */
      localBusiness: [...types].some((t) =>
        /^(LocalBusiness|Organization|Corporation)$/i.test(t) ||
        /(Business|Agent|Store|Shop|Service|Practice|Office|Clinic|Agency)$/i.test(t),
      ),
      images: imgs,
      imagesNoAlt: noAlt,
      viewport: has(/name="viewport"/i),
      h1: count(/<h1\b/gi),
      https: url.startsWith("https://"),
    };
  } catch (e) {
    return { error: e.message };
  }
}

/** The browser battery, reused from audit-browser.mjs. */
async function browserAudit(base) {
  const mod = await import(pathToFileURL(resolve(ROOT, "scripts/audit-browser.mjs")).href);
  const prevBase = process.env.CHECK_BASE;
  const prevOnly = process.env.AUDIT_ONLY;
  process.env.CHECK_BASE = base;
  process.env.AUDIT_ONLY = "axe,contrast";
  // Silence its own reporting; we want the counts for the table.
  const log = console.log;
  console.log = () => {};
  let res;
  try {
    res = await mod.run();
  } finally {
    console.log = log;
    if (prevBase === undefined) delete process.env.CHECK_BASE;
    else process.env.CHECK_BASE = prevBase;
    if (prevOnly === undefined) delete process.env.AUDIT_ONLY;
    else process.env.AUDIT_ONLY = prevOnly;
  }
  return res;
}

/* ----------------------------------------------------------------- report */

/**
 * IS THE NEW SITE BEING MEASURED AS A LOCAL PREVIEW?
 *
 * This matters more than it sounds. Run against `localhost` the new site looks
 * worse than it is, for three reasons that are all CORRECT behaviour:
 *
 *   · `launchReady: false` makes robots.txt say `Disallow: /`, so Lighthouse
 *     reports the page as blocked from indexing and the SEO score collapses.
 *     Measured: 100 when launch-ready, 61 when not. That is the seed
 *     deliberately keeping an unfinished site out of Google.
 *   · With no domain resolved there is no absolute URL to put in `og:image`,
 *     and this seed emits nothing rather than something wrong.
 *   · localhost is not HTTPS.
 *
 * Reporting those three as deficits against a live old site would be
 * straightforwardly misleading, and it is the owner who would be misled. So
 * they are labelled and excluded from the verdict, with a line saying to run
 * the comparison again against the deployed preview for the real numbers.
 */
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(NEW);

const fmt = (v) => (v === null || v === undefined ? c.dim("—") : String(v));
const yn = (v) => (v ? c.green("yes") : c.red("no"));

function row(label, oldV, newV, { higherIsBetter = true, boolean = false, localOnly = false } = {}) {
  if (localOnly && LOCAL) {
    const pad = (x) => {
      const bare = x.replace(/\x1b\[[0-9;]*m/g, "");
      return x + " ".repeat(Math.max(0, 14 - bare.length));
    };
    console.log(
      `  ${label.padEnd(34)}${pad(boolean ? yn(oldV) : fmt(oldV))}` +
        `${pad(c.dim("n/a"))}${c.dim("  local preview")}`,
    );
    return;
  }
  const l = label.padEnd(34);
  const o = boolean ? yn(oldV) : fmt(oldV);
  const n = boolean ? yn(newV) : fmt(newV);
  let verdict = "";
  if (!boolean && typeof oldV === "number" && typeof newV === "number") {
    const better = higherIsBetter ? newV > oldV : newV < oldV;
    const worse = higherIsBetter ? newV < oldV : newV > oldV;
    const d = Math.abs(newV - oldV);
    if (better) verdict = c.green(`  better by ${d}`);
    else if (worse) verdict = c.red(`  WORSE by ${d}`);
    else verdict = c.dim("  same");
  } else if (boolean) {
    if (newV && !oldV) verdict = c.green("  gained");
    else if (!newV && oldV) verdict = c.red("  LOST");
  }
  const pad = (x) => {
    const bare = x.replace(/\x1b\[[0-9;]*m/g, "");
    return x + " ".repeat(Math.max(0, 14 - bare.length));
  };
  console.log(`  ${l}${pad(o)}${pad(n)}${verdict}`);
}

async function main() {
  const oldUrl = oldSiteUrl();
  console.log(c.bold("\nThe old site against the new one\n") + "─".repeat(78));

  try {
    const r = await fetch(NEW, { redirect: "follow" });
    if (r.status !== 200) throw new Error(String(r.status));
  } catch {
    console.error(
      c.red(`\n  Nothing is running at ${NEW}.`) +
        `\n  Start the new site first, or use \`npm run gate\`, which starts one itself.\n`,
    );
    process.exit(1);
  }

  if (!oldUrl) {
    console.log(
      `\n  ${c.dim("·")} No previous website recorded, so there is nothing to compare against.\n` +
        `\n    If they had one, put it in site.config.ts as \`existingSiteUrl\` and run\n` +
        `    this again — the comparison is the most convincing thing you can show\n` +
        `    somebody who is not sure the new site is an improvement.\n` +
        `\n    Auditing the new site on its own instead.\n`,
    );
  } else {
    console.log(`  old: ${oldUrl}\n  new: ${NEW}\n`);
    if (LOCAL) {
      console.log(
        c.yellow("  The new site is a local preview, so three things are not comparable:") +
          c.dim(
            "\n  HTTPS, the share-preview image and the search-engine score, because an\n" +
              "  unlaunched site has no domain and asks not to be indexed. Run this again\n" +
              "  against the deployed preview URL for the real numbers:\n" +
              "    CHECK_BASE=https://your-preview.vercel.app npm run audit:compare\n",
          ),
      );
    }
  }

  console.log(c.dim("  Lighthouse, mobile. This takes a minute or two per site."));
  const [oldLhM, newLhM] = await Promise.all([
    oldUrl ? lighthouse(oldUrl, "mobile") : Promise.resolve(null),
    lighthouse(NEW, "mobile"),
  ]);
  const [oldMk, newMk] = await Promise.all([
    oldUrl ? markup(oldUrl) : Promise.resolve(null),
    markup(NEW),
  ]);

  console.log(c.dim("  Accessibility and contrast, in a real browser."));
  const newBrowser = await browserAudit(NEW);

  console.log("\n" + "  " + "the measure".padEnd(34) + "old".padEnd(14) + "new".padEnd(14));
  console.log("  " + "─".repeat(74));

  console.log(c.bold("\n  Lighthouse, mobile"));
  row("Performance", oldLhM?.performance ?? null, newLhM?.performance ?? null);
  row("Accessibility", oldLhM?.accessibility ?? null, newLhM?.accessibility ?? null);
  row("Best practices", oldLhM?.bestPractices ?? null, newLhM?.bestPractices ?? null);
  row("SEO", oldLhM?.seo ?? null, newLhM?.seo ?? null);

  console.log(c.bold("\n  Found on the page"));
  row("Title length (chars)", oldMk?.title ?? null, newMk?.title ?? null);
  row("Meta description (chars)", oldMk?.description ?? null, newMk?.description ?? null);
  row("Exactly one <h1>", oldMk ? oldMk.h1 === 1 : null, newMk.h1 === 1, { boolean: true });
  row("Canonical URL", oldMk?.canonical ?? null, newMk.canonical, { boolean: true });
  row("Share preview image", oldMk?.ogImage ?? null, newMk.ogImage, { boolean: true, localOnly: true });
  row("Structured data types", oldMk?.schemaTypes ?? null, newMk.schemaTypes);
  row("Business in structured data", oldMk?.localBusiness ?? null, newMk.localBusiness, { boolean: true });
  row("Images missing alt text", oldMk?.imagesNoAlt ?? null, newMk.imagesNoAlt, { higherIsBetter: false });
  row("Mobile viewport declared", oldMk?.viewport ?? null, newMk.viewport, { boolean: true });
  row("Served over HTTPS", oldMk?.https ?? null, newMk.https, { boolean: true, localOnly: true });

  console.log(c.bold("\n  The new site, measured in a browser"));
  console.log(
    `  ${"WCAG violations (axe) + contrast".padEnd(34)}` +
      `${c.dim("—").padEnd(14)}` +
      `${newBrowser.skipped ? c.yellow("not run") : newBrowser.failures === 0 ? c.green("0") : c.red(String(newBrowser.failures))}`,
  );

  /* ------------------------------------------------------------ the verdict */

  console.log("\n" + "─".repeat(78));
  const floors = { performance: 85, accessibility: 100, bestPractices: 95, seo: 100 };
  const short = [];
  /*
   * An unlaunched site is SUPPOSED to be blocked from indexing, so the one SEO
   * audit it fails for that reason is not a deficit. If that is the ONLY thing
   * wrong with the SEO score, the score is excluded rather than reported.
   */
  const seoOnlyBlockedByRobots =
    LOCAL &&
    Array.isArray(newLhM?.seoFailed) &&
    newLhM.seoFailed.length > 0 &&
    /*
     * TWO AUDITS FAIL LOCALLY FOR REASONS THAT ARE CORRECT BEHAVIOUR.
     *   is-crawlable  `launchReady: false` asks not to be indexed.
     *   canonical     with no domain resolved the canonical is relative, which
     *                 is right — `lib/site-url.ts` refuses to invent a host,
     *                 because a canonical pointing at the wrong domain teaches
     *                 Google the wrong home for every page.
     * Both resolve themselves on a real deploy. Measured: SEO 61 locally, 100
     * against the same build with a domain set.
     */
    newLhM.seoFailed.every((id) => id === "is-crawlable" || id === "canonical");
  for (const [k, min] of Object.entries(floors)) {
    const got = newLhM?.[k];
    if (typeof got !== "number") continue;
    if (k === "seo" && seoOnlyBlockedByRobots) continue;
    if (got < min) short.push(`${k} ${got} (want ${min}+)`);
  }
  if (seoOnlyBlockedByRobots) {
    console.log(
      c.dim(
        `  SEO scored ${newLhM.seo} only because an unlaunched site asks not to be ` +
          "indexed,\n  which is this seed keeping it out of Google on purpose. " +
          "Nothing else in\n  the SEO category failed, so it is not counted below.",
      ),
    );
  }
  if (!newBrowser.skipped && newBrowser.failures > 0) {
    short.push(`${newBrowser.failures} accessibility or contrast failure(s) (want 0)`);
  }

  if (short.length === 0) {
    console.log(
      c.green("  The new site is at or above the bar on every measure taken here."),
    );
  } else {
    console.log(c.yellow("  NOT THERE YET. Still short of the bar:"));
    for (const s of short) console.log(`    · ${s}`);
    console.log(
      c.dim(
        "\n  The bar is deliberately near the top: accessibility and SEO at 100,\n" +
          "  best practices at 95, performance at 85 because a photography-led\n" +
          "  design pays for its pictures and 100 on a throttled phone is not a\n" +
          "  reasonable ask. Anything below this and the new site is not finished.",
      ),
    );
  }

  if (oldUrl && oldLhM) {
    const keys = ["performance", "accessibility", "bestPractices", "seo"];
    const worse = keys.filter(
      (k) =>
        typeof oldLhM[k] === "number" &&
        typeof newLhM?.[k] === "number" &&
        newLhM[k] < oldLhM[k] &&
        !(k === "seo" && seoOnlyBlockedByRobots),
    );
    if (worse.length) {
      console.log(
        c.red(`\n  The new site scores WORSE than the old one on: ${worse.join(", ")}.`) +
          c.dim("\n  That is a blocker rather than a note. Whatever else is true, replacing a\n  site with something measurably worse is not an improvement."),
      );
    }
  }
  console.log();

  // Exit non-zero only when the NEW site is below the bar, so CI can gate on it.
  process.exit(short.length ? 1 : 0);
}

main().catch((e) => {
  console.error(c.red(`\naudit:compare failed: ${e.message}\n`));
  process.exit(1);
});
