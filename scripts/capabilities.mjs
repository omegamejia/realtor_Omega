#!/usr/bin/env node
/**
 * WHAT THIS SITE COULD BE DOING, AND ISN'T.
 *
 *   npm run catchup
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS, AND WHY IT IS NOT THE LAUNCH GATE
 *
 * `launch:check` answers "is anything here wrong?". This answers a different
 * question: "is anything here switched off?" — and nothing else asks it.
 *
 * The gap is real and it comes from how engine updates work. An engine update
 * ships FILES. Some of those files are complete on arrival: canonical tags and
 * social previews started working on every site the day they landed, and
 * nobody had to know. Others arrive inert. Reporting, pixels, heatmaps, the AI
 * caller's knowledge base, IDX — every one of those needs a human to create an
 * account, paste an ID, or set a secret before a single line of the shipped
 * code does anything at all.
 *
 * So an agent can take six months of improvements and be sitting on three
 * switched-off features with no way to find out. The gate will not tell them,
 * because nothing is broken. The changelog will not tell them, because it
 * describes what changed in the engine rather than what is missing from THEIR
 * site. This does.
 *
 * ---------------------------------------------------------------------------
 * THE RULES IT FOLLOWS
 *
 *   - Report, never fix. Every item here is somebody's decision — their money,
 *     their accounts, their clients' data. See .claude/rules/legal-compliance.md
 *     §9 on tracking, which is the item most likely to need a conversation.
 *   - Say what it unlocks, not what the field is called. "Your site can tell
 *     you which advert produced which lead" beats "metaPixelId is empty".
 *   - Never report something as missing when it was declined. A declined item
 *     lives in content/OPEN-ITEMS.md and is read back as declined.
 *   - Honest about what it cannot see. GitHub secrets and Vercel environment
 *     variables are not readable from here, so those are "cannot check from
 *     here", never "missing".
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => {
  try {
    return readFileSync(join(ROOT, p), "utf8");
  } catch {
    return "";
  }
};

const config = read("site.config.ts");
const openItems = read("content/OPEN-ITEMS.md");
const layout = read("app/layout.tsx");
const listings = read("content/listings.ts");
const brandVoice = read("content/brand-voice.md");

if (!config) {
  console.error("\n✗ cannot read site.config.ts — run this from the site's own folder.\n");
  process.exit(1);
}

/** Value of a `key: "..."` in the config, "" when blank or still a placeholder. */
function cfg(key) {
  const m = config.match(new RegExp(`\\b${key}\\s*:\\s*["'\`]([^"'\`]*)["'\`]`));
  const v = (m?.[1] ?? "").trim();
  if (!v || /[[\]]/.test(v)) return "";
  return v;
}
const flag = (key) => new RegExp(`\\b${key}\\s*:\\s*true\\b`).test(config);

/** Something the agent already said no to is not a gap. */
function declined(topic) {
  if (!openItems) return false;
  const line = openItems
    .split("\n")
    .find((l) => l.toLowerCase().includes(topic.toLowerCase()));
  return Boolean(line && /declined|not now|no thanks|skip/i.test(line));
}

const on = [];
const off = [];
const unknown = [];

/** @param {{name:string, unlocks:string, effort:string, how:string}} item */
const missing = (item) => off.push(item);
const working = (name) => on.push(name);

// ---- Measurement -----------------------------------------------------------
const google = cfg("googleTagId");
const meta = cfg("metaPixelId");
const clarity = cfg("clarityProjectId");

if (google) working("Google Analytics");
else if (!declined("google"))
  missing({
    name: "Nobody is counting your visitors",
    unlocks:
      "how many people came, which pages they read, and which ones made them leave",
    effort: "10 minutes, free",
    how: 'say "set up my reporting" — it walks you through the one screen you need',
  });

if (meta) working("Facebook/Instagram pixel");
else if (!declined("pixel"))
  missing({
    name: "Your adverts cannot tell which ones worked",
    unlocks:
      "Facebook and Instagram learn who actually enquires, so your money goes to the ads that produce leads instead of the ones that get likes",
    effort: "10 minutes, free",
    how: 'say "add my Meta pixel"',
  });

