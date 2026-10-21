#!/usr/bin/env node
/**
 * THE DAILY ARTICLE.
 *
 *   node scripts/daily-article.mjs --dry-run     pick a topic, write nothing
 *   node scripts/daily-article.mjs               write one article
 *   node scripts/daily-article.mjs --count 2     write two
 *
 * Runs unattended from .github/workflows/daily-article.yml. Everything here is
 * built around one assumption: nobody is watching. So every failure has to be
 * loud, every output has to be checked before it lands, and the job has to
 * refuse rather than guess.
 *
 * ---------------------------------------------------------------------------
 * WHY TOPIC SELECTION IS THE WHOLE JOB
 *
 * Writing an article is the easy part. Picking one worth writing, that the site
 * does not already have, is what decides whether this produces a library or a
 * pile of near-duplicates — and the second outcome is the one that arrives by
 * default. A real site built from this seed already carries 375 page pairs over
 * 55% similar; the mechanism that got it there was a template applied to a list
 * of towns, and an unattended writer is the same mechanism with a cron on it.
 *
 * So there are TWO dedupe gates and both block:
 *
 *   1. BEFORE writing — the candidate question is compared against every
 *      existing title and excerpt. Cheap, and it stops the obvious collisions.
 *   2. AFTER writing — the finished body is compared against every existing
 *      body. Expensive, and it is the one that catches a genuinely different
 *      question that produced genuinely the same article.
 *
 * One gate is not enough. The first cannot see text that does not exist yet;
 * the second cannot run before the money is spent. Both, or it leaks.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT WILL NOT DO
 *
 * It will not invent a statistic, it will not touch transaction process
 * (buyer agreements, commissions, closing mechanics — those are the agent's
 * licence, not ours; see .claude/rules/legal-compliance.md §5d), and it will
 * not publish anything the launch gate would fail. A held-back article counts
 * as a failed day and is reported, because "five a day" that silently becomes
 * three is a promise nobody kept.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeArticle, factCheck } from "./lib/write-article.mjs";
import { checkArticle, duplicateOf, bodyText, BODY_LIMIT } from "./lib/check-article.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED = join(ROOT, "content", "posts-generated.json");
const BANK = join(ROOT, "content", "question-bank.json");

const ARGS = process.argv.slice(2);
const DRY = ARGS.includes("--dry-run");
const COUNT = Number(ARGS[ARGS.indexOf("--count") + 1]) || 1;

const read = (p, fallback) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
};

/** Words that carry meaning, for similarity. Stopwords would make everything look alike. */
const STOP = new Set(
  ("the a an and or but of in on at to for with from by is are was were be been it its this that " +
    "you your we our they their how what why when where which who will can do does if about more " +
    "than then them there here as so not no yes into out up down over under again").split(" ")
);
const bag = (s) =>
  new Set(
    (String(s).toLowerCase().match(/[a-z']{3,}/g) || []).filter((w) => !STOP.has(w))
  );
const overlap = (a, b) => {
  let hit = 0;
  for (const x of a) if (b.has(x)) hit++;
  return hit;
};
const jaccard = (a, b) => overlap(a, b) / (a.size + b.size - overlap(a, b) || 1);

/**
 * How close two pieces of text are, for dedupe purposes.
 *
 * Jaccard alone is not enough, and this is not theoretical — it let a real
 * duplicate through in testing. "Why waterfront or inland?" scored 28% against
 * "Waterfront or Inland: The Discovery Bay Question Nobody Asks Early Enough"
 * and was accepted as a new topic, because Jaccard divides by the union: a
 * short candidate can never score high against a long title even when every
 * word it has is in that title.
 *
 * So containment is taken too — what share of the SHORTER text appears in the
 * longer one. The waterfront case becomes 100% and is rejected.
 *
 * Containment over-rejects on very short input ("home prices" is contained in
 * half the site), which is why a candidate with fewer than three meaningful
 * words is thrown out as an unusable bank entry instead. A question that vague
 * does not produce an article worth publishing anyway.
 */
const closeness = (a, b) => {
  const hit = overlap(a, b);
  const containment = hit / Math.min(a.size, b.size || 1);
  return Math.max(jaccard(a, b), containment);
};

/** Every post already on the site, hand-written and generated alike. */
function existingPosts() {
  const gen = read(GENERATED, []);
  const src = readFileSync(join(ROOT, "content", "posts.ts"), "utf8");
  const hand = [...src.matchAll(/^\s{4}title:\s*"([^"]+)"/gm)].map((m) => ({
    title: m[1],
    excerpt: "",
  }));
  return [...hand, ...gen.map((p) => ({ title: p.title, excerpt: p.excerpt ?? "" }))];
}

