/**
 * WHAT IS DIFFERENT ABOUT THIS SEED'S ARTICLES. Nothing else.
 *
 * The daily writer is shared code: `daily-article.mjs`, `write-article.mjs` and
 * `check-article.mjs` are byte-for-byte identical in every seed, so a fix to
 * the writer is one diff applied three times without reading it three times.
 *
 * Everything a seed does differently lives here. That split was not a
 * preference, it was forced: the three seeds disagree about the shape of a
 * post (sections versus one html field), about where the business name lives
 * in the config, about whether the business even has a town, and about which
 * law applies to its claims. Copying the realtor writer sideways would have
 * shipped Fair Housing checks to a plumber and demanded a city of a consultant
 * who does not have one.
 *
 * THE CONTRACT. A profile exports exactly these. Adding a seed means writing
 * one of these files and nothing else.
 *
 *   key                  short name, for messages
 *   identity(src)         -> { company, place }        place "" if not local
 *   moneyPages(src)       -> string[]                  pages a post should link
 *   topics()              -> { topics } | { error }    the question bank
 *   forbidden(text)       -> false | "why"             topics never to write
 *   writerRules           -> string                    extra HARD RULES
 *   postSchema            -> JSON schema               the model must satisfy
 *   normalize(raw, meta)  -> post                      into THIS seed's shape
 *   bodyText(post)        -> string                    plain text, for checks
 *   htmlOf(post)          -> string                    raw html, for checks
 *   extraChecks(c)        -> string[]                  blocking, seed-specific
 *   requirePlaceInTitle   -> boolean
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const key = "realtor";

/**
 * Real estate is the one seed where the town is not optional. A post that does
 * not name the market is not a local post, and local is the whole proposition.
 */
export const requirePlaceInTitle = true;

export function identity(src) {
  const pick = (k) => (src.match(new RegExp(`\\b${k}\\s*:\\s*"([^"]*)"`)) || [])[1] || "";
  return { company: pick("logoText") || pick("name"), place: pick("city") };
}

/**
 * Pull the slugs out of ONE named array in site.config.ts.
 *
 * Tolerates both shapes the seeds use: a top-level `const serviceAreas:
 * ServiceArea[] = [...]` and an inline property `catalogue: [...] as Service[]`.
 * Returns [] when the array is missing or empty, so a half-configured site
 * contributes nothing rather than a guess.
 */
/**
 * Pages a post should link to, read FROM THE RIGHT ARRAY.
 *
 * The first version took the first ten `slug:` matches in the file and prefixed
 * them all with `/areas/`. On the placeholder seed that looked fine. On a real
 * configured site it is wrong, because `buyerNiches` and `sellerNiches` are
 * declared BEFORE `serviceAreas`, so it produced `/areas/first-time-buyers`
 * and `/areas/buying-a-home` — a 404 and a redirect, handed to the writer as
 * pages worth linking to. Caught on a live site, not here.
 *
 * So each array is read by name and gets its own route prefix. An array that is
 * missing or empty contributes nothing rather than guessing.
 */
const block = (src, name) => {
  const re = new RegExp(
    `(?:const\\s+${name}\\s*(?::[^=]*)?=\\s*\\[|\\b${name}\\s*:\\s*\\[)([\\s\\S]*?)\\n\\s{0,4}\\]`
  );
  const m = src.match(re);
  if (!m) return [];
  return [...new Set([...m[1].matchAll(/\bslug:\s*"([a-z0-9-]+)"/g)].map((x) => x[1]))];
};

export function moneyPages(src) {
  return [
    "/", "/contact", "/listings", "/process",
    ...block(src, "serviceAreas").slice(0, 10).map((a) => `/areas/${a}`),
    ...block(src, "sellerNiches").slice(0, 4).map((n) => `/sellers/${n}`),
    ...block(src, "buyerNiches").slice(0, 4).map((n) => `/buyers/${n}`),
  ];
}

/**
 * The bank. `content/questions.ts` is the shared spine across the seeds — one
 * list feeding the FAQ blocks, the FAQ schema, the phone assistant and the chat
 * widget — and it is the preferred source. `content/question-bank.json` is the
 * older realtor-only file and is still read, so a site that has one keeps
 * working; `npm run catchup` is what tells them to move.
 */
