#!/usr/bin/env node
/**
 * GHL CONNECTION TEST — proves the whole capture pipe end to end.
 *
 * This is the test the `ghl-integration` skill requires before anyone may call
 * GoHighLevel "wired". It walks the real chain:
 *
 *   auth → discover custom fields → resolve the folder (via a marker field)
 *        → create a test contact with custom field values + tag
 *        → read the contact back and ASSERT every value landed
 *        → delete the test contact
 *
 * A 200 from the create call does NOT mean the data landed — that's exactly the
 * failure this script exists to catch, so it always reads back and asserts.
 *
 * Usage:
 *   GHL_API_TOKEN=… node scripts/ghl-test.mjs --dry-run     # no network writes
 *   GHL_API_TOKEN=… node scripts/ghl-test.mjs               # live test
 *   GHL_API_TOKEN=… node scripts/ghl-test.mjs --keep        # skip the cleanup delete
 *
 * The token needs Contacts + Custom Fields read/write scopes. It is read from the
 * environment only — never pass it as an argument, never commit it.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Override only for testing this script against a mock. Never set in normal use.
const API = process.env.GHL_API_BASE || "https://services.leadconnectorhq.com";
const VERSION = "2021-07-28";

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const KEEP = argv.includes("--keep");

const TOKEN = process.env.GHL_API_TOKEN;

// Location id comes from site.config.ts so the test uses the same value the app does.
function locationIdFromConfig() {
  try {
    const src = readFileSync(join(__dirname, "..", "site.config.ts"), "utf8");
    const m = src.match(/locationId:\s*"([^"]+)"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
const LOCATION_ID = process.env.GHL_LOCATION_ID || locationIdFromConfig();

const results = [];
function record(step, ok, detail = "") {
  results.push({ step, ok, detail });
  const icon = ok === null ? "•" : ok ? "✓" : "✗";
  console.log(`${icon} ${step}${detail ? ` — ${detail}` : ""}`);
}

async function ghl(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Version: VERSION,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body };
}

// ---- preflight ------------------------------------------------------------
console.log("\nGHL CONNECTION TEST\n");

if (!TOKEN) {
  console.error(
    "✗ GHL_API_TOKEN is not set.\n\n" +
      "  Create a Private Integration Token in GHL:\n" +
      "    Settings → Private Integrations → Create\n" +
      "    scopes: View/Edit Contacts + View/Edit Custom Fields\n\n" +
      "  Then run:  GHL_API_TOKEN=<token> node scripts/ghl-test.mjs\n"
  );
  process.exit(1);
}
if (!LOCATION_ID || LOCATION_ID.startsWith("[")) {
  console.error(
    "✗ No usable Location ID.\n" +
      "  Set site.config.ts → ghl.locationId, or pass GHL_LOCATION_ID=<id>.\n"
  );
  process.exit(1);
}
record("preflight", true, `location ${LOCATION_ID}, token present`);

if (DRY) {
  console.log(
    "\n(dry run — validating wiring only, no network calls will be made)\n"
  );
  record("dry run", null, "skipping live calls");
  console.log(
    "\nWiring looks sane. Re-run without --dry-run to test against GHL.\n"
  );
  process.exit(0);
}

// ---- 1. auth + custom field discovery -------------------------------------
const fieldsRes = await ghl(`/locations/${LOCATION_ID}/customFields`);
if (!fieldsRes.ok) {
  record("auth / list custom fields", false, `HTTP ${fieldsRes.status} ${JSON.stringify(fieldsRes.body).slice(0, 200)}`);
  console.error(
    "\n✗ FAILED at the first call. Usually: wrong token, wrong location, or missing Custom Fields scope.\n"
  );
  process.exit(1);
}
const customFields = fieldsRes.body.customFields || fieldsRes.body.customField || [];
record("auth / list custom fields", true, `${customFields.length} field(s) found`);

// ---- 2. resolve the folder via any field that has a parent ----------------
const withParent = customFields.filter((f) => f.parentId);
const folderIds = [...new Set(withParent.map((f) => f.parentId))];
record(
  "resolve custom-field folder",
  folderIds.length > 0,
  folderIds.length
    ? `parentId(s): ${folderIds.join(", ")}`
    : "no field has a parentId — create a folder + one marker field inside it in the GHL UI"
);

// ---- 3. create the test contact -------------------------------------------
const stamp = Date.now();
const email = `site-connection-test+${stamp}@example.com`;
const tag = "site-connection-test";

// Send a value for up to 3 existing custom fields so we can assert round-trip.
const probeFields = customFields
  .filter((f) => (f.dataType || "").toUpperCase() === "TEXT")
  .slice(0, 3);
const sentValues = Object.fromEntries(
  probeFields.map((f) => [f.id, `test-${stamp}`])
);

const createRes = await ghl("/contacts/", {
  method: "POST",
  body: JSON.stringify({
    locationId: LOCATION_ID,
    firstName: "Site",
    lastName: "ConnectionTest",
    email,
    source: "Automated connection test",
    tags: [tag],
    // MUST be `id`. The API silently discards `key` (verified 2026-07-30).
    customFields: probeFields.map((f) => ({
      id: f.id,
      field_value: `test-${stamp}`,
    })),
  }),
});
const contactId = createRes.body?.contact?.id || createRes.body?.id;
record("create test contact", createRes.ok && !!contactId, contactId ? `id ${contactId}` : `HTTP ${createRes.status} ${JSON.stringify(createRes.body).slice(0, 200)}`);

if (!contactId) {
  console.error("\n✗ Could not create the test contact — stopping before assertions.\n");
  process.exit(1);
}

// ---- 4. read back and ASSERT ----------------------------------------------
const readRes = await ghl(`/contacts/${contactId}`);
const contact = readRes.body?.contact || {};
record("read contact back", readRes.ok, readRes.ok ? "" : `HTTP ${readRes.status}`);

record(
  "email matches",
  (contact.email || "").toLowerCase() === email.toLowerCase(),
  contact.email || "(none)"
);

const gotTags = (contact.tags || []).map((t) => String(t).toLowerCase());
record("tag applied", gotTags.includes(tag), gotTags.join(", ") || "(none)");

const returned = contact.customFields || contact.customField || [];
if (probeFields.length === 0) {
  record("custom field round-trip", null, "no TEXT custom fields existed to probe — create one and re-run");
} else {
  for (const f of probeFields) {
    const hit = returned.find((r) => r.id === f.id);
    const val = hit?.value ?? hit?.field_value;
    record(
      `custom field "${f.name}" round-trip`,
      val === sentValues[f.id],
      val === undefined ? "not returned" : `got "${val}"`
    );
  }
}

// ---- 5. cleanup ------------------------------------------------------------
if (KEEP) {
  record("cleanup", null, `--keep set; contact ${contactId} left in place — delete it manually`);
} else {
  const del = await ghl(`/contacts/${contactId}`, { method: "DELETE" });
  record("delete test contact", del.ok, del.ok ? `removed ${contactId}` : `HTTP ${del.status} — DELETE MANUALLY: ${contactId}`);
}

// ---- verdict ---------------------------------------------------------------
const failed = results.filter((r) => r.ok === false);
const skipped = results.filter((r) => r.ok === null);
console.log("");
if (failed.length === 0) {
  console.log(`✓ GHL CONNECTION VERIFIED — ${results.filter((r) => r.ok).length} check(s) passed${skipped.length ? `, ${skipped.length} skipped` : ""}.\n`);
  process.exit(0);
}
console.error(`✗ GHL NOT VERIFIED — ${failed.length} check(s) failed:\n${failed.map((f) => `   - ${f.step}: ${f.detail}`).join("\n")}\n`);
process.exit(1);
