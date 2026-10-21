#!/usr/bin/env node
/**
 * Schema validator — a broken schema is worse than no schema, so this gates it.
 *
 * Crawls rendered pages, extracts every <script type="application/ld+json">,
 * and checks:
 *   HARD ERRORS (exit 1)
 *     - JSON parses
 *     - every node has an @type
 *     - every @id reference resolves to a node defined on that page
 *     - the base entities (Organization, WebSite, RealEstateAgent, Person)
 *       are present on every page
 *   WARNINGS (exit 0, but printed)
 *     - leftover [PLACEHOLDER] values — i.e. the data still to collect.
 *       This doubles as the intake checklist.
 *
 * Usage:  node scripts/validate-schema.mjs [baseUrl]
 *         SCHEMA_BASE_URL=https://staging.example.com node scripts/validate-schema.mjs
 *
 * For the final external check, paste a deployed URL into Google's Rich Results
 * Test — this script validates structure; Google validates eligibility.
 */

import { fetchRoutes } from "./site-routes.mjs";

const BASE =
  process.argv[2] || process.env.SCHEMA_BASE_URL || "http://localhost:3000";

// Routes are discovered from the site's own sitemap, never hardcoded — so this
// validator always checks exactly the pages that exist. See site-routes.mjs.

const REQUIRED_BASE_TYPES = [
  "Organization",
  "WebSite",
  "RealEstateAgent",
  "Person",
];

let hardErrors = 0;
const placeholders = new Set();

function extractBlocks(html) {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  const blocks = [];
  let m;
  while ((m = re.exec(html)) !== null) blocks.push(m[1]);
  return blocks;
}

function typeList(node) {
  const t = node["@type"];
  return Array.isArray(t) ? t : t ? [t] : [];
}

function walk(value, path, ids, refs) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`, ids, refs));
    return;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    // A pure reference: { "@id": "..." } with no other keys.
    if (keys.length === 1 && keys[0] === "@id") {
      refs.push({ id: value["@id"], path });
      return;
    }
    for (const [k, v] of Object.entries(value)) {
      if (k === "@id" && typeof v === "string") ids.add(v);
      walk(v, `${path}.${k}`, ids, refs);
    }
    return;
  }
  if (typeof value === "string" && /\[[^\]]+\]/.test(value)) {
    placeholders.add(`${path} = "${value}"`);
  }
}

async function checkRoute(route) {
  const url = `${BASE}${route}`;
  let html;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`✗ ${route} — HTTP ${res.status}`);
      hardErrors++;
      return;
    }
    html = await res.text();
  } catch (err) {
    console.error(`✗ ${route} — fetch failed: ${err.message}`);
    hardErrors++;
    return;
  }

  const blocks = extractBlocks(html);
  if (blocks.length === 0) {
    console.error(`✗ ${route} — no JSON-LD found`);
    hardErrors++;
    return;
  }

  const definedIds = new Set();
  const refs = [];
  const typesPresent = new Set();
  let localErrors = 0;

  for (const [i, raw] of blocks.entries()) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error(`✗ ${route} — block ${i} is invalid JSON: ${err.message}`);
      hardErrors++;
      localErrors++;
      continue;
    }
    const nodes = parsed["@graph"] || [parsed];
    for (const node of nodes) {
      const types = typeList(node);
      if (types.length === 0) {
        console.error(`✗ ${route} — a node is missing @type`);
        hardErrors++;
        localErrors++;
      }
      types.forEach((t) => typesPresent.add(t));
      walk(node, `${route}`, definedIds, refs);
    }
  }

  // @id references must resolve within the page.
  for (const { id, path } of refs) {
    if (!definedIds.has(id)) {
      console.error(`✗ ${route} — unresolved @id reference "${id}" at ${path}`);
      hardErrors++;
      localErrors++;
    }
  }

  // Base entities present?
  for (const t of REQUIRED_BASE_TYPES) {
    if (!typesPresent.has(t)) {
      console.error(`✗ ${route} — missing base entity @type "${t}"`);
      hardErrors++;
      localErrors++;
    }
  }

  if (localErrors === 0) {
    console.log(
      `✓ ${route} — ${blocks.length} block(s), ${definedIds.size} node id(s), types: ${[...typesPresent].join(", ")}`
    );
  }
}

console.log(`\nValidating JSON-LD against ${BASE}\n`);

let ROUTES;
try {
  ROUTES = await fetchRoutes(BASE);
} catch (err) {
  console.error(`✗ ${err.message}\n`);
  process.exit(1);
}

for (const route of ROUTES) {
  // eslint-disable-next-line no-await-in-loop
  await checkRoute(route);
}

console.log("");
if (placeholders.size > 0) {
  console.log(
    `⚠  ${placeholders.size} placeholder value(s) still in schema — this is your intake collection list:`
  );
  [...placeholders].sort().forEach((p) => console.log(`   • ${p}`));
  console.log("");
}

if (hardErrors > 0) {
  console.error(`✗ FAILED — ${hardErrors} structural error(s). Do not deploy.\n`);
  process.exit(1);
} else {
  console.log(
    `✓ PASSED — structure valid on all ${ROUTES.length} routes.${
      placeholders.size ? " (fill placeholders before launch)" : ""
    }\n`
  );
}
