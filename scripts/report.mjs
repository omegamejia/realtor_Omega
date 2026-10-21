#!/usr/bin/env node
/**
 * The weekly numbers, collected. Not the report — the report is what Claude
 * writes from this, in the agent's language, with what to change next.
 *
 *   npm run report          collect and print, write content/reports/<date>.json
 *
 * THE ONE RULE HERE: a number that could not be fetched is recorded as
 * unavailable, with the reason. It is never zero. An agent told "0 leads last
 * week" when the truth is "the token expired" makes decisions off a lie, and
 * every source below can fail independently — a missing token, a rate limit, an
 * endpoint that moved.
 *
 * Sources, in order of how reliable they are:
 *
 * 1. **The site itself**, read from content/ — always available, never wrong.
 * 2. **Microsoft Clarity**, if CLARITY_API_TOKEN is set. Verified endpoint and
 *    limits: GET /export-data/api/v1/project-live-insights, 1-3 days only, ten
 *    requests per project per day, so this makes two.
 * 3. **GoHighLevel leads**, if GHL_API_TOKEN is set. The repo has verified
 *    contact create/read/delete; counting new contacts uses the search endpoint,
 *    which is NOT verified here — so a failure is reported as a failure, with the
 *    status code, for a human to look at.
 *
 * Google Analytics is deliberately absent: its API needs service-account
 * credentials that a non-technical agent will not set up, and pretending
 * otherwise would put a hole in every report. The reporting skill walks their
 * GA dashboard with them instead.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";

const OUT_DIR = "content/reports";
const CONFIG = "site.config.ts";
const DAYS = 7;

// Overridable ONLY so the failure paths can be exercised against a mock: a
// truncated page, a total that ignores the date filter, a 429, a 500. Those are
// the paths that decide whether a wrong number reaches an agent, and they cannot
// be tested against the real services. Never set these in normal use.
const GHL_BASE = process.env.GHL_API_BASE || "https://services.leadconnectorhq.com";
const CLARITY_BASE = process.env.CLARITY_API_BASE || "https://www.clarity.ms";

const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const weekAgo = new Date(today.getTime() - DAYS * 24 * 60 * 60 * 1000);

/** Values out of site.config.ts. Read as text on purpose: this script runs in a
 *  bare workflow with no TypeScript and no build step. */
function configValue(src, key) {
  return (src.match(new RegExp(`${key}:\\s*"([^"]*)"`)) || [])[1] || "";
}

function countMatches(file, re) {
  try {
    return (readFileSync(file, "utf8").match(re) || []).length;
  } catch {
    return 0;
  }
}

/**
 * How many pages have real content rather than the scaffold.
 *
 * Two shapes exist in the wild and both are correct. A seed-shaped site keys
 * every page inside content/pages.ts. A site that outgrew one file — Krista's
 * did — turns pages.ts into a handful of imports and keys the pages in
 * content/page-content/*.ts instead.
 *
 * Counting only the first shape reported "0 written pages" for a site with
 * hundreds of them, in a report whose whole promise is that a number it cannot
 * read says so instead of reading as zero. A readable file of an unexpected
 * shape is the same failure as an unreadable one; it just looks more innocent.
 *
 * So: count both places. Zero then has two very different meanings, and the
 * difference is whether the record is built by spreading other files in:
 *
 *   export const pageContent = { };                 → genuinely 0. A fresh seed
 *                                                     has written no pages yet,
 *                                                     and saying "unknown" there
 *                                                     would hide real progress.
 *   export const pageContent = { ...corePages };    → the keys live somewhere
 *                                                     this script did not find,
 *                                                     so the honest answer is
 *                                                     unknown, never 0.
 */
