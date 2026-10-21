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

const ARGS = process.argv.slice(2);
/**
 * Check ONLY that configured tracking is disclosed, and nothing else.
 *
 * CI skips the full launch check before a site launches — correctly, because a
 * pre-launch site is full of its own placeholders. But setup deliberately
 * deploys early, and the listings-first and assistant-only routes run for weeks
 * that way, so a pixel can be watching real visitors on a site whose privacy
 * policy names nobody, with nothing to catch it. This mode runs in that branch.
 */
const TRACKING_ONLY = ARGS.includes("--tracking-only");
// Flags filtered out, or "--tracking-only" would be read as the site's URL.
const BASE =
  ARGS.find((a) => !a.startsWith("--")) ||
  process.env.SCHEMA_BASE_URL ||
  "http://localhost:3000";

// Routes are discovered from the site's own sitemap, never hardcoded — so this
// gate always checks exactly the pages that exist. See scripts/site-routes.mjs.

// Tokens that must NEVER appear on a live client site. Case-insensitive.
// These catch KNOWN filler. They do NOT catch a plausible wrong value a human
// typed — that's what layers 2 and 3 are for.
const FILLER_MARKERS = [
  "placehold.co",
  "placeholder",
  "lorem ipsum",
  "[scaffold",
  "has not been written yet",
  "example.com",
  ".example",
  "@example",
  "yourdomain",
  // "fill in" alone fires on ordinary prose ("fill in disclosures") and nothing
  // in the seed ever emits it as scaffold text. The filler phrasing is directed
  // at the reader of a template, so match that instead.
  "fill in your",
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

// ---- Shared helpers for the slug/h1 and schema-agreement checks -------------

/** Every service area, read once from the config. */
const CONFIG_AREAS = (() => {
  try {
    const src = readFileSync(CONFIG_PATH, "utf8");
    const block = src.match(/serviceAreas[^=]*=\s*\[([\s\S]*?)\n\];/);
    if (!block) return [];
    return [
      // `name` is not always the line after `slug` — heroImage sits between them
      // on most entries. Requiring adjacency matched 5 of 28 areas and silently
      // exempted the rest, including Brentwood. Allow intervening fields, but
      // never cross into the next object (hence the negative lookahead).
      ...block[1].matchAll(
        /slug:\s*"([^"]+)",(?:(?!slug:)[\s\S]){0,400}?\bname:\s*"([^"]+)"/g
      ),
    ].map((m) => ({ slug: m[1], name: m[2] }));
  } catch {
    return [];
  }
})();

/** Place names worth comparing between a schema name and an h1. Built from the
 *  agent's own areas plus their city, so this needs no per-site editing. */
const PLACE_RE = (() => {
  const names = CONFIG_AREAS.map((a) => a.name).filter(Boolean);
  if (!names.length) return /(?!x)x/;
  const esc = names
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(?:${esc.join("|")})\\b`, "g");
})();

const strip = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const decode = (t) =>
  t
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, x) => String.fromCharCode(parseInt(x, 16)));


let failures = 0;
const hits = [];
// Rendered <main> text per route, for the duplication pass.
const bodies = new Map();
// Rendered <main> paragraphs per route, for the prose pass. The duplication
// check only needs a bag of words; the prose check needs to know where one
// paragraph stops and the next begins, because that boundary IS the defect.
const paras = new Map();
// Site-chrome compliance flags. The footer carries licensee disclosure and it
// sits OUTSIDE <main>, so these are collected from the full HTML instead.
/** How many crawled pages carried each disclosure, and how many were crawled. */
const chrome = { pages: 0, license: 0, brokerage: 0, eho: 0 };

/**
 * The brokerage exactly as site.config.ts names it, and the site's own name.
 * The disclosure check used to pass any page containing the letters "broker",
 * so a team name in the brokerage field, plus "Associate Broker" in a job title
 * or an IDX Broker script, passed a live site on every page while naming no
 * brokerage at all. Read once, compared per page.
 */
const BROKER = (() => {
  let src = "";
  try {
    src = readFileSync(CONFIG_PATH, "utf8");
  } catch {}
  const field = (k) => (src.match(new RegExp(`\\b${k}:\\s*"([^"]*)"`)) || [])[1] || "";
  return {
    name: field("brokerage").trim(),
    license: field("brokerageLicense").trim(),
    siteName: field("logoText").trim(),
  };
})();
/** slug -> pages (other than the blog index and itself) that link to the post. */
const postInbound = new Map();

