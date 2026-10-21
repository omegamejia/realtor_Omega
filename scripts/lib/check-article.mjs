/**
 * Everything that has to be true before an article publishes itself.
 *
 * These are the launch gate's rules applied to one post before it exists on the
 * site, rather than after. The gate runs against a rendered page, which is too
 * late for an unattended writer: by then the post is committed, the build is
 * running, and the thing that catches it is a red cross on a deploy nobody is
 * watching.
 *
 * Every check here BLOCKS. There are no warnings, because a warning in an
 * unattended pipeline is a thing that scrolls past.
 */

/** Plain text of the whole post, for the checks that read like a human. */
export const bodyText = (post) =>
  post.sections
    .map((s) => `${s.heading} ${s.html}`)
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const words = (t) => (t.match(/\b[\w'-]+\b/g) || []).length;

/** Unambiguous steering language. Mirrors launch-check Layer 6. */
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

/**
 * The transaction is the agent's licence to describe, not ours. §5d.
 *
 * "commission" needs care, and the first live run proved it: a perfectly good
 * article about comparing two Brentwood neighbourhoods was held back because it
 * mentioned the **Planning Commission**. A civic body is not a fee.
 *
 * So the bare word only counts when something transactional is near it, and a
 * capitalised Commission preceded by another capitalised word is treated as the
 * proper noun it almost always is. The other terms have no such ambiguity and
 * stay literal.
 */
const TRANSACTION = /\b(buyer(?:'s)? agreement|closing cost|escrow|contingenc\w*|earnest money|dual agency)\b/i;
const COMMISSION_FEE =
  /\b(?:commissions?)\b(?=[^.]{0,80}\b(?:rate|split|percent|%|pay|paid|fee|negotiat|charge|cost)\b)|\b(?:rate|split|percent|%|pay|paid|fee|negotiat|charge)\b[^.]{0,80}?\bcommissions?\b/i;
const PROPER_COMMISSION = /\b[A-Z][a-z]+\s+Commission\b/;

const FILLER = [
  "placeholder", "lorem ipsum", "[placeholder", "tbd", "example.com",
  "yourdomain", "coming soon", "insert ", "xx%", "n/a",
];

/**
 * @param {object} post
 * @param {{minWords:number, maxWords:number, city:string, company:string}} opts
 * @returns {string[]} reasons it must not publish. Empty means it may.
 */
export function checkArticle(post, opts) {
  const problems = [];
  const text = bodyText(post);
  const n = words(text);
  const html = post.sections.map((s) => s.html).join(" ");

  if (n < opts.minWords) problems.push(`${n} words, needs ${opts.minWords}`);
  if (n > opts.maxWords) problems.push(`${n} words, over the ${opts.maxWords} ceiling`);

  for (const [re, why] of FAIR_HOUSING) {
    const hit = text.match(re);
    if (hit) problems.push(`Fair Housing: "${hit[0].trim()}" — ${why}`);
  }

  const txn = text.match(TRANSACTION);
  if (txn) problems.push(`transaction process: "${txn[0]}" — the agent's licence, not ours`);

  // Strip proper nouns before looking for the fee sense, so "Planning
  // Commission" cannot be mistaken for "commission".
  const deproper = text.replace(PROPER_COMMISSION, " ");
  const fee = deproper.match(COMMISSION_FEE);
  if (fee) {
    problems.push(`commission as a fee: "${fee[0].trim().slice(0, 60)}" — never ours to describe`);
  }

  const low = text.toLowerCase();
  for (const f of FILLER) {
    if (low.includes(f)) problems.push(`filler: "${f}"`);
  }
  if (/\[[^\]]{2,40}\]/.test(text)) problems.push("a [bracketed placeholder] survived into the body");

  if (text.includes("—")) problems.push("em dash (house voice bans it)");

  // Interlinking. A post nobody can navigate out of is a dead end.
  if (!/href="\/"/.test(html)) problems.push("no link to the home page");
  if (!/href="\/contact"/.test(html)) problems.push("no /contact call to action");
  const internal = (html.match(/href="\/[^"]*"/g) || []).length;
  if (internal < 3) problems.push(`only ${internal} internal links, needs 3`);

  if (/href="https?:\/\//.test(html) && !/rel="[^"]*nofollow/.test(html)) {
    // Not fatal on its own, but an unattended writer linking out freely is how
    // a blog becomes somebody else's backlink farm.
    const ext = (html.match(/href="https?:\/\/[^"]*"/g) || []).length;
    if (ext > 4) problems.push(`${ext} outbound links, more than 4 is a lot for one post`);
  }

  if (!new RegExp(opts.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(post.title)) {
    problems.push(`title does not name ${opts.city}`);
  }
  if (!new RegExp(opts.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text)) {
    problems.push(`body does not name ${opts.city}`);
  }

  if (/<h[1-6]/i.test(html)) problems.push("headings inside section html (the template renders them)");
  if (/style=|class=/i.test(html)) problems.push("inline styles or classes in section html");

  return problems;
}

/**
 * GATE 2 — the finished article against every existing body.
 *
 * Gate 1 compares a question to a title and cannot see text that does not exist
 * yet. This is the one that catches a genuinely different question that
 * produced genuinely the same article, which is the failure that builds a
 * doorway-page site one honest-looking day at a time.
 *
 * 0.55 matches the launch gate's own near-duplicate threshold, so an article
 * that passes here will not be flagged by `npm run launch:check` tomorrow.
 */
export const BODY_LIMIT = 0.55;

const STOP = new Set(
  ("the a an and or but of in on at to for with from by is are was were be been it its this that " +
    "you your we our they their how what why when where which who will can do does if about more " +
    "than then them there here as so not no yes into out up down over under again have has had " +
    "one two also just like get make take know see want need").split(" ")
);
const bag = (s) =>
  new Set((String(s).toLowerCase().match(/[a-z']{3,}/g) || []).filter((w) => !STOP.has(w)));

export function duplicateOf(post, existingBodies) {
  const b = bag(bodyText(post));
  let worst = 0;
  let against = "";
  for (const { title, text } of existingBodies) {
    const o = bag(text);
    let hit = 0;
    for (const x of b) if (o.has(x)) hit++;
    const j = hit / (b.size + o.size - hit || 1);
    if (j > worst) {
      worst = j;
      against = title;
    }
  }
  return worst >= BODY_LIMIT ? { score: worst, against } : null;
}