if (clarity) working("Heatmaps and session recordings");
else if (!declined("clarity") && !declined("heatmap"))
  missing({
    name: "You cannot see how people actually use the site",
    unlocks:
      "anonymous recordings and heatmaps — where people scroll to, and the useful one: what they click that is not a button",
    effort: "10 minutes, free with no traffic limit",
    how: 'say "add heatmaps"',
  });

// A tag running on a policy that never names it is a compliance problem, not a
// gap — see legal-compliance.md §9. launch:check fails on it; flagged here too
// because this is the report somebody actually reads.
const privacy = read("app/privacy/page.tsx") + read("content/pages.ts");
for (const [id, vendor] of [
  [google, "Google"],
  [meta, "Meta"],
  [clarity, "Microsoft Clarity"],
]) {
  if (id && privacy && !new RegExp(vendor.split(" ")[0], "i").test(privacy)) {
    missing({
      name: `Your privacy policy never mentions ${vendor}`,
      unlocks:
        "this one is not optional — you are running their tag, and both their terms and California law expect the policy to say so",
      effort: "5 minutes",
      how: `say "add ${vendor} to my privacy policy"`,
    });
  }
}

// ---- The weekly report ------------------------------------------------------
if (existsSync(join(ROOT, ".github/workflows/report.yml"))) {
  unknown.push({
    name: "Weekly report job is installed",
    detail:
      "whether its secrets are set is not readable from here — if no issue appeared last Monday, that is the reason",
  });
} else if (!declined("report")) {
  missing({
    name: "No weekly report",
    unlocks:
      "every Monday your site collects its own numbers and Claude talks you through what changed and what to do next",
    effort: "already built — it arrives with the next engine update",
    how: 'say "set up my reporting"',
  });
}

// ---- Lead capture and the AI caller -----------------------------------------
// The one key that turns on two things. Worth its own item rather than a line
// in the CRM note, because it is the most common reason a finished-looking site
// is doing nothing: the chat bubble is there and inert, and the daily articles
// never start. It is also the only item here that is not optional upside — the
// agent is already paying for both features.
unknown.push({
  name: "Your Anthropic key — the chat bubble and the daily articles both need it",
  detail:
    "it lives in Doppler and syncs to Vercel (chat) and GitHub (articles), none of " +
    "which is readable from here. Open the site and see whether the chat bubble " +
    'answers a real question — if it does not, say "set up my API key" and it is a ' +
    "two-minute job",
});

unknown.push({
  name: "Where your leads go",
  detail:
    "the CRM connection lives in an environment variable on the host, which cannot be read from here. If you have never seen a test lead arrive in GoHighLevel, assume it is not wired — run `npm run test:ghl`",
});

if (cfg("knowledgeBaseId")) working("AI caller knows your listings");
else if (!declined("voice") && !declined("caller"))
  missing({
    name: "Your AI phone assistant does not know your listings",
    unlocks:
      'it can answer "what do you have in Brentwood" and "anything under 700k" instead of taking a message',
    effort: "15 minutes",
    how: 'say "set up my AI caller"',
  });

if (cfg("embedUrl")) working("MLS search on /listings");
else if (!declined("idx"))
  missing({
    name: "Visitors cannot search the whole market on your site",
    unlocks:
      "every home for sale in your area, searchable here instead of on Zillow",
    effort:
      "two minutes of our work, but days to weeks of MLS and broker approval first — and it does not help you rank, because the frame belongs to the provider",
    how: 'say "set up IDX" — docs/IDX-SETUP.md is the whole procedure',
  });

// ---- The daily article job ---------------------------------------------------
const bank = read("content/question-bank.json");
const bankCount = (() => {
  try {
    return (JSON.parse(bank).questions || []).length;
  } catch {
    return 0;
  }
})();
const hasDaily = existsSync(join(ROOT, ".github/workflows/daily-article.yml"));

if (hasDaily && bankCount >= 20) working(`Daily articles (${bankCount} topics queued)`);
else if (!hasDaily && !declined("article"))
  missing({
    name: "Your site is not writing anything on its own",
    unlocks:
      "a researched, fact-checked post published every day without you doing anything — which is how a site goes from a brochure to something people find",
    effort: "already built — arrives with the next engine update",
    how: 'say "update my instructions"',
  });