/**
 * GATE 1 — is this question already answered on the site?
 *
 * 0.42 was not guessed. Below it, genuinely different questions about the same
 * town start colliding ("what Brentwood costs" vs "why Brentwood is expensive"
 * score ~0.45 and ARE the same article). Above it, paraphrases slip through.
 */
const TOPIC_LIMIT = 0.42;

function pickTopic() {
  const bank = read(BANK, null);
  if (!bank || !Array.isArray(bank.questions) || !bank.questions.length) {
    return { error: "no question bank — content/question-bank.json is missing or empty" };
  }

  const taken = existingPosts().map((p) => bag(`${p.title} ${p.excerpt}`));
  const scored = [];
  const vague = [];

  for (const q of bank.questions) {
    const text = typeof q === "string" ? q : q.question;
    if (!text) continue;
    // Never write about the transaction itself. Their licence, not ours.
    if (/\b(commission|buyer agreement|closing cost|escrow|contingenc|earnest money|dual agency)\b/i.test(text)) {
      continue;
    }
    const b = bag(text);
    // Too vague to write from, and too short to dedupe reliably. See closeness().
    if (b.size < 3) {
      vague.push(text);
      continue;
    }
    const worst = taken.reduce((m, t) => Math.max(m, closeness(b, t)), 0);
    if (worst < TOPIC_LIMIT) scored.push({ question: text, closest: worst });
  }

  if (!scored.length) {
    return {
      error:
        "nothing left worth writing — every question in the bank is already covered. " +
        "This is the bank running dry, not a bug. Add questions before the job can run again.",
    };
  }
  // Furthest from anything existing wins.
  scored.sort((a, b) => a.closest - b.closest);
  return { topic: scored[0], remaining: scored.length, vague };
}

// --- context the writer needs ----------------------------------------------

