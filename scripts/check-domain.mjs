#!/usr/bin/env node
/**
 * DOES THE LIVE SITE AGREE WITH ITSELF ABOUT WHERE IT LIVES?
 *
 * Run this after attaching a domain, after moving one, and after any redeploy
 * that follows either:
 *
 *   npm run check:domain -- https://theirdomain.com
 *
 * WHAT IT IS LOOKING FOR. These pages are generated at build time, so the site's
 * idea of its own address is baked in when it is built. Attach a domain without
 * redeploying and the site serves happily on the new address while its sitemap
 * and every schema @id still name the old one. Nothing errors. Nothing looks
 * broken. Google is simply told the wrong canonical home for every page, which
 * is the most expensive kind of quiet failure available here.
 */

const raw = (process.argv[2] || "").replace(/\/+$/, "");
if (!raw) {
  console.log("\nUsage: npm run check:domain -- https://theirdomain.com\n");
  process.exit(1);
}
/**
 * Accept a bare domain.
 *
 * `fetch("theirdomain.com/")` throws "Failed to parse URL", which this script
 * caught and reported as "nothing answering at theirdomain.com" — about a site
 * that was serving HTTP 200 perfectly well. The usage line does ask for the
 * full address, but an error that names the wrong problem sends somebody to
 * check their DNS instead of their typing.
 */
const target = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
if (target !== raw) console.log(`\n(reading ${raw} as ${target})`);

let bad = 0;
const fail = (m) => { console.log(`  ✗ ${m}`); bad++; };
const pass = (m) => console.log(`  ✓ ${m}`);

console.log(`\nDomain check — ${target}\n${"─".repeat(48)}`);

async function get(path) {
  try {
    const r = await fetch(`${target}${path}`, { redirect: "follow" });
    return { status: r.status, body: r.status === 200 ? await r.text() : "", url: r.url };
  } catch (e) {
    return { status: 0, body: "", url: "", err: String(e) };
  }
}

const home = await get("/");
if (home.status !== 200) {
  fail(`nothing answering at ${target} (${home.err ?? home.status})`);
  process.exit(1);
}
pass("site is answering");

/* Did we get redirected somewhere else? A domain that redirects to the Vercel
   URL rather than serving on itself is a DNS job, not a build one. */
const landed = new URL(home.url).origin;
if (landed !== target) fail(`${target} redirects to ${landed} — the domain is not the one serving`);
else pass("serving on the requested domain, no redirect");

/* The sitemap is the loudest wrong thing when this goes wrong. */
const sm = await get("/sitemap.xml");
if (sm.status !== 200) fail("no /sitemap.xml");
else {
  const locs = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const wrong = locs.filter((l) => !l.startsWith(target));
  if (locs.length === 0) fail("sitemap is empty");
  else if (wrong.length) {
    fail(`${wrong.length} of ${locs.length} sitemap URLs point somewhere else — e.g. ${wrong[0]}`);
    fail("REDEPLOY. The build still carries the old address; attaching a domain does not rewrite a build that already happened.");
  } else pass(`all ${locs.length} sitemap URLs are on this domain`);
}

/* Schema @id anchors are how Google merges the business into one entity. Stale
   ones split it in two, or point the entity at a domain nobody is on. */
/* Tolerant of other attributes on the tag — see validate-schema.mjs for why a
   strict match silently reported "no structured data" on pages that had it. */
const blocks = [
  ...home.body.matchAll(
    /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  ),
];
if (!blocks.length) fail("no structured data on the home page");
else {
  const ids = [];
  for (const [, raw] of blocks) {
    try {
      const d = JSON.parse(raw);
      for (const n of d["@graph"] ?? [d]) if (n["@id"]) ids.push(n["@id"]);
    } catch { fail("structured data is not valid JSON"); }
  }
  const relative = ids.filter((i) => i.startsWith("/"));
  const offDomain = ids.filter((i) => /^https?:\/\//.test(i) && !i.startsWith(target));
  if (relative.length) fail(`${relative.length} schema @id are relative (e.g. ${relative[0]}) — an entity needs an absolute address to merge on`);
  if (offDomain.length) fail(`${offDomain.length} schema @id name another domain — e.g. ${offDomain[0]}`);
  if (!relative.length && !offDomain.length) pass(`all ${ids.length} schema @id anchors are on this domain`);
}

/* robots.txt should point at the sitemap on the same host. */
const robots = await get("/robots.txt");
if (robots.status === 200 && robots.body.includes("Sitemap:")) {
  const line = robots.body.split("\n").find((l) => l.startsWith("Sitemap:")) ?? "";
  if (!line.includes(target)) fail(`robots.txt points its sitemap at another host — ${line.trim()}`);
  else pass("robots.txt sitemap is on this domain");
}

console.log(`\n${"─".repeat(48)}`);
if (bad) {
  console.log(`${bad} problem(s). The usual fix is a REDEPLOY, not a code change.\n`);
  process.exit(1);
}
console.log("Domain is consistent everywhere.\n");