function writtenPages() {
  const KEY = /^\s+"\/[^"]*":/gm;
  let count = countMatches("content/pages.ts", KEY);
  try {
    for (const f of readdirSync("content/page-content")) {
      if (f.endsWith(".ts")) count += countMatches(`content/page-content/${f}`, KEY);
    }
  } catch {
    // No split directory. Normal for a seed-shaped site.
  }
  if (count > 0) return { writtenPages: count };

  let src;
  try {
    src = readFileSync("content/pages.ts", "utf8");
  } catch {
    return { writtenPages: null, writtenPagesWhy: "content/pages.ts could not be read" };
  }
  // Strip comments first: the seed's file documents the shape with an example
  // key, and counting the documentation as content would be its own small lie.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  return /\.\.\.\w+/.test(code)
    ? {
        writtenPages: null,
        writtenPagesWhy:
          "content/pages.ts builds its pages from other files this script did not find",
      }
    : { writtenPages: 0 };
}

function siteInventory(src) {
  // Read defensively. A site that deleted content/listings.ts, or an engine
  // update that renamed it, used to throw here and abort the whole run — no
  // file, no issue, and an agent who gets silence on Monday with nothing to
  // read. Every other source in this script degrades instead of dying, and so
  // does this one.
  // null means "could not be read", which is NOT the same as an empty file. A
  // site whose content/listings.ts is missing has an unknown number of
  // listings, and reporting that as 0 is the same lie as reporting a dead token
  // as no leads — it just looks more innocent.
  const read = (path) => {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return null;
    }
  };
  const listings = read("content/listings.ts") ?? "";
  const posts = read("content/posts.ts") ?? "";
  const missing = [
    read("content/listings.ts") === null ? "content/listings.ts" : "",
    read("content/posts.ts") === null ? "content/posts.ts" : "",
  ].filter(Boolean);
  const statuses = ["coming-soon", "active", "pending", "sold"];
  const byStatus = {};
  for (const s of statuses) {
    byStatus[s] = (listings.match(new RegExp(`status: "${s}"`, "g")) || []).length;
  }
  // The seed ships one example listing and one example post. Neither is a real
  // property or a real piece of writing, and counting them overstates a new
  // agent's site back to them in the very first report they read.
  if (/slug: "example-listing"/.test(listings) && byStatus.active > 0) byStatus.active -= 1;
  const postCount =
    (posts.match(/\n\s{2}\{\s*\n\s*slug:/g) || []).length -
    (/slug: "example-blog-post"/.test(posts) ? 1 : 0);

  // Service areas counted inside their own array. Matching "a slug next to a
  // name" anywhere in the config also catches team members, funnels and niches,
  // which reported four areas on a seed that ships three.
  const areas = (src.match(/const serviceAreas[\s\S]*?\n\];/) || [""])[0];

  return {
    // Named rather than silently zeroed, so the report can say "unknown"
    // instead of "none".
    ...(missing.length ? { unreadable: missing } : {}),
    listings: byStatus,
    blogPosts: Math.max(0, postCount),
    ...writtenPages(),
    serviceAreas: (areas.match(/\n\s{4}slug: "/g) || []).length,
    launchReady: /launchReady: true/.test(src),
  };
}

/**
 * The parts of Clarity's response worth putting in front of a person.
 *
 * Rage clicks and dead clicks are the most actionable thing in the whole
 * package: they name a page where somebody clicked something that looked
 * clickable and was not. Buried in raw JSON nobody ever sees them.
 *
 * Written defensively because the metric names are Clarity's, not ours — an
 * unexpected shape returns empty rather than throwing away the whole report.
 */
function clarityHighlights(byPage) {
  if (!Array.isArray(byPage)) return {};
  const metric = (pattern) =>
    byPage.find((m) => pattern.test(String(m?.metricName ?? "")))?.information ?? [];
  const num = (v) => Number(v ?? 0) || 0;

  const traffic = metric(/^traffic$/i);
  const rows = traffic
    .map((r) => ({ url: r.URL ?? r.Url ?? "", sessions: num(r.totalSessionCount) }))
    .filter((r) => r.url)
    .sort((a, b) => b.sessions - a.sessions);

  const clicks = (pattern) =>
    metric(pattern)
      .map((r) => ({ url: r.URL ?? r.Url ?? "", count: num(r.subTotal ?? r.count ?? r.value) }))
      .filter((r) => r.url && r.count)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

  return {
    sessions: traffic.reduce((n, r) => n + num(r.totalSessionCount), 0),
    botSessions: traffic.reduce((n, r) => n + num(r.totalBotSessionCount), 0),
    topPages: rows.slice(0, 5),
    rageClicks: clicks(/rage/i),
    deadClicks: clicks(/dead/i),
  };
}

/** Clarity: two requests, because the daily budget is ten and an agent may run
 *  this by hand as well. One by page, one by traffic source. */
async function clarity(token) {
  if (!token) return { available: false, why: "no CLARITY_API_TOKEN set" };
  const base = `${CLARITY_BASE}/export-data/api/v1/project-live-insights`;
  const get = async (dimension) => {
    const res = await fetch(`${base}?numOfDays=3&dimension1=${dimension}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}${res.status === 429 ? " (ten requests per day is the limit)" : ""}`);
    return res.json();
  };
  try {
    const [byPage, bySource] = await Promise.all([get("URL"), get("Source")]);
    return {
      available: true,
      // Clarity reports the last 72 hours, NOT the week. Said here so nobody
      // writes "this week" over a three-day number.
      window: "last 3 days",
      // The raw response is kept, but the useful parts are lifted out: nobody
      // reads a wall of JSON, and the whole point of the Monday issue is that
      // somebody glances at it and sees something worth acting on.
      highlights: clarityHighlights(byPage),
      byPage,
      bySource,
    };
  } catch (err) {
    return { available: false, why: err.message };
  }
}

/** Leads created in the last week. The search endpoint is unverified in this
 *  repo — see the file header — so the failure path is the important one. */
async function leads(token, locationId) {
  if (!token) return { available: false, why: "no GHL_API_TOKEN set" };
  if (!locationId || locationId.startsWith("[")) {
    return { available: false, why: "no GoHighLevel location ID in site.config.ts" };
  }
  try {
    const res = await fetch(`${GHL_BASE}/contacts/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId,
        pageLimit: 100,
        filters: [
          { field: "dateAdded", operator: "range", value: { gte: weekAgo.toISOString() } },
        ],
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        available: false,
        why: `GoHighLevel returned HTTP ${res.status}`,
        detail: JSON.stringify(body).slice(0, 300),
      };
    }
    const contacts = body.contacts ?? [];
    // `total` is deliberately NOT trusted. This response shape is unverified
    // here, and a total that ignored the date filter would report a year of
    // contacts as one week's leads — a wrong number that looks entirely right,
    // which is worse than a missing one. Count what actually came back, inside
    // the window, from each contact's own date.
    const dateOf = (c) => Date.parse(c.dateAdded ?? c.createdAt ?? c.dateUpdated ?? "");
    const dated = contacts.filter((c) => !Number.isNaN(dateOf(c)));
    if (contacts.length && !dated.length) {
      return {
        available: false,
        why: "contacts came back with no readable date, so which ones are from this week cannot be told",
        detail: `fields on the first contact: ${Object.keys(contacts[0]).slice(0, 12).join(", ")}`,
      };
    }
    const since = weekAgo.getTime();
    const inWindow = dated.filter((c) => dateOf(c) >= since);
    const bySource = {};
    for (const c of inWindow) {
      const key = c.source || "unrecorded";
      bySource[key] = (bySource[key] || 0) + 1;
    }
    const caveats = [];
    if (contacts.length >= 100) {
      caveats.push("100 contacts came back, which is the page limit, so this may be short");
    }
    if (typeof body.total === "number" && body.total !== inWindow.length) {
      caveats.push(`GoHighLevel reported a total of ${body.total}; ${inWindow.length} of them fall inside the week`);
    }
    return {
      available: true,
      count: inWindow.length,
      bySource,
      // Until somebody has checked one week's figure against GoHighLevel by eye,
      // the report should say where this number came from rather than assert it.
      verified: false,
      ...(caveats.length ? { caveats } : {}),
    };
  } catch (err) {
    return { available: false, why: err.message };
  }
}

function previousReport() {
  if (!existsSync(OUT_DIR)) return null;
  // Today's own file is excluded. Running twice in one day — a manual run after
  // the scheduled one — otherwise made the report its own "last week", so the
  // section that grades last week's suggestions compared this week's numbers
  // with themselves and always agreed.
  const todayFile = `${iso(today)}.json`;
  const files = readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".json") && f !== todayFile)
    .sort();
  return files.length ? `${OUT_DIR}/${files[files.length - 1]}` : null;
}

// Guarded like every other source. An unreadable config used to throw here,
// before anything was written — so the weekly job died and the agent got no
// issue at all on Monday, which is the one outcome this script exists to avoid.
let src = "";
let configUnreadable = false;
try {
  src = readFileSync(CONFIG, "utf8");
} catch {
  configUnreadable = true;
}
const report = {
  generatedAt: today.toISOString(),
  covers: `${iso(weekAgo)} to ${iso(today)}`,
  // Said out loud rather than left to be inferred from a page of zeros.
  ...(configUnreadable ? { configUnreadable: CONFIG } : {}),
  // So the next report can open with "last week I suggested X — here is what
  // happened", which is the whole point of doing this weekly.
  previousReport: previousReport(),
  site: siteInventory(src),
  tracking: {
    metaPixel: Boolean(configValue(src, "metaPixelId")),
    googleTag: Boolean(configValue(src, "googleTagId")),
    clarity: Boolean(configValue(src, "clarityProjectId")),
  },
  leads: await leads(process.env.GHL_API_TOKEN, configValue(src, "locationId")),
  clarity: await clarity(process.env.CLARITY_API_TOKEN),
};

mkdirSync(OUT_DIR, { recursive: true });
const path = `${OUT_DIR}/${iso(today)}.json`;
writeFileSync(path, JSON.stringify(report, null, 2) + "\n");

const l = report.leads;
const c = report.clarity;
console.log(`\nWEEK OF ${report.covers}\n`);
if (report.configUnreadable) {
  console.log(`  ! ${report.configUnreadable} could not be read — everything below is incomplete\n`);
}
console.log(`  Listings      ${Object.entries(report.site.listings).map(([k, v]) => `${v} ${k}`).join(", ")}`);
console.log(`  Blog posts    ${report.site.blogPosts}`);
console.log(
  `  Written pages ${
    report.site.writtenPages === null
      ? `unknown — ${report.site.writtenPagesWhy}`
      : report.site.writtenPages
  }`,
);
// Said out loud, because the counts above would otherwise read as real zeros.
if (report.site.unreadable?.length) {
  console.log(`                  those counts are incomplete: ${report.site.unreadable.join(", ")} could not be read`);
}
console.log(`  Leads         ${l.available ? l.count : `unavailable — ${l.why}`}`);
for (const caveat of l.caveats ?? []) console.log(`                  note: ${caveat}`);

if (!c.available) {
  console.log(`  Clarity       unavailable — ${c.why}`);
} else if (!c.highlights?.topPages?.length) {
  // Clarity answered, but not in a shape this understands. Printing "0 sessions"
  // would be the same lie as reporting a missing source as zero: the raw
  // response is in the JSON file, so say that instead of inventing a figure.
  console.log(
    `  Clarity       answered, but not in a shape this reads — the raw response is in the file`
  );
} else {
  const h = c.highlights ?? {};
  console.log(
    `  Clarity       ${h.sessions ?? 0} sessions in the ${c.window}` +
      (h.botSessions ? ` (${h.botSessions} bot sessions excluded)` : "")
  );
  for (const p of h.topPages ?? []) {
    console.log(`                  ${String(p.sessions).padStart(5)}  ${p.url}`);
  }
  // Last, because this is the line worth acting on: a page where people click
  // something that is not clickable.
  for (const r of h.rageClicks ?? []) console.log(`                  rage clicks: ${r.count} on ${r.url}`);
  for (const d of h.deadClicks ?? []) console.log(`                  dead clicks: ${d.count} on ${d.url}`);
}
console.log(`\nWritten to ${path}`);
console.log(`Ask Claude: "walk me through this week's report"\n`);