function siteContext() {
  const src = readFileSync(join(ROOT, "site.config.ts"), "utf8");
  const pick = (k) => (src.match(new RegExp(`\\b${k}\\s*:\\s*"([^"]*)"`)) || [])[1] || "";
  const areas = [...src.matchAll(/slug:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
  const niches = [...src.matchAll(/^\s{4}slug:\s*"([a-z0-9-]+)"/gm)].map((m) => m[1]);
  const money = [
    "/", "/contact", "/listings", "/process",
    ...[...new Set(areas)].slice(0, 10).map((a) => `/areas/${a}`),
    ...[...new Set(niches)].slice(0, 6).map((n) => `/sellers/${n}`),
  ];
  let voice = "";
  try {
    voice = readFileSync(join(ROOT, "content", "brand-voice.md"), "utf8");
    if (/\[|\]/.test(voice.slice(0, 1500))) voice = ""; // still a scaffold
  } catch {}
  return {
    site: {
      brand: { logoText: pick("logoText") },
      agent: { name: pick("name") },
      location: { city: pick("city") },
    },
    voice,
    moneyPages: money,
  };
}

/** Existing bodies, for gate 2. Hand-written posts included. */
function existingBodies() {
  const out = read(GENERATED, []).map((p) => ({ title: p.title, text: bodyText(p) }));
  const src = readFileSync(join(ROOT, "content", "posts.ts"), "utf8");
  for (const m of src.matchAll(/title:\s*"([^"]+)"[\s\S]{0,12000}?sections:\s*\[([\s\S]*?)\n\s{4}\]/g)) {
    out.push({
      title: m[1],
      text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "),
    });
  }
  return out;
}

// --- run --------------------------------------------------------------------

const ctx = siteContext();
const MIN_WORDS = 900;
const MAX_WORDS = 1600;

console.log("\nDAILY ARTICLE");
console.log("\u2500".repeat(60));

if (!ctx.site.location.city) {
  console.error("\n\u2717 site.config.ts has no city yet. Nothing to write about.\n");
  process.exit(1);
}

const written = [];
const failures = [];

for (let i = 0; i < COUNT; i++) {
  const choice = pickTopic();
  if (choice.error) {
    failures.push(choice.error);
    break;
  }
  const { topic } = choice;
  console.log(`\n\u2192 ${topic.question}`);
  console.log(
    `   closest existing: ${(topic.closest * 100).toFixed(0)}%  (gate 1 blocks at ${TOPIC_LIMIT * 100}%)`
  );
  console.log(`   topics left in the bank: ${choice.remaining}`);

  if (DRY) continue;

  let post, searches, writeUsage;
  try {
    const r = await writeArticle({
      question: topic.question,
      site: ctx.site,
      voice: ctx.voice,
      moneyPages: ctx.moneyPages,
      existingTitles: existingPosts().map((p) => p.title),
    });
    post = r.post;
    searches = r.searches;
    writeUsage = r.usage;
  } catch (e) {
    failures.push(`could not write "${topic.question}": ${e.message}`);
    continue;
  }
  console.log(`   written: "${post.title}" (${searches} searches)`);

  // --- the checks, all blocking -------------------------------------------
  const problems = checkArticle(post, {
    minWords: MIN_WORDS,
    maxWords: MAX_WORDS,
    city: ctx.site.location.city,
    company: ctx.site.brand.logoText,
  });
  if (problems.length) {
    failures.push(`held back "${post.title}":\n       - ${problems.join("\n       - ")}`);
    continue;
  }

  const dup = duplicateOf(post, existingBodies());
  if (dup) {
    failures.push(
      `held back "${post.title}": gate 2 — ${(dup.score * 100).toFixed(0)}% the same as ` +
        `"${dup.against}" (blocks at ${BODY_LIMIT * 100}%)`
    );
    continue;
  }

  let unverified, checkUsage;
  try {
    const fc = await factCheck(post);
    unverified = fc.unverified;
    checkUsage = fc.usage;
  } catch (e) {
    failures.push(`held back "${post.title}": fact-check failed — ${e.message}`);
    continue;
  }
  if (unverified.length) {
    failures.push(
      `held back "${post.title}": ${unverified.length} claim(s) could not be sourced:\n       - ` +
        unverified.slice(0, 4).map((u) => `"${u.claim}" (${u.problem})`).join("\n       - ")
    );
    continue;
  }

  console.log("   checks: content \u2713  duplicate \u2713  fact-check \u2713");

  // Measured, not estimated. Krista asked what this costs an owner per month and
  // a number derived twice and verified never is not an answer.
  const tally = (u) => ({
    in: (u?.input_tokens ?? 0) + (u?.cache_creation_input_tokens ?? 0),
    cached: u?.cache_read_input_tokens ?? 0,
    out: u?.output_tokens ?? 0,
  });
  const w = tally(writeUsage);
  const c = tally(checkUsage);
  const IN = 4 / 1e6, OUT = 20 / 1e6, CACHED = 0.2 / 1e6; // Opus 5.5
  const cost =
    (w.in + c.in) * IN + (w.cached + c.cached) * CACHED + (w.out + c.out) * OUT;
  console.log(
    `   tokens: ${(w.in + c.in).toLocaleString()} in, ` +
      `${(w.out + c.out).toLocaleString()} out  ->  $${cost.toFixed(3)} this article`
  );
  console.log(
    `   at 1/day that is about $${(cost * 30).toFixed(2)}/month, ` +
      `at 5/day about $${(cost * 150).toFixed(2)}/month`
  );

  // --- land it -------------------------------------------------------------
  const all = read(GENERATED, []);
  if (all.some((p) => p.slug === post.slug)) {
    failures.push(`held back "${post.title}": slug ${post.slug} already exists`);
    continue;
  }
  post.date = new Date().toISOString().slice(0, 10);
  post.related = (post.related || []).filter((r) => r.href?.startsWith("/")).slice(0, 4);
  all.push(post);
  writeFileSync(GENERATED, JSON.stringify(all, null, 2) + "\n");
  written.push(post);
  console.log(`   published: /blog/${post.slug}`);
}

if (DRY) {
  console.log("\nDry run. Topic selection only.\n");
  process.exit(failures.length ? 1 : 0);
}

console.log("\n" + "\u2500".repeat(60));
console.log(`${written.length} published, ${failures.length} held back`);

for (const f of failures) console.error(`\n\u2717 ${f}`);

if (!written.length) {
  console.error(
    "\nNothing published today. Reported rather than skipped quietly, because a day\n" +
      "that produces nothing and says nothing is indistinguishable from one that worked.\n"
  );
  process.exit(1);
}
if (failures.length) process.exit(1);
console.log("");
