#!/usr/bin/env node
/**
 * SMOKE TEST — does the site actually WORK?
 *
 * The other gates check what the site SAYS (no filler, valid schema, real
 * interlinks). Nothing checked that it FUNCTIONS. That gap let a real bug ship:
 * the contact-form message stopped reaching the CRM and every content gate still
 * passed, because the words on the page were fine.
 *
 * This covers the critical path — the thing the site exists to do:
 *   a visitor submits a form and the lead is accepted.
 *
 * Runs against a running server. No external services required: /api/lead
 * answers in seed mode when GHL isn't configured, which is exactly what CI wants.
 *
 * Usage: node scripts/smoke.mjs [baseUrl]
 */
const BASE = process.argv[2] || process.env.SMOKE_BASE_URL || "http://localhost:3000";

let failures = 0;
const ok = (name, pass, detail = "") => {
  console.log(`${pass ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
};

async function json(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let parsed = null;
  try { parsed = await res.json(); } catch {}
  return { status: res.status, body: parsed };
}

console.log(`\nSMOKE TEST against ${BASE}\n`);

// 1. The site serves at all.
try {
  const r = await fetch(BASE);
  ok("homepage responds", r.ok, `HTTP ${r.status}`);
} catch (e) {
  ok("homepage responds", false, e.message);
  console.error("\n✗ server unreachable — start it first.\n");
  process.exit(1);
}

// 2. THE critical path: a full contact submission is accepted.
const full = await json("/api/lead", {
  firstName: "Smoke",
  lastName: "Test",
  email: `smoke-test+${Date.now()}@example.com`,
  phone: "9255550100",
  message: "Smoke test message. If this is missing from the CRM, the note path broke.",
  source: "smoke test",
  tag: "smoke-test",
});
ok("contact form accepted", full.status === 200, `HTTP ${full.status}`);
ok("lead route reports a mode", !!full.body?.mode, full.body?.mode ?? "(none)");

// 3. Funnel submission WITH extra answers (the custom-field path).
const funnel = await json("/api/lead", {
  firstName: "Smoke",
  email: `smoke-funnel+${Date.now()}@example.com`,
  fields: { smokeQuestion: "smoke answer" },
  tag: "smoke-test-funnel",
});
ok("funnel form with extra answers accepted", funnel.status === 200, `HTTP ${funnel.status}`);

// 4. Validation actually rejects bad input (a form that accepts anything is broken too).
const bad = await json("/api/lead", { firstName: "", email: "not-an-email" });
ok("invalid submission rejected", bad.status === 422, `HTTP ${bad.status}`);

// 5. Honeypot silently absorbs bots.
const bot = await json("/api/lead", {
  firstName: "Bot", email: `bot+${Date.now()}@example.com`, company: "spam",
});
ok("honeypot absorbs bots", bot.status === 200, `HTTP ${bot.status}`);

// 6. Chat endpoint reports its configuration state without crashing.
try {
  const r = await fetch(`${BASE}/api/chat`);
  const b = await r.json().catch(() => ({}));
  ok("chat endpoint healthy", r.ok && typeof b.configured === "boolean",
     `configured=${b.configured}`);
} catch (e) {
  ok("chat endpoint healthy", false, e.message);
}

// 7. Core routes render.
for (const path of ["/contact", "/listings", "/sitemap.xml", "/robots.txt"]) {
  try {
    const r = await fetch(`${BASE}${path}`);
    ok(`${path} renders`, r.ok, `HTTP ${r.status}`);
  } catch (e) {
    ok(`${path} renders`, false, e.message);
  }
}

console.log("");
if (failures) {
  console.error(`✗ SMOKE TEST FAILED — ${failures} check(s).\n`);
  process.exit(1);
}
console.log("✓ SMOKE TEST PASSED — the critical path works.\n");