const squash = (t) =>
  t.replace(/&amp;/g, "&").replace(/&#x27;|&#39;|&rsquo;/g, "'").replace(/\s+/g, " ").toLowerCase();

/** route -> { canonical, ogTitle, ogImage } from the page's <head>. Layers 11-12. */
const headMeta = new Map();

/** route -> [{src, alt}] for every rendered <img> under /images/stock/. Layer 13.
 *  Collected during the crawl rather than retaining whole pages: on a 442-page
 *  site keeping every body of HTML to re-scan later is a lot of memory for two
 *  attributes. */
const standIns = new Map();

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

// ---- Layer 2b: unfilled values in the config itself ------------------------
// Every other layer reads the RENDERED site, so it can only see values that
// reach a page. A config value that is never rendered is invisible to all of
// them — ghl.locationId sat as "[GHL_LOCATION_ID]" through nine clean gate runs
// because nothing puts it on screen, and a form silently posting to a bracket
// is exactly the failure a gate exists to prevent. This layer reads the file.
// ---- Layer 10: a configured pixel has to be disclosed -----------------------
/**
 * An advertising tag is invisible on the page and invisible to the person who
 * set it up, but every visitor gets it. CalOPPA requires the policy to say what
 * is collected and who receives it, and Meta's and Google's own terms require
 * the same disclosure of anyone running their tag. A missing paragraph is
 * exactly the kind of thing nobody notices, so it is checked rather than
 * remembered.
 *
 * The test is deliberately shallow — the vendor's name in a sentence that is
 * about tracking — because judging whether a policy is adequate is a human's
 * job. Naming nobody is the failure worth catching mechanically.
 */
async function checkTrackingDisclosed(base) {
  let src;
  try {
    src = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    return;
  }
  const value = (key) => (src.match(new RegExp(`${key}:\\s*"([^"]*)"`)) || [])[1] || "";

  // Declared here, before anything reads it. It lived below its first use once,
  // and the whole check threw "Cannot access 'SHAPES' before initialization" —
  // printing nothing at all, which in a gate reads exactly like passing.
  const SHAPES = [
    { key: "metaPixelId", shape: /^\d{10,20}$/, looks: "a long number, 10 to 20 digits" },
    { key: "googleTagId", shape: /^(G|AW|GT)-[A-Za-z0-9_-]+$/, looks: "G-…, AW-… or GT-…" },
    { key: "clarityProjectId", shape: /^[a-z0-9]{6,20}$/i, looks: "a short code of letters and digits" },
    {
      key: "googleAdsConversion",
      shape: /^AW-\d+\/[A-Za-z0-9_-]+$/,
      looks: "AW-123456789/AbC-D_efGh — the ID and the label, with the slash",
    },
  ];
  // Only WELL-SHAPED ids count as configured. A malformed one loads nothing, so
  // demanding the privacy policy name it would contradict the message above:
  // "nothing is being tracked by it" and "every visitor is being tracked by it"
  // cannot both be useful advice.
  const wellShaped = (key) => {
    const v = value(key);
    const s = SHAPES.find((x) => x.key === key);
    return Boolean(v) && (!s || s.shape.test(v));
  };
  const configured = [
    { key: "metaPixelId", label: "Meta pixel", vendor: /\b(meta|facebook|instagram)\b/i },
    { key: "googleTagId", label: "Google tag", vendor: /\bgoogle\b/i },
    { key: "clarityProjectId", label: "Clarity session recording", vendor: /\b(clarity|microsoft)\b/i },
  ].filter((t) => wellShaped(t.key));
  // A misspelled ID is worse than a missing one: components/Analytics.tsx drops
  // anything that is not an ID shape rather than injecting it into a script, so
  // a value pasted with a space, a stray quote, or a whole dashboard URL loads
  // NOTHING while the agent believes their tracking is on. Nobody would ever
  // find that by looking at the site.
  for (const s of SHAPES) {
    const v = value(s.key);
    if (v && !s.shape.test(v)) {
      console.error(
        `✗ tracking.${s.key} is set to "${v}", which is not the right shape and will ` +
          `be ignored — so nothing is being tracked by it. It should look like ${s.looks}.`
      );
      failures++;
    }
  }

  // An Ads conversion label is sent through gtag. With no Google tag there is no
  // gtag, so the conversion silently never fires — and the agent concludes their
  // ads produce nothing. Caught here because nothing else can see it: the page
  // looks identical either way.
  if (value("googleAdsConversion") && !value("googleTagId")) {
    console.error(
      "✗ a Google Ads conversion is set but there is no Google tag, so it can " +
        "never fire. Add the Google tag (G-… or AW-…) in site.config.ts → tracking."
    );
    failures++;
  }

  if (!configured.length) return;

  let html;
  try {
    const res = await fetch(`${base}/privacy`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    // Silence here used to mean "passed". A privacy page that will not load,
    // while three vendors are tracking every visitor, is the one case where
    // saying nothing is the worst answer — found when a mid-recompile fetch made
    // this check report absolutely nothing and look like approval.
    console.error(
      `✗ tracking is configured but /privacy could not be read (${err.message}), ` +
        `so its disclosure cannot be checked.`
    );
    failures++;
    return;
  }
  // Scripts first, and this is the whole reason the check needed a second pass:
  // the pixel's own code says "facebook" and "track" in the same breath, so a
  // page with a tag and no disclosure was passing by quoting itself. Styles and
  // <noscript> go too, then tags, then it reads sentence by sentence so the word
  // "Google" in the footer's map embed cannot pass for a disclosure either.
  const sentences = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/);
  const tracking = /\b(track|tracking|pixel|cookie|cookies|analytics|advertis|retarget|measure)/i;

  for (const t of configured) {
    const disclosed = sentences.some((s) => t.vendor.test(s) && tracking.test(s));
    if (disclosed) {
      console.log(`✓ /privacy discloses the ${t.label}`);
    } else {
      console.error(
        `✗ a ${t.label} is configured but /privacy never mentions it. Every ` +
          `visitor is being tracked by a company the policy does not name — ` +
          `write that paragraph with the agent (setup 7.1d) before launch.`
      );
      failures++;
    }
  }
}

async function checkLegalPages(base) {
  // Every form links here in its consent text, and CalOPPA requires a posted
  // privacy policy for any commercial site collecting personal information from
  // California residents, with no revenue threshold. A 404 or an unwritten
  // scaffold behind a consent checkbox is a broken promise on the exact page
  // where somebody hands over their details.
  for (const path of ["/privacy", "/terms"]) {
    try {
      const res = await fetch(`${base}${path}`);
      if (!res.ok) {
        console.error(`✗ ${path} returns HTTP ${res.status}. Every form links to it.`);
        failures++;
        continue;
      }
      const html = await res.text();
      if (/\[SCAFFOLD/i.test(html)) {
        console.error(
          `✗ ${path} is still the built-in outline. Write it WITH the agent ` +
            `(setup 7.1d) rather than pasting a generic policy.`
        );
        failures++;
      } else {
        console.log(`✓ ${path} written`);
      }
    } catch {
      console.error(`✗ could not reach ${path}`);
      failures++;
    }
  }
}

function checkLocalFacts() {
  let src;
  try {
    src = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    return;
  }
  // The root cause of near-duplicate area pages is not the writing, it is the
  // missing input. With no localFacts an area page can only say the same things
  // as every other one with the name swapped, because there is nothing else
  // true of that place available to say. Catching it here points at the cause
  // rather than the symptom the duplication layer reports later.
  const block = src.match(/serviceAreas[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!block) return;
  const areas = [...block[1].matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);
  const withFacts = (block[1].match(/localFacts:\s*\{/g) || []).length;
  const missing = areas.length - withFacts;
  if (!areas.length) return;

  if (missing <= 0) {
    console.log(`✓ every area has local facts (${areas.length})`);
    return;
  }
  console.warn(
    `⚠ ${missing} of ${areas.length} areas have no localFacts.\n` +
      `    Those pages can only differ from each other by the name swapped in,\n` +
      `    which is what the near-duplicate check flags further down. Collect\n` +
      `    housing stock, who lives there, schools, commute and the trade-off\n` +
      `    versus the next area over. Track it: content/OPEN-ITEMS.md`
  );
}

function checkImageCoverage() {
  let src;
  try {
    src = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    return;
  }
  // Every page header falls back to a brand gradient, so a missing photo never
  // looks broken. That is exactly why it needs counting: nothing on the page and
  // nothing in the build will ever tell the agent these are missing, and a real
  // local photo is the single biggest visual upgrade available to them.
  const areaBlock = src.match(/serviceAreas[^=]*=\s*\[([\s\S]*?)\n\];/);
  const areas = areaBlock
    ? [...areaBlock[1].matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1])
    : [];
  const withImg = areaBlock
    ? (areaBlock[1].match(/heroImage:\s*"[^"]+"/g) || []).length
    : 0;
  const siteWide = /heroImageUrl:\s*"[^"]+"/.test(src);
  const missing = areas.length - withImg;

  if (!areas.length) return;
  if (missing <= 0) {
    console.log(`✓ every area has its own header image (${areas.length})`);
    return;
  }
  console.warn(
    `⚠ ${missing} of ${areas.length} areas have no header image of their own` +
      (siteWide
        ? " (they fall back to the site-wide photo, which still looks intentional)"
        : " and there is no site-wide photo either, so they fall back to a gradient") +
      `\n    Real local photography is the biggest visual upgrade available here.` +
      `\n    Track it: content/OPEN-ITEMS.md`
  );
}

function checkBusinessProfile() {
  let src;
  try {
    src = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    return;
  }
  const val = (k) => (src.match(new RegExp(k + '\\s*:\\s*\n?\\s*"([^"]*)"')) || [])[1] || "";
  const embed = val("googleMapsEmbedUrl");
  const profile = val("googleBusinessProfileUrl");

  // An address embed and a Business Profile embed look identical on the page
  // and are worth completely different amounts. The address one drops an
  // anonymous pin; the profile one shows the business name, rating and photos,
  // and every interaction with it is credited to the listing Google ranks.
  // Nothing else can tell these apart, which is why this check exists.
  const isAddressEmbed = /[?&]q=/.test(embed) && !/[?&]pb=/.test(embed);

  if (!embed && !profile) {
    console.warn(
      "⚠ no Google Business Profile configured. It is the single highest-value " +
        "local ranking signal available. Set googleMapsEmbedUrl and " +
        "googleBusinessProfileUrl from the profile card, not from an address search."
    );
    return;
  }
  if (isAddressEmbed) {
    console.error(
      "✗ googleMapsEmbedUrl is an ADDRESS embed, not a Business Profile embed.\n" +
        "    It renders a map, so it looks fine, but it carries none of the local\n" +
        "    SEO value. Search the business NAME on Google Maps, click the business\n" +
        "    card (the one with reviews), then Share, then Embed a map."
    );
    failures++;
  }
  if (!profile) {
    console.error(
      "✗ googleBusinessProfileUrl is empty, so nothing on the site links to the\n" +
        "    profile. Same card, Share, Send a link."
    );
    failures++;
  }
  if (!isAddressEmbed && profile) {
    console.log("✓ Google Business Profile wired (profile embed + link)");
  }
}

function checkAreaSlugs() {
  let src;
  try {
    src = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    return;
  }
  // name and slug are separate fields, so renaming an area without updating the
  // slug leaves a finished site serving /areas/neighborhood-one. It looks fine
  // in the nav, which shows the name, and only shows up in the URL bar.
  const slugify = (s) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // Scope to the serviceAreas block. slug/name pairs also appear on team
  // members and funnels, where the slug is deliberately not a slug of the name
  // ("lead-agent" for a person), and flagging those is noise that trains people
  // to ignore the check.
  const block = src.match(/serviceAreas[^=]*=\s*\[([\s\S]*?)\n\];/);
  const pairs = block
    ? [
        // `name` is not always the line after `slug` — heroImage commonly sits
        // between them. Requiring adjacency silently checked a handful of areas
        // and exempted the rest. Allow intervening fields without crossing into
        // the next object.
        ...block[1].matchAll(
          /slug:\s*"([^"]+)",(?:(?!slug:)[\s\S]){0,400}?\bname:\s*"([^"]+)"/g
        ),
      ]
    : [];
  const stale = pairs.filter(([, slug, name]) => slug !== slugify(name));
  if (!stale.length) {
    if (pairs.length) console.log("✓ every area slug matches its name");
    return;
  }
  console.error(`✗ ${stale.length} stale area slug(s) — the name changed, the URL did not:`);
  for (const [, slug, name] of stale)
    console.error(`    • "${name}" is served at /areas/${slug} (expected /areas/${slugify(name)})`);
  failures += stale.length;
}

function checkConfigPlaceholders() {
  let src;
  try {
    src = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    return; // Layer 2 already reported the unreadable file
  }

  // Strip comments first: the config explains itself with bracketed examples,
  // and flagging its own documentation would make the gate unpassable.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  // Report the [TOKEN] itself rather than the string around it. Quoting rules
  // in TS make surrounding-string capture unreliable (an apostrophe inside a
  // double-quoted string reads as a delimiter), and the token is what the agent
  // has to go fill in anyway.
  const found = new Set();
  for (const m of code.matchAll(/\[[A-Z][A-Z0-9 _#\/.-]{1,60}\]/g)) {
    found.add(m[0]);
  }

  if (found.size === 0) {
    console.log("✓ no unfilled placeholders left in site.config.ts");
    return;
  }

  console.error(
    `✗ site.config.ts still has ${found.size} unfilled placeholder value(s):`
  );
  for (const v of [...found].slice(0, 25)) console.error(`    • ${v}`);
  if (found.size > 25) console.error(`    …and ${found.size - 25} more`);
  failures += found.size;
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
  // Strip framework <script> payloads first. Next.js streams its RSC data as
  // inline script text full of random chunk ids, and one of them containing
  // "Tbd5" was enough to fail 13 pages for the filler marker "tbd". The gate is
  // meant to read what a visitor reads.
  //
  // JSON-LD is deliberately KEPT: a placeholder that reaches schema is a real
  // defect, and schema is invisible on the page so it is the one place a human
  // would never catch it.
  const withoutScripts = html.replace(
    /<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi,
    " "
  );
  const scanned = withoutScripts.replace(/\splaceholder=(["'])([\s\S]*?)\1/gi, " $2 ");

  const lower = scanned.toLowerCase();
  const found = new Set();
  for (const marker of FILLER_MARKERS) {
    const m = marker.toLowerCase();
    // Markers that are ordinary words need whole-word matching. As a bare
    // substring, "todo" fires on "Todos Santos Plaza" (a real place name) and
    // "n/a" fires on any ".../information/about" path, so legitimate local
    // content would block launch. The rest of the list is domains, phone
    // fragments and bracket markers, where a substring is exactly right.
    const wordy = /^[a-z][a-z /]*$/.test(m);
    // Match the plural only for markers long enough that it is unambiguous.
    // "placeholders" should still be caught; "todo" must not swallow "Todos".
    const plural = m.length >= 6 ? "s?" : "";
    const hit = wordy
      ? new RegExp(
          `(^|[^a-z0-9])${m.replace(/\//g, "\\/")}${plural}([^a-z0-9]|$)`,
          "i"
        ).test(lower)
      : lower.includes(m);
    if (hit) found.add(marker);
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

  // Licensee disclosure lives in the footer, outside <main> — scan full HTML.
  //
  // COUNTED PER PAGE, not latched to true on the first hit. These are
  // site-wide advertising requirements: "the licence number appears on one of
  // your 638 pages" is not compliance, it is a page that happens to mention a
  // licence. The old version set a single boolean and so passed a real site
  // whose homepage, contact page, main selling page and privacy policy all
  // carried no Equal Housing statement at all.
  {
    const plain = html.replace(/<[^>]+>/g, " ");
    chrome.pages++;
    if (/\b(DRE|BRE|License|Lic\.?)\s*#?\s*[0-9A-Za-z]/i.test(plain)) chrome.license++;
    const usable = BROKER.name && !BROKER.name.startsWith("[");
    if (usable ? squash(plain).includes(squash(BROKER.name)) : /broker/i.test(plain)) chrome.brokerage++;
    if (/equal housing/i.test(plain)) chrome.eho++;
  }

  // Who links to which post, for the orphan-post layer.
  {
    const own = route.match(/^\/blog\/([^/]+)$/);
    if (own && !postInbound.has(own[1])) postInbound.set(own[1], new Set());
    if (route !== "/blog") {
      for (const m of html.matchAll(/href="\/blog\/([^"#?/]+)"/g)) {
        if (own && own[1] === m[1]) continue;
        if (!postInbound.has(m[1])) postInbound.set(m[1], new Set());
        postInbound.get(m[1]).add(route);
      }
    }
  }

  // Head metadata for Layers 11 and 12. Collected here, judged at the end,
  // because both are about the SET of pages rather than any one of them.
  {
    const head = html.slice(0, (html.search(/<\/head>/i) + 7) || html.length);
    const canonical = head.match(
      /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i
    )?.[1];
    const ogTitle = head.match(
      /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i
    )?.[1];
    const ogImage = head.match(
      /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']*)["']/i
    )?.[1];
    headMeta.set(route, { canonical, ogTitle, ogImage });

    // Stand-in photography actually rendered on this page (Layer 13).
    //
    // BOTH forms, and the second one is the one that matters most. Area and
    // specialty page headers are CSS `background-image`, not <img> — an
    // <img>-only scan reported zero stand-ins on a page that was visibly
    // showing one, which is the commonest stand-in slot on the whole site.
    const shots = [
      ...[
        ...html.matchAll(/<img\b[^>]*src=["'](\/images\/stock\/[^"']+)["'][^>]*>/gi),
      ].map((m) => ({
        src: m[1],
        alt: m[0].match(/\balt=["']([^"']*)["']/i)?.[1] ?? "",
        kind: "img",
      })),
      // A background image carries no alt text, so it makes no textual claim
      // about a place and cannot trip the hard failure below. It is still
      // counted: it is a borrowed photograph and the agent needs to know.
      ...[
        ...html.matchAll(/background-image:\s*url\((["']?)(\/images\/stock\/[^)"']+)\1\)/gi),
      ].map((m) => ({ src: m[2], alt: "", kind: "background" })),
    ];
    if (shots.length) standIns.set(route, shots);
  }

  // Keep the main-content text for the duplication check (chrome excluded, so
  // shared nav/footer doesn't inflate similarity).
  {
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const raw = main ? main[1] : html;
    const clean = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ");
    bodies.set(route, clean.replace(/<[^>]+>/g, " "));
    paras.set(
      route,
      [...clean.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
        .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
        .filter((p) => p.length > 20)
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

  // What a visitor actually reads, for comparing schema against the page.
  const visibleText = decode(
    strip(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
    )
  );

  // ---- Layer 7: the page must say what its URL promises --------------------
  // A slug is a promise. /areas/brentwood/selling-your-home tells a visitor and
  // a crawler that this page is about Brentwood, so an h1 that says anything
  // else is a broken promise — and it is exactly what a well-meaning
  // find-and-replace does when an agent's service area grows.
  // See .claude/rules/geographic-branding.md.
  const h1m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1m ? decode(strip(h1m[1])) : null;
  const areaSlug = route.match(/^\/areas\/([a-z0-9-]+)(?:\/|$)/)?.[1];
  if (areaSlug && h1) {
    const area = CONFIG_AREAS.find((a) => a.slug === areaSlug);
    if (area && !h1.toLowerCase().includes(area.name.toLowerCase())) {
      console.error(
        `✗ ${route} — slug/h1 mismatch: URL says "${area.name}", h1 says "${h1}"`
      );
      failures++;
    }
  }

  // ---- Layer 8: schema must agree with the visible page --------------------
  // validate:schema proves the JSON-LD is well formed. It does not prove the
  // words inside it are the words on the page. Real case: every specialty page
  // shipped schema reading "Downsizing in Brentwood" while the h1 read
  // "Downsizing in the Bay Area", because the schema builder was never handed
  // the page content. Invisible on screen, wrong to every crawler.
  for (const block of html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  ) || []) {
    const json = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "").trim();
    if (!json.startsWith("{") && !json.startsWith("[")) continue;
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      console.error(`✗ ${route} — JSON-LD does not parse`);
      failures++;
      continue;
    }
    const nodes = data["@graph"] || (Array.isArray(data) ? data : [data]);
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      // Google requires FAQ markup to reflect content visible on the page.
      if (String(n["@type"] || "").includes("FAQPage")) {
        for (const q of n.mainEntity || []) {
          const name = (q?.name || "").trim();
          if (name && !visibleText.includes(name)) {
            console.error(
              `✗ ${route} — FAQ in schema is not visible on the page: "${name.slice(0, 60)}"`
            );
            failures++;
          }
        }
      }
      // A page's schema name must not name a different place than its h1.
      // Only PAGE nodes. The Organization / RealEstateAgent / Person nodes
      // legitimately carry the office location ("The Mashore Group, REALTOR®
      // in Brentwood") on every page of the site, and comparing those to the
      // h1 flags all 336 area pages for saying exactly what they should.
      const type = String(n["@type"] || "");
      const isPageNode =
        /\b(WebPage|BlogPosting|Article|ProfilePage|CollectionPage|ItemPage|AboutPage|ContactPage|FAQPage)\b/.test(
          type
        );
      const head = isPageNode ? (n.headline || n.name || "").trim() : "";
      if (head && h1 && head !== h1) {
        const places = (s) => (s.match(PLACE_RE) || []).join("|");
        if (places(head) && places(h1) && places(head) !== places(h1)) {
          console.error(
            `✗ ${route} — schema/h1 name places disagree: schema "${head}" vs h1 "${h1}"`
          );
          failures++;
        }
      }
    }
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

/**
 * Is the site answering on this address actually THIS project?
 *
 * The default address is localhost:3000, and whatever happens to be running
 * there gets crawled. A test session hit exactly this: 309 issues about pages
 * like "/topics/facebook-ads" that belong to an entirely different site running
 * on the same machine. Every one of those findings was about somebody else's
 * pages, and nothing said so — which is worse than a failure, because a person
 * starts fixing pages they do not have.
 */
async function warnIfWrongSite(base) {
  let src;
  try {
    src = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    return false;
  }
  // Several identifiers, because a site may show its name as a logo image
  // rather than text. Any one of them matching is enough.
  const marks = [
    (src.match(/logoText: "([^"]*)"/) || [])[1],
    (src.match(/name: "([^"]*)"/) || [])[1],
    (src.match(/phone: "([^"]*)"/) || [])[1],
  ].filter((m) => m && !m.startsWith("["));
  // An unconfigured seed has nothing distinctive to look for, and that is fine.
  if (!marks.length) return false;
  try {
    const res = await fetch(base);
    const html = (await res.text()).toLowerCase();
    if (marks.some((m) => html.includes(m.toLowerCase()))) return false;
    console.error(
      `⚠ the site answering on ${base} may not be this project — its home page ` +
        `mentions none of ${marks.map((m) => `"${m}"`).join(", ")}. If another site ` +
        `is running on that port, everything below is about somebody else's pages: ` +
        `start this one (npm run dev) or pass its address.\n`
    );
    return true;
  } catch {
    return false; // unreachable is reported by the checks that need it
  }
}

// A warning rather than a stop: a site whose name is only a logo image would
// otherwise be unable to run its own gate. It is repeated at the end, because a
// warning at the top of a long run is a warning nobody sees.
const wrongSiteWarning = await warnIfWrongSite(BASE);

if (TRACKING_ONLY) {
  console.log(`\nTRACKING DISCLOSURE CHECK against ${BASE}\n`);
  await checkTrackingDisclosed(BASE);
  if (failures) {
    // Deliberately generic: the problem above may be an undisclosed tag OR an ID
    // pasted wrong, and "a tag is running on this site" is false in the second
    // case — nothing is running, which is the whole complaint.
    console.error(`\n✗ ${failures} problem(s) with this site's tracking. See above.\n`);
    process.exit(1);
  }
  if (wrongSiteWarning) {
    console.error("⚠ and note the warning above: this may not be your site.\n");
  }
  console.log("✓ Nothing configured that the privacy policy fails to name.\n");
  process.exit(0);
}

/**
 * IDX — the MLS search embed on /listings.
 *
 * `idx.embedUrl` is OPTIONAL and blank is a complete, correct state: plenty of
 * agents never buy a provider, and the listings page works without one. So an
 * empty value says nothing at all.
 *
 * What is checked is the failure that actually happens: a value that is set and
 * wrong. An IDX embed is a third-party iframe, which means a malformed URL, an
 * http:// URL on an https:// site, a bracket left in place or a provider that
 * has not whitelisted the domain all produce the same thing on screen — a blank
 * rectangle 720 pixels tall, below the agent's own listings, where the whole
 * market search is supposed to be. Nobody scrolls that far on their own site
 * after the first week, so it is never seen.
 *
 * What CANNOT be checked from here, and must not be implied: whether the
 * provider's page actually loads. It is cross-origin, so the frame's contents
 * are unreadable to anything on this side. Loading /listings in a browser and
 * looking is the only way, and the warning says so.
 */
async function checkIdx(base) {
  let src;
  try {
    src = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    return; // Layer 2 already reported the unreadable file
  }
  // The idx block only — so a URL somewhere else in the config cannot stand in
  // for this one.
  const block = (src.match(/idx:\s*\{([\s\S]*?)\}/) || [])[1] || "";
  const url = ((block.match(/embedUrl:\s*"([^"]*)"/) || [])[1] || "").trim();

  if (!url) {
    console.log(
      "· IDX: no MLS search configured. That is a valid finished state — the agent's\n" +
        "  own listings render on their own. Add idx.embedUrl when they have a provider.",
    );
    return;
  }

  /*
   * PLACEHOLDER DETECTION, NARROWLY.
   *
   * The first version of this tested /EXAMPLE/i anywhere in the string, which
   * misdiagnosed `http://search.example-idx.com/results` as a placeholder
   * instead of reporting the real problem — that it is not https. A check that
   * names the wrong fault sends somebody to fix the wrong thing, which is worse
   * than a check that stays quiet.
   *
   * So: a bracketed value, one of the seed's own filler words as a WORD, or
   * example.com as an actual HOST rather than a substring.
   */
  const placeholder =
    /^\[|\]$/.test(url) ||
    /\b(PASTE|TODO|TBD|REPLACE[_ -]?ME)\b/i.test(url) ||
    /\bYOUR[_ -]?(IDX|EMBED|URL)\b/i.test(url) ||
    /^https?:\/\/(www\.)?example\.(com|org|net)(\/|$)/i.test(url);
  if (placeholder) {
    console.error(`✗ IDX: idx.embedUrl is still a placeholder — ${url}`);
    failures++;
    return;
  }
  if (!/^https:\/\//i.test(url)) {
    console.error(
      `✗ IDX: idx.embedUrl must start with https:// — got "${url}".\n` +
        "  A browser blocks an http:// frame inside an https:// page and shows nothing,\n" +
        "  with no error anywhere a non-technical owner would find it.",
    );
    failures++;
    return;
  }
  try {
    new URL(url);
  } catch {
    console.error(`✗ IDX: idx.embedUrl is not a valid URL — "${url}"`);
    failures++;
    return;
  }

  // And it has to actually reach the page.
  try {
    const html = await (await fetch(`${base}/listings`)).text();
    if (!html.includes(url)) {
      console.error(
        "✗ IDX: idx.embedUrl is set but no iframe on /listings uses it. The embed is\n" +
          "  configured and not rendering.",
      );
      failures++;
      return;
    }
  } catch {
    console.error("✗ IDX: /listings could not be read");
    failures++;
    return;
  }

  console.log(`✓ IDX: MLS search embed present on /listings`);
  console.log(
    "⚠ IDX: nothing here can tell you the provider's search actually LOADS. The frame\n" +
      "  is cross-origin, so its contents are unreadable from this side, and a domain the\n" +
      "  provider has not whitelisted renders as an empty box rather than an error.\n" +
      "  Open /listings in a browser, at a phone width as well, and search for a real\n" +
      "  address. See docs/IDX-SETUP.md.",
  );
}

console.log(`\nLAUNCH CHECK against ${BASE}\n`);
checkLaunchReady();
checkConfigPlaceholders();
checkAreaSlugs();
checkBusinessProfile();
checkImageCoverage();
checkLocalFacts();
await checkLegalPages(BASE);
await checkTrackingDisclosed(BASE);
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
  // Skip pages still rendering their SCAFFOLD. Scaffolds are identical by
  // design, so comparing them reports hundreds of "duplicates" that are really
  // just one unwritten page repeated — burying the real punch list. The filler
  // layer already fails every scaffolded page, which is the correct signal.
  const written = [...bodies.entries()].filter(
    ([, text]) => !/\[SCAFFOLD/i.test(text) && !/lorem ipsum/i.test(text)
  );
  const entries = written.map(([r, t]) => [r, trigrams(t)]);
  if (entries.length < 2) {
    console.log("✓ duplication check skipped (fewer than two written pages yet)");
    return;
  }
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

// ---- Layer 6: Fair Housing --------------------------------------------------
// An AI writing neighborhood copy produces steering language by DEFAULT. "Great
// for families" is the normal output, not the edge case, and it is a familial-
// status problem in advertising by a licensed agent. At the scale this seed is
// built for (many agents, hundreds of pages each) that is a liability generator
// unless something checks.
//
// The rule that resolves nearly every case: describe the PROPERTY, never the
// PEOPLE. "Near three elementary schools" is a fact about a place. "Great for
// families" is a statement about who belongs there.
//
// Unambiguous steering FAILS. Context-dependent phrasing WARNS, because a human
// has to judge it and a false positive must never block a launch on its own.
// PLACE and the extra entries match the website-health grader, which caught
// "family neighborhoods" and a bare "family-friendly" on a site this list passed.
const PLACE = "(neighbou?rhoods?|communit(?:y|ies)|areas?|part of town|streets?|subdivisions?|zip codes?)";
const FH_FAIL = [
  { re: /\b(perfect|great|ideal|wonderful) for (a )?(young )?famil(y|ies)\b/gi, why: "familial status — describe the property, not who it suits" },
  { re: /\bfamily[- ]friendly\b/gi, why: "familial status" },
  // Not "single-family neighborhoods": that is a housing type, and it was the
  // first false positive this rule produced on a real site.
  { re: new RegExp(`(?<!(single|multi)[- ])\\bfamily ${PLACE}\\b`, "gi"), why: "familial status" },
  { re: /\b(kid|child|children)[- ]friendly\b/gi, why: "familial status" },
  { re: /\b(raise|raising) (your |a )?(kids|children|family)\b/gi, why: "familial status" },
  { re: new RegExp(`\\bsafe ${PLACE}\\b`, "gi"), why: "'safe' reads as coded language about residents; cite facts instead" },
  { re: /\b(low|no|high) crime\b/gi, why: "crime claims steer; leave them to official sources" },
  { re: new RegExp(`\\bexclusive ${PLACE}\\b`, "gi"), why: "exclusionary framing" },
  { re: /\b(perfect|great|ideal) for (retirees|empty[- ]nesters|seniors|singles|couples|newlyweds|young professionals)\b/gi, why: "describe the home, not who should live there" },
  { re: /\b(no children|adults only|no kids)\b/gi, why: "familial status — unlawful outside qualified 55+ housing" },
  { re: /\bbachelor pad\b/gi, why: "sex/marital framing" },
  { re: /\bwalking distance to (a )?church(es)?\b/gi, why: "religion — name amenities generically" },
  { re: /\b(christian|catholic|jewish|muslim) (community|neighborhood|neighbourhood)\b/gi, why: "religion" },
];
// ---- Layer 6b: US spelling -----------------------------------------------
// British spellings read as imported copy on a US real estate site, and they
// are exactly what an LLM produces when nobody told it otherwise. This caught
// real content on this project more than once, so it is a check, not a nit.
// Warn rather than fail: a proper noun can legitimately contain "Centre".
// Commission language. "Standard" or "customary" rates are the exact phrasing
// at issue in real-estate antitrust litigation. Warn, because there are honest
// sentences containing these words and a human should read the context.
const COMMISSION = [
  { re: /\b(standard|customary|typical|usual|going)\s+(commission|rate|fee)s?\b/gi, why: "implies fees are set rather than negotiated" },
  { re: /\bcommissions?\s+(are|is)\s+(set|fixed|standard|customary)\b/gi, why: "commissions are negotiable; saying otherwise is an antitrust risk" },
  { re: /\b6\s*%\s*commission\b/gi, why: "never state a rate as if it were the norm" },
];

const SPELLING = [
  { re: /\bneighbourhood?s?\b/gi, why: "US spelling: neighborhood" },
  // Must require the British "u". `/\bfavou?rite?\b/` also matched the CORRECT
  // American "favorite" and then advised using "favorite" — it fired on a real
  // site in October 2026 and on 15 pages of another, which is how a warning
  // stops being read.
  { re: /\bfavourites?\b|\bfavour(s|ed|ing|able|ably)?\b/gi, why: "US spelling: favorite / favor" },
  { re: /\bcolour(s|ed)?\b/gi, why: "US spelling: color" },
  { re: /\bcentre\b/gi, why: "US spelling: center" },
  { re: /\borganis(e|ed|ing|ation)\b/gi, why: "US spelling: organize" },
  { re: /\brecognis(e|ed|ing)\b/gi, why: "US spelling: recognize" },
  { re: /\bspecialis(e|ed|ing)\b/gi, why: "US spelling: specialize" },
  { re: /\benquir(e|ed|y|ies)\b/gi, why: "US usage: inquire / inquiry" },
];

const FH_WARN = [
  { re: /\b(good|great|best|top|excellent) schools\b/gi, why: "school-quality claims can steer; name the schools or districts factually" },
  { re: /\b(quiet|established|desirable) (neighborhood|neighbourhood)\b/gi, why: "can read as coded; prefer concrete detail" },
  { re: /\bhandicapped\b/gi, why: "use 'accessible' / person-first language" },
];

function checkFairHousing() {
  const fails = [];
  const warns = [];
  for (const [route, text] of bodies) {
    for (const { re, why } of FH_FAIL) {
      const hits = text.match(re);
      if (hits) fails.push({ route, phrase: hits[0].trim(), why });
    }
    for (const { re, why } of COMMISSION) {
      const hits = [...new Set((text.match(re) || []).map((h) => h.toLowerCase()))];
      if (hits.length) {
        console.warn(
          `⚠ ${route} — commission language: ${hits.join(", ")} (${why})`
        );
      }
    }
    // Proper nouns legitimately carry British spellings: "Contra Costa Centre"
    // is a real BART station. Drop any Capitalised word that follows another
    // Capitalised word — that is a proper noun, not prose. Without this, one
    // station name produced 41 warnings on a real site and buried 2 genuine
    // misspellings underneath them, which is how a warning stops being read.
    const spellText = text.replace(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g, " ");
    for (const { re, why } of SPELLING) {
      const hits = [
        ...new Set((spellText.match(re) || []).map((h) => h.toLowerCase())),
      ];
      if (hits.length) {
        console.warn(
          `⚠ ${route} — British spelling: ${hits.join(", ")} (${why})`
        );
      }
    }
    for (const { re, why } of FH_WARN) {
      const hits = text.match(re);
      if (hits) warns.push({ route, phrase: hits[0].trim(), why });
    }
  }
  for (const w of warns) {
    console.warn(`⚠ Fair Housing (review): "${w.phrase}" on ${w.route} — ${w.why}`);
  }
  for (const f of fails) {
    console.error(`✗ Fair Housing: "${f.phrase}" on ${f.route} — ${f.why}`);
  }
  if (fails.length) {
    failures += fails.length;
    console.error(
      "  Rewrite to describe the property, not the people. See content-model.md."
    );
  } else if (!warns.length) {
    console.log("✓ no Fair Housing issues detected");
  }
}

// ---- Layer 6c: claims that need proof ---------------------------------------
// "#1", "award-winning" and "guaranteed" on a licensee's site are advertising
// claims: the FTC and state real-estate regulators expect a source the reader
// can check, and a guarantee is a legal promise. The daily-article checker and
// the website-health grader both caught these; this gate did not, so a site
// could pass launch with "#1" in its copy. Same list as the grader.
const CLAIMS = [
  // A ranking, not a numbered point: "#1 agent in Brentwood" fails, "The #1
  // Rule" and "Mistake #1" do not. The bare form flagged eight real articles
  // whose only sin was a numbered heading.
  { re: /(#\s?1|\bnumber[- ]one|\bno\.\s?1)\s+(\w+\s+){0,2}(agent|realtor|broker|brokerage|team|company|firm|choice|seller|listing agent)s?\b|(#\s?1|\bnumber[- ]one|\bno\.\s?1)\s+in\s+[A-Z]/gi, why: "'#1' needs a source the reader can check" },
  { re: /\b(top[- ]rated|award[- ]winning|best[- ]selling)\b/gi, why: "rating or award claim needs the source named" },
  { re: /\bbest (\w+ )?(agent|realtor|broker|team|company|firm|choice|option|service)s? (in|of) [A-Z][a-z]+/g, why: "superlative claim" },
  { re: /\bbest (in|of) (town|the city|the area|the state|the county)\b/gi, why: "superlative claim" },
  { re: /\b(voted|rated|awarded) (the )?(best|top|#\s?1)\b/gi, why: "award claim needs the award named" },
  // Only an advertiser's own promise. "Waiting doesn't guarantee a better deal",
  // "Will upgrades guarantee a higher price? No." and the MLS's "not guaranteed"
  // are the honest opposite of a claim, and the bare word flagged twelve of them.
  { re: /\b(we|I) (can )?guarantee\b|\b(our|my) guarantee\b|\bguaranteed (sale|sold|to sell|results?|offers?|price|buyers?|closing)\b|\bguarantee (you|your home|a sale)\b/gi, why: "a guarantee is a legal promise" },
  { re: /\b(results|success) (promised|assured)\b|\bpromise (you )?(results|a sale|to sell)\b/gi, why: "a promised result is a guarantee" },
  { re: /\b100% (satisfaction|success|guaranteed|effective)\b/gi, why: "absolute claim" },
  { re: /\brisk[- ]free\b/gi, why: "absolute claim" },
  { re: /\b(always|never) (sells|closes|works|succeeds)\b/gi, why: "absolute claim" },
];

function checkClaims() {
  const found = [];
  for (const [route, text] of bodies) {
    for (const { re, why } of CLAIMS) {
      const hits = text.match(re);
      if (hits) found.push({ route, phrase: hits[0].trim(), why });
    }
  }
  if (!found.length) {
    console.log("✓ no unsourced claims (#1, award, guarantee)");
    return;
  }
  for (const f of found) console.error(`✗ claim: "${f.phrase}" on ${f.route} — ${f.why}`);
  console.error("  Name the source beside the claim, or say what is actually true instead.");
  failures += found.length;
}

// ---- Layer 6d: every post is linked from the site ---------------------------
// A post only the blog index links to is an orphan: Google treats it as
// unimportant and readers never meet it. Outbound links were a hard rule and
// inbound ones were nobody's job, so on a real site twelve imported articles had
// one link or none. The area, situation and post pages offer related posts
// (lib/related-posts.ts); this proves every post actually got picked somewhere.
const MIN_INBOUND = 2;
function checkPostLinks() {
  const thin = [...postInbound.entries()]
    // The seed's own "[EXAMPLE]" post is a placeholder the placeholder layer
    // already fails; reporting it twice is noise on every fresh site.
    .filter(([slug]) => !/\[EXAMPLE/i.test(bodies.get(`/blog/${slug}`) || ""))
    .filter(([slug, from]) => !slug.startsWith("[") && from.size < MIN_INBOUND)
    .map(([slug, from]) => `/blog/${slug} (${from.size})`);
  if (!thin.length) {
    if (postInbound.size) console.log(`✓ every post is linked from at least ${MIN_INBOUND} pages`);
    return;
  }
  console.error(
    `✗ ${thin.length} post(s) linked from fewer than ${MIN_INBOUND} pages besides the blog index: ` +
      thin.slice(0, 6).join(", ") + (thin.length > 6 ? ` +${thin.length - 6} more` : "")
  );
  console.error("  Give the post a city and keywords that match an area or situation page, or link it from a related post.");
  failures += thin.length;
}

// ---- Layer 6b: prose integrity ---------------------------------------------
// Both defects this catches are ASSEMBLY defects, not writing defects. Pages are
// built by dropping paragraphs into section slots, and a paragraph that reads
// perfectly in the slot it was written for becomes nonsense one slot over:
//
//   ORPHAN    "Relocating, you have none of that, and touring houses does not
//             fix it." — "that" referred to a paragraph now under a different
//             heading. The reader hits a pronoun with nothing behind it.
//
//   FRAGMENT  "A Saturday farmers market in City Park that has outlived the farm
//             town it started in. The most competitive market out here, where
//             good homes move fast." — two noun phrases, no main verb in either.
//             Written as descriptors to be embedded in a sentence; emitted raw.
//
// Neither is visible to a spell checker and both survive every other layer here.
// A human proofreading 300 pages will miss them; this will not.
const ORPHAN = [
  {
    re: /^(And|But|So|Or|Yet|Nor)\s+[a-z]/,
    why: "opens with a conjunction, so it is the back half of a paragraph that lives somewhere else",
  },
  {
    re: /^(That|These|Those)\s+(is|are|was|were)\b/i,
    why: "opens with a back-reference to something the reader has not been shown",
  },
  {
    re: /^[A-Z][a-z]+,\s+you\s+have\s+none\s+of\s+that\b/i,
    why: "'none of that' has no antecedent in this section",
  },
];

// Finite verbs. A sentence with no verb in its MAIN clause is a fragment, so the
// test is run against the head — the text before the first subordinator — rather
// than the whole sentence. "A market that HAS outlived the town" is still a
// fragment; the only verb belongs to the relative clause.
const AUX =
  /\b(is|are|was|were|be|been|being|am|has|have|had|do|does|did|can|could|will|would|shall|should|may|might|must)\b/i;
const VERBS = new RegExp(
  "\\b(" +
    (
      "describe|price|move|sell|buy|work|take|make|know|tell|show|come|go|get|give|need|want|" +
      "mean|cost|run|sit|start|decide|change|matter|depend|track|drive|carry|hold|keep|put|" +
      "find|think|say|ask|pay|spend|reach|add|lose|win|grow|build|list|tour|look|feel|turn|" +
      "leave|bring|send|explain|answer|handle|fix|miss|value|compare|adjust|walk|pull|see|use|" +
      "help|let|fall|stay|remain|apply|offer|require|include|produce|reset|surprise|narrow|" +
      "reward|prefer|expect|arrive|happen|belong|suit|fit|treat|spread|swing|land|open|close|" +
      "draw|compete|restrict|vary|clear|allow|cover|create|serve|support|reflect|affect|" +
      "attract|command|deliver|exceed|favor|follow|hide|hurt|imply|justify|limit|mark|" +
      "measure|note|outlive|own|pass|plan|point|prove|raise|rank|rent|report|represent|" +
      "return|rise|save|scale|settle|share|shift|sign|sort|split|stand|stretch|tend|test|" +
      "trade|understand|wait|watch|weigh|write|read|hear|live|lead|meet|set|cut|drop|push|" +
      "check|choose|count|earn|enter|face|fund|gain|guess|learn|listen|manage|mind|name|" +
      "order|place|pick|record|remove|repeat|replace|rule|run|seem|sound|speak|study|talk|" +
      "teach|touch|track|train|treat|trust|view|visit|wear|wonder|worry|reduce|increase|" +
      "expand|explore|extend|focus|force|form|generate|grant|guide|identify|ignore|impact|" +
      "improve|indicate|inform|introduce|involve|maintain|matter|obtain|occur|operate|" +
      "perform|permit|persuade|prepare|present|prevent|protect|provide|publish|reveal|" +
      "review|seek|select|separate|solve|specify|stop|struggle|succeed|suggest|supply|" +
      "survive|swap|switch|target|throw|total|update|vote|warn|welcome|widen|yield"
    )
      .split("|")
      .flatMap((v) => {
        const s = v.endsWith("y") ? v.slice(0, -1) + "ies" : v + "s";
        const d = v.endsWith("e") ? v + "d" : v + "ed";
        return [v, s, d];
      })
      .join("|") +
    ")\\b",
  "i"
);

function hasPredicate(sentence) {
  const parts = sentence.split(
    /\b(?:that|which|where|who|whose|because|since|although|though|while|unless|before|after|whether|if|when)\b/i
  );
  // A sentence that OPENS with a subordinator has its main clause AFTER the
  // clause, not before it, so an empty head means "look at the whole sentence".
  const head = parts[0].split(/\s+/).filter(Boolean).length >= 3 ? parts[0] : sentence;
  return AUX.test(head) || VERBS.test(head);
}

function checkProse() {
  if (!paras.size) return;
  const orphans = new Map(); // text -> Set(routes)
  const fragments = new Map();
  for (const [route, list] of paras) {
    for (const p of list) {
      for (const { re, why } of ORPHAN) {
        if (re.test(p)) {
          const k = `${why}§§${p}`;
          if (!orphans.has(k)) orphans.set(k, new Set());
          orphans.get(k).add(route);
        }
      }
      const sentences = p
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.split(/\s+/).length >= 4);
      if (sentences.length >= 2 && !sentences.some(hasPredicate)) {
        if (!fragments.has(p)) fragments.set(p, new Set());
        fragments.get(p).add(route);
      }
    }
  }
  // FAIL — a paragraph with no main verb in any sentence is broken wherever it
  // sits. This is the defect that shipped 253 times: descriptor fragments that
  // were written to be embedded in a sentence, emitted as a paragraph instead.
  for (const [p, routes] of fragments) {
    console.error(
      `✗ prose: no main verb in any sentence — "${p.slice(0, 90)}…"\n    on ${routes.size} page(s), e.g. ${[...routes][0]}`
    );
  }
  // WARN — opening a paragraph with "So"/"And"/"That is" is good writing when the
  // setup is the paragraph directly above it, and broken when the paragraph has
  // been moved. No script can tell those apart, so this lists them for a human
  // rather than blocking a launch on a judgment call.
  for (const [k, routes] of orphans) {
    const [why, text] = k.split("§§");
    console.warn(
      `⚠ prose (review): "${text.slice(0, 80)}…" on ${routes.size} page(s), e.g. ${[...routes][0]}\n    ${why} — check the paragraph above it actually sets this up`
    );
  }
  if (fragments.size) {
    failures += fragments.size;
    console.error(
      "  Give each sentence a subject and a verb. A descriptor written to sit\n" +
        "  inside a sentence ('a downtown by the river') is not a paragraph.\n" +
        "  See .claude/skills/realtor-content-writer/content-model.md → 'Paragraphs travel'."
    );
  } else if (!orphans.size) {
    console.log("✓ no verbless or orphaned paragraphs");
  }
}

// ---- Layer 7: licensee disclosure ------------------------------------------
// Most states require advertising to identify the licensee and brokerage; CA DRE
// requires the license number on first-point-of-contact material, which includes
// a website. The seed renders all three in the footer on every page, so this
// normally passes for free — the check exists because deleting a footer line or
// leaving `license` blank would otherwise ship silently on a real agent's site.
// See .claude/rules/legal-compliance.md.
function checkDisclosure() {
  if (!bodies.size) return;
  const missing = [];
  const n = chrome.pages;
  // A disclosure has to be on every page, because every page is advertising
  // and any one of them can be the page a visitor lands on from search.
  const shortfall = (count, label) => {
    if (count >= n) return null;
    return count === 0
      ? `${label} — on none of the ${n} pages checked`
      : `${label} — on only ${count} of ${n} pages`;
  };

  // Before the pages: is what the config calls a brokerage actually one?
  if (BROKER.name && !BROKER.name.startsWith("[") && squash(BROKER.name) === squash(BROKER.siteName)) {
    console.error(
      `✗ compliance: the brokerage is set to "${BROKER.name}", which is this site's own name.\n` +
        "  A team name is not a brokerage. Put the responsible broker's legal name in\n" +
        "  site.config.ts → agent.brokerage, as the state license lookup shows it."
    );
    failures++;
  }
  if (!BROKER.license || BROKER.license.startsWith("[")) {
    console.warn(
      "⚠ compliance (review): agent.brokerageLicense is empty. Show the brokerage's own\n" +
        "  license number beside its name; the state license lookup lists it."
    );
  }

  for (const m of [
    shortfall(chrome.license, "licensee license number (most states require it on advertising)"),
    shortfall(
      chrome.brokerage,
      BROKER.name && !BROKER.name.startsWith("[") ? `brokerage name ("${BROKER.name}")` : "brokerage name"
    ),
    shortfall(chrome.eho, "Equal Housing Opportunity statement"),
  ]) {
    if (m) missing.push(m);
  }

  if (missing.length) {
    for (const m of missing) console.error(`✗ compliance: missing ${m}`);
    console.error(
      "  These normally come from the footer. See .claude/rules/legal-compliance.md."
    );
    failures += missing.length;
  } else {
    console.log("✓ licensee disclosure present (license, brokerage, Equal Housing)");
  }
}

// ---- Layer 13: stand-in photography is counted, never silent ----------------
/**
 * WHY THIS LAYER EXISTS.
 *
 * Setup fills every empty image slot with licensed stock, because an agent
 * looking at a site of grey gradients decides it is unfinished and loses
 * momentum. That is the right call, and it has one dangerous side effect:
 * it silences `checkImageCoverage()` above. That warning counts areas with no
 * header image, and once every area has a stand-in it reports success. The
 * only remaining record of what is borrowed is a markdown list, and a markdown
 * list is exactly the thing that stops being maintained.
 *
 * So stand-ins live under `public/images/stock/` and this counts them. The path
 * is the marker because it survives a renamed file and an unread checklist.
 *
 * It WARNS and does not fail. Launching with some stock is a legitimate choice
 * — an agent who waits for a photographer never launches — and a gate that
 * blocks on it would teach people to move the files somewhere else. The point
 * is that the number is always visible, not that it is always zero.
 */
function checkStandInImages() {
  if (!standIns.size) return; // nothing borrowed, nothing to say

  const all = [...standIns.values()].flat();
  const distinct = new Set(all.map((s) => s.src));

  console.warn(
    `\u26a0 ${all.length} image slot(s) across ${standIns.size} page(s) use stand-in ` +
      `photography (${distinct.size} distinct file(s) under /images/stock/).`
  );
  console.warn(
    "    Licensed stock standing in for the agent's own photos. The site looking\n" +
      "    finished is the point — but their own shot of a street they actually work\n" +
      "    beats every one of these. Track: content/OPEN-ITEMS.md"
  );

  // The one thing here that is NOT a warning: a stand-in whose alt text names a
  // real place. That is a false statement about somewhere real, published by a
  // licensed professional. See .claude/rules/image-sourcing.md section 3.
  const places = areaNames();
  const offenders = [];
  for (const [route, shots] of standIns) {
    for (const { alt } of shots) {
      if (!alt) continue;
      const named = places.find((p) =>
        new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(alt)
      );
      if (named) offenders.push(`${route} — alt "${alt}" names ${named}`);
    }
  }

  if (offenders.length) {
    console.error(
      `\u2717 stand-in photo described as a real place on ${offenders.length} page(s): ` +
        offenders.slice(0, 3).join("; ")
    );
    console.error(
      "  A stock image may ILLUSTRATE a location page; it may not CLAIM to be that\n" +
        "  place. Use descriptive alt text ('a suburban street on a clear morning'),\n" +
        "  or a map embed when the page needs to say something true about the place."
    );
    failures += offenders.length;
  }
}

/** Service-area names from the config, for the alt-text check above. */
function areaNames() {
  try {
    const src = readFileSync(CONFIG_PATH, "utf8");
    const block = src.match(/serviceAreas[^=]*=\s*\[([\s\S]*?)\n\];/);
    if (!block) return [];
    return [...block[1].matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);
  } catch {
    return [];
  }
}

// ---- Layer 11: every page states which URL is the real one ------------------
/**
 * WHY THIS LAYER EXISTS.
 *
 * It was added in October 2026 after an audit found that no site ever generated
 * from this seed had emitted a single `<link rel="canonical">`. Nothing caught
 * it for the whole life of the project, because nothing looked.
 *
 * On a seed site that is not a footnote. The /areas/<town>/<niche> matrix
 * produces several hundred pages built from one template, and Layer 4 already
 * measures how similar they are. A canonical is the one tag that tells Google
 * "this URL is the real home of this page" — without it a few hundred
 * near-identical URLs arrive with no statement of which is which, and the
 * engine's own duplicate warning becomes a ranking problem instead of a content
 * note.
 *
 * It must also be SELF-referential and absolute. A page whose canonical names a
 * different page is actively instructing Google to drop it.
 */
function checkCanonical() {
  if (!headMeta.size) return;
  const missing = [];
  const relative = [];
  const mismatched = [];

  for (const [route, meta] of headMeta) {
    if (!meta.canonical) {
      missing.push(route);
      continue;
    }
    if (!/^https?:\/\//i.test(meta.canonical)) {
      relative.push(`${route} → ${meta.canonical}`);
      continue;
    }
    const path = meta.canonical.replace(/^https?:\/\/[^/]+/, "") || "/";
    const want = route === "/" ? "/" : route.replace(/\/$/, "");
    if (path.replace(/\/$/, "") !== want.replace(/\/$/, "")) {
      mismatched.push(`${route} → ${meta.canonical}`);
    }
  }

  if (!missing.length && !relative.length && !mismatched.length) {
    console.log(`✓ canonical URL on all ${headMeta.size} pages, each pointing at itself`);
    return;
  }

  if (missing.length) {
    console.error(
      `✗ canonical: ${missing.length} of ${headMeta.size} page(s) have no <link rel="canonical">` +
        (missing.length <= 5 ? `: ${missing.join(", ")}` : `, e.g. ${missing.slice(0, 4).join(", ")}`)
    );
    failures++;
  }
  if (relative.length) {
    console.error(
      `✗ canonical: ${relative.length} page(s) have a relative canonical — it must be absolute: ${relative
        .slice(0, 3)
        .join(", ")}`
    );
    failures++;
  }
  if (mismatched.length) {
    console.error(
      `✗ canonical: ${mismatched.length} page(s) point at a DIFFERENT page, which tells Google to drop them: ${mismatched
        .slice(0, 3)
        .join(", ")}`
    );
    failures++;
  }
  console.error(
    "  Fixed in app/layout.tsx: `metadataBase` plus `alternates: { canonical: \"./\" }`.\n" +
      "  The \"./\" must stay relative — a literal URL there points every page at the homepage."
  );
}

// ---- Layer 12: a shared link has to preview --------------------------------
/**
 * WHY THIS LAYER EXISTS.
 *
 * Same audit, same answer: no site from this seed had ever declared Open Graph
 * metadata, so every link an agent shared to Facebook, Instagram, LinkedIn,
 * WhatsApp or iMessage rendered as bare text — no image, no headline.
 *
 * These sites are built for agents following a social-first method. Their
 * distribution IS sharing links. A link that does not preview is the cheapest
 * possible way to lose the click, and the person sharing it cannot see the
 * problem from their own screen.
 *
 * The per-page title check matters as much as presence. Declaring one og:title
 * in the root layout makes every page preview with the homepage's headline,
 * which looks fixed and is not.
 */
function checkSocialPreview() {
  if (!headMeta.size) return;
  const noTitle = [];
  const noImage = [];
  const titles = new Map();

  for (const [route, meta] of headMeta) {
    if (!meta.ogTitle) noTitle.push(route);
    else titles.set(meta.ogTitle, (titles.get(meta.ogTitle) ?? 0) + 1);
    if (!meta.ogImage) noImage.push(route);
  }

  let clean = true;
  if (noTitle.length) {
    console.error(
      `✗ social preview: ${noTitle.length} of ${headMeta.size} page(s) have no og:title — a shared link shows bare text`
    );
    failures++;
    clean = false;
  }
  if (noImage.length) {
    console.error(
      `✗ social preview: ${noImage.length} of ${headMeta.size} page(s) have no og:image`
    );
    failures++;
    clean = false;
  }

  // One title shared by most of the site means it was pinned in the layout.
  const [topTitle, topCount] = [...titles.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (headMeta.size >= 5 && topCount > headMeta.size * 0.8) {
    console.warn(
      `⚠ social preview: ${topCount} of ${headMeta.size} pages share one og:title ("${String(
        topTitle
      ).slice(0, 60)}"). Every link previews identically — remove the title from\n` +
        "    the openGraph block in app/layout.tsx so each page's own title flows through."
    );
    clean = false;
  }

  if (clean) {
    console.log(`✓ social preview: og:title and og:image on all ${headMeta.size} pages`);
  }
}

// ---- Layer 9: a listing has to be readable by a machine ---------------------
// Everything downstream of content/listings.ts is generated: the map pin, the
// structured data, the chat context, /listings/details and /ai-brief. That is
// the design, and it is also the danger — none of it is on screen, so a listing
// added with a field missing looks completely fine to the person who added it.
//
// This is the failure that motivated the layer. An agent's voice caller was
// pointed at her listings page and answered "I don't have one of those" about a
// property that was plainly on the site. The page was crawlable, the prices were
// in the HTML, and the structured data described her company and twenty team
// members and not one house. Nothing failed. Nothing warned.
//
// So: every listing must carry real coordinates, the index must actually
// enumerate the listings for a machine, and the brief page must mention every
// one of them. Adding a listing next year cannot quietly skip any of it.
async function checkListingsMachineReadable(base) {
  let src;
  try {
    src = readFileSync(new URL("../content/listings.ts", import.meta.url), "utf8");
  } catch {
    return; // no listings module, nothing to police
  }

  const slugs = [...src.matchAll(/^\s{4}slug:\s*"([^"]+)"/gm)].map((m) => m[1]);
  const real = slugs.filter((s) => s !== "example-listing");
  if (!real.length) {
    console.log("✓ listings: none yet (nothing to check)");
    return;
  }

  // 1. Coordinates, checked PER LISTING and reported by name.
  //
  //    Counting geo blocks against the number of listings does not work: the
  //    example listing carries a placeholder geo, so its block was counted and
  //    masked a real listing that had none. The first version of this check did
  //    exactly that and passed a site it should have failed. Split the array into
  //    records and look at each one.
  const objects = src
    .slice(src.indexOf("export const listings"))
    .split(/\n  \{\n/)
    .slice(1);
  const noGeo = [];
  const zeroGeo = [];
  for (const obj of objects) {
    const slug = obj.match(/slug:\s*"([^"]+)"/)?.[1];
    if (!slug || slug === "example-listing") continue;
    const m = obj.match(/geo:\s*\{\s*lat:\s*"([^"]*)",\s*lng:\s*"([^"]*)"\s*\}/);
    if (!m) noGeo.push(slug);
    else if (m[1] === "0" || m[2] === "0" || !m[1] || !m[2]) zeroGeo.push(slug);
  }
  if (noGeo.length) {
    console.error(
      `✗ listings: no coordinates on ${noGeo.length} listing(s): ${noGeo.join(", ")}.\n` +
        `  Without them the map falls back to searching the address text, which puts a` +
        ` rural or\n  repeated street name in the wrong place, and the structured data ships` +
        ` with no location\n  at all. Open each address in Google Maps and copy the numbers` +
        ` from the address bar.`
    );
    failures++;
  }
  if (zeroGeo.length) {
    console.error(
      `✗ listings: placeholder coordinates (0,0) still on: ${zeroGeo.join(", ")}. ` +
        `Replace them with the real ones from Google Maps.`
    );
    failures++;
  }
  if (!noGeo.length && !zeroGeo.length) {
    console.log(`✓ listings: all ${real.length} have real coordinates`);
  }

  // 2. The index must enumerate the listings for a machine, not just link them.
  try {
    const html = await (await fetch(`${base}/listings`)).text();
    const blocks = [...html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
    )].map((m) => m[1]);
    const hasItemList = blocks.some((b) => /"ItemList"/.test(b));
    const residences = blocks.reduce(
      (n, b) => n + (b.match(/"SingleFamilyResidence"/g) || []).length,
      0
    );
    if (!hasItemList || residences < real.length) {
      console.error(
        `✗ /listings describes ${residences} of ${real.length} listing(s) in its structured data. ` +
          `This page is the one URL a CRM knowledge base or voice agent is pointed at; it cannot ` +
          `follow a link per property.`
      );
      failures++;
    } else {
      console.log(`✓ /listings enumerates all ${real.length} listing(s) for machines`);
    }
  } catch {
    console.error("✗ /listings could not be read for the machine-readable check");
    failures++;
  }

  // 3. The brief page is what an external assistant is actually pointed at.
  try {
    const res = await fetch(`${base}/ai-brief`);
    if (!res.ok) {
      console.error(`✗ /ai-brief returns HTTP ${res.status}. It is the page an outside assistant reads.`);
      failures++;
    } else {
      const text = (await res.text()).replace(/<[^>]+>/g, " ");
      const missing = real.filter((slug) => {
        const m = src.match(
          new RegExp(`slug:\\s*"${slug}"[\\s\\S]{0,600}?address:\\s*"([^"]+)"`)
        );
        return m ? !text.includes(m[1]) : false;
      });
      if (missing.length) {
        console.error(
          `✗ /ai-brief is missing ${missing.length} listing(s): ${missing.join(", ")}. ` +
            `An assistant reading it will deny those homes exist.`
        );
        failures++;
      } else {
        console.log("✓ /ai-brief carries every listing");
      }
    }
  } catch {
    console.error("✗ /ai-brief could not be read");
    failures++;
  }
}

console.log("");
await checkIdx(BASE);
console.log("");
await checkListingsMachineReadable(BASE);
console.log("");
checkDisclosure();
checkCanonical();
checkSocialPreview();
checkStandInImages();
console.log("");
checkFairHousing();
checkClaims();
checkPostLinks();
checkProse();
console.log("");
checkDuplication();
console.log("");
checkVoice();

console.log("");
if (failures > 0) {
  // A raw failure count on a fresh seed reads as catastrophe when it is just an
  // un-filled template. Summarise what the count actually means so the next step
  // is obvious to someone who has never seen this before.
  const scaffolded = [...bodies.entries()].filter(([, x]) =>
    /\[SCAFFOLD/i.test(x)
  ).length;
  const bracketHits = new Set(
    hits.filter((h) => h.marker.startsWith("[")).map((h) => h.marker)
  ).size;

  if (wrongSiteWarning) {
    console.error(
      `⚠ FIRST, re-read the warning at the top: the site checked on ${BASE} may ` +
        `not be this project, in which case these issues belong to another site.\n`
    );
  }
  console.error(`✗ NOT READY TO LAUNCH — ${failures} issue(s).\n`);
  console.error("  What that means in plain terms:");
  if (scaffolded)
    console.error(
      `    • ${scaffolded} page(s) have not been written yet — they are showing the built-in outline.`
    );
  if (bracketHits)
    console.error(
      // These were counted from the RENDERED pages, not from the config — and
      // saying "in site.config.ts" sent somebody to search a file that Layer 2b
      // had already reported as clean in the same run.
      `    • ${bracketHits} placeholder marker(s) are still showing on the live pages ` +
        `(e.g. [Your Name]). They come from site.config.ts or from content/ — the ` +
        `per-page lines above say which pages.`
    );
  console.error(
    "\n  This is expected on a site that is not set up yet. It is the gate doing its job,\n" +
      "  not something broken. Ask Claude to \"keep setting up my site\" and it will work\n" +
      "  through this list with you. Nothing goes live until it is clean.\n"
  );
  process.exit(1);
} else {
  console.log("✓ LAUNCH READY — no filler markers, human sign-off present.\n");
}