export function topics(root) {
  const fromTs = (() => {
    try {
      const src = readFileSync(join(root, "content", "questions.ts"), "utf8");
      return [...src.matchAll(/\bq:\s*"((?:[^"\\]|\\.)*)"/g)]
        .map((m) => m[1].replace(/\\"/g, '"'))
        .filter((q) => q && !/^\[/.test(q));
    } catch { return []; }
  })();
  if (fromTs.length) return { topics: fromTs, source: "content/questions.ts" };

  try {
    const bank = JSON.parse(readFileSync(join(root, "content", "question-bank.json"), "utf8"));
    const qs = (bank.questions || [])
      .map((q) => (typeof q === "string" ? q : q.question))
      .filter(Boolean);
    if (qs.length) return { topics: qs, source: "content/question-bank.json" };
  } catch {}

  return { error: "no question bank — content/questions.ts and content/question-bank.json are both missing or empty" };
}

/**
 * The transaction is the licensee's to describe. Never a topic, never a line.
 *
 * This shares the body check's proper-noun handling below, and it has to. The
 * naive version of this regex rejected "what does the Planning Commission do"
 * as a question about fees — the same false positive that held back a good
 * article, reappearing one layer upstream where it was WORSE: the body check
 * reports what it held back, the topic filter drops the question silently and
 * nobody ever learns the question was skipped.
 */
export function forbidden(text) {
  if (/\b(buyer(?:'s)? agreement|closing cost|escrow|contingenc\w*|earnest money|dual agency)\b/i.test(text)) {
    return "the mechanics of the transaction are the agent's licence, not ours";
  }
  if (COMMISSION_FEE.test(text.replace(PROPER_COMMISSION, " "))) {
    return "commission as a fee is never ours to describe";
  }
  return false;
}

/**
 * How a post is SHAPED on this seed. Separate from writerRules, which is law.
 *
 * This has to be per-seed and the first live run on service-site-seed proved
 * why: the shared prompt said "no headings inside html", which is correct here
 * and wrong there, so the writer produced a 1,200-word wall with no structure
 * and the checker held it back. Correct behaviour, wrong instruction.
 */
export const structureRules = `- At least four sections, each with its own heading in the \`heading\` field.
- Section html is clean HTML: <p>, <ul>, <li>, <strong>, <a>. NO headings inside the html (the page renders the heading field), no inline styles, no classes.`;

export const writerRules = `3. Never write about the mechanics of the transaction: commissions, buyer agreements, closing costs, escrow, contingencies, who pays what. Those vary by state and are the agent's licence to describe, not yours.
4. Fair Housing. Describe the PROPERTY and the PLACE, never the people who live there or who would "fit". Banned outright: "great/perfect for families", "family-friendly", "safe neighborhood", "good schools", "exclusive", "ideal for young professionals". Name a school or a crime statistic with a source, or say nothing.`;

export const postSchema = {
  type: "object",
  additionalProperties: false,
  required: ["slug","title","metaTitle","metaDescription","city","readMinutes","excerpt","primaryKeyword","secondaryKeywords","sections","related"],
  properties: {
    slug: { type: "string" }, title: { type: "string" },
    metaTitle: { type: "string" }, metaDescription: { type: "string" },
    city: { type: "string" }, readMinutes: { type: "integer" },
    excerpt: { type: "string" }, primaryKeyword: { type: "string" },
    secondaryKeywords: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["heading", "html"],
        properties: { heading: { type: "string" }, html: { type: "string" } },
      },
    },
    related: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["label", "href"],
        properties: { label: { type: "string" }, href: { type: "string" } },
      },
    },
  },
};

export const normalize = (raw, { date }) => ({
  ...raw,
  date,
  // Only internal links survive. An outbound link in "related" turns the
  // site's own further-reading rail into somebody else's traffic.
  related: (raw.related || []).filter((r) => r.href?.startsWith("/")).slice(0, 4),
});

export const bodyText = (post) =>
  post.sections.map((s) => `${s.heading} ${s.html}`).join(" ")
    .replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();

export const htmlOf = (post) => post.sections.map((s) => s.html).join(" ");

/** Mirrors launch-check Layer 6. Unambiguous steering only. */
const FAIR_HOUSING = [
  [/\b(perfect|great|ideal) for families\b/i, "familial status"],
  [/\bfamily[- ]friendly (neighborhood|community|area)\b/i, "familial status"],
  [/\bsafe (neighborhood|community|area|part of town)\b/i, "'safe' reads as coded language about residents"],
  [/\bexclusive (neighborhood|community)\b/i, "exclusionary framing"],
  [/\b(no children|adults only|no kids)\b/i, "familial status"],
  [/\b(good|great|best|excellent|top) schools\b/i, "school-quality claims steer; name the school or cite a source"],
  [/\bwalking distance to (a )?church(es)?\b/i, "religion"],
  [/\bbachelor pad\b/i, "sex/marital framing"],
];

const TRANSACTION = /\b(buyer(?:'s)? agreement|closing cost|escrow|contingenc\w*|earnest money|dual agency)\b/i;
/**
 * "commission" needs care, and the first live run proved it: a good article
 * about two Brentwood neighbourhoods was held back for mentioning the Planning
 * Commission. A civic body is not a fee. So the bare word only counts with
 * something transactional near it, and a capitalised Commission preceded by
 * another capitalised word is treated as the proper noun it almost always is.
 */
const COMMISSION_FEE =
  /\b(?:commissions?)\b(?=[^.]{0,80}\b(?:rate|split|percent|%|pay|paid|fee|negotiat|charge|cost)\b)|\b(?:rate|split|percent|%|pay|paid|fee|negotiat|charge)\b[^.]{0,80}?\bcommissions?\b/i;
const PROPER_COMMISSION = /\b[A-Z][a-z]+\s+Commission\b/;

export function extraChecks({ text, html }) {
  const problems = [];
  // This seed carries each heading beside its html, so a heading inside the
  // html would render twice.
  if (/<h[1-6]/i.test(html)) problems.push("headings inside section html (the template renders them)");

  for (const [re, why] of FAIR_HOUSING) {
    const hit = text.match(re);
    if (hit) problems.push(`Fair Housing: "${hit[0].trim()}" — ${why}`);
  }
  const txn = text.match(TRANSACTION);
  if (txn) problems.push(`transaction process: "${txn[0]}" — the agent's licence, not ours`);

  const fee = text.replace(PROPER_COMMISSION, " ").match(COMMISSION_FEE);
  if (fee) problems.push(`commission as a fee: "${fee[0].trim().slice(0, 60)}" — never ours to describe`);
  return problems;
}