else if (hasDaily && bankCount < 20)
  missing({
    name: `Only ${bankCount} article topics left in the queue`,
    unlocks:
      "the daily writer picks from this list and stops when it runs out, which it will in under a month at this size. Topping it up is the difference between a library and a site that quietly stopped",
    effort: "20 minutes, and it is reusable — the same list feeds your FAQ and your AI caller",
    how: 'say "add to my question bank"',
  });

// ---- Content and findability -------------------------------------------------
if (/metadataBase/.test(layout) && /alternates/.test(layout))
  working("Canonical URLs and social previews");
else
  missing({
    name: "Shared links have no preview, and Google is not told which page is real",
    unlocks:
      "a picture and a headline when anyone shares your site, and no duplicate-content confusion across your area pages",
    effort: "already built — arrives with the next engine update",
    how: 'say "update my engine"',
  });

// A listing can lack coordinates two ways: sitting at the seed's 0,0, or
// having no `geo` block at all. The second is the common one on a real site —
// it was 5 of 5 on the first site this ran against — and counting only the
// first missed every one of them.
const listingCount = (listings.match(/^\s{4}slug:\s*["']/gm) || []).length;
const withGeo = (listings.match(/\bgeo:\s*\{/g) || []).length;
const zeroGeo =
  (listings.match(/lat:\s*["']?0["']?\s*[,}]/g) || []).length +
  Math.max(0, listingCount - withGeo);
if (listingCount && zeroGeo)
  missing({
    name: `${zeroGeo} of ${listingCount} listing${listingCount > 1 ? "s" : ""} ha${zeroGeo > 1 ? "ve" : "s"} no map location`,
    unlocks:
      "the map pin, and the structured data an AI assistant reads to answer questions about the property",
    effort: "2 minutes each",
    how: 'say "add coordinates to my listings"',
  });

const areas = (config.match(/^\s{4}slug:/gm) || []).length;
const facts = (config.match(/localFacts\s*:/g) || []).length;
if (areas > 4 && facts < areas / 2)
  missing({
    name: `Most of your area pages have no local detail`,
    unlocks:
      "the difference between pages that rank and pages Google reads as the same page with the town name swapped — this is the single biggest ranking item on a site like this",
    effort: "the real work on this list: about 20 minutes per area",
    how: 'say "add local facts for my areas"',
  });

if (brandVoice && !/[[\]]/.test(brandVoice.slice(0, 2000))) working("Your writing voice is defined");
else if (!declined("voice"))
  missing({
    name: "AI writing does not sound like you yet",
    unlocks:
      "every page and post written from here on reads in your voice instead of generic agent copy",
    effort: "30 minutes, once",
    how: 'say "build my content engine"',
  });

if (!cfg("googleBusinessProfileUrl") && !declined("google business"))
  missing({
    name: "Your Google Business Profile is not linked",
    unlocks:
      "the map on your contact page, and the strongest local ranking signal there is",
    effort: "2 minutes if you already have one",
    how: 'say "link my Google Business Profile"',
  });

// ---- Output ------------------------------------------------------------------
const engineVersion = read(".engine-version");
console.log("\nWHAT YOUR SITE COULD BE DOING");
console.log("─".repeat(60));

if (on.length) {
  console.log(`\n✓ Already working (${on.length})`);
  for (const n of on) console.log(`   ${n}`);
}

if (off.length) {
  console.log(`\n→ Switched off (${off.length}) — each one is a choice, not a chore\n`);
  off.forEach((item, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${item.name}`);
    console.log(`    What it gives you: ${item.unlocks}`);
    console.log(`    Effort: ${item.effort}`);
    console.log(`    To do it: ${item.how}\n`);
  });
} else {
  console.log("\n✓ Nothing switched off that this can see.\n");
}

if (unknown.length) {
  console.log(`? Cannot check from here (${unknown.length})`);
  for (const u of unknown) console.log(`   ${u.name} — ${u.detail}`);
}

if (!flag("launchReady")) {
  console.log(
    "\nNote: this site is not live yet (launchReady is false), so it is hidden\n" +
      "from Google on purpose. Nothing above is urgent until you launch."
  );
}
if (engineVersion) {
  const d = engineVersion.match(/"date":\s*"([^"]+)"/)?.[1];
  if (d) console.log(`\nEngine last updated ${d}.`);
}
console.log(
  "\nNothing here has been changed. Pick any line and say the words after\n" +
    '"To do it", or say "catch me up" and Claude will take them in order.\n'
);
