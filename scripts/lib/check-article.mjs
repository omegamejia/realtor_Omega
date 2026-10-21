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
 *
 * SHARED ACROSS EVERY SEED, BYTE FOR BYTE. What one seed checks and another
 * does not — Fair Housing for real estate, medical claims for a clinic, a town
 * in the title for a local business but not a consultant — comes from
 * `article-profile.mjs` through `profile.extraChecks`. Do not add a
 * seed-specific rule to this file; it will be overwritten by the next engine
 * update and silently lost.
 */

const words = (t) => (t.match(/\b[\w'-]+\b/g) || []).length;

/**
 * THE FTC REACHES EVERY BUSINESS IN EVERY SEED, so this layer is shared.
 *
 * An unattended writer produces unsubstantiated superlatives by default,
 * because that is what marketing copy sounds like in its training data. "The
 * best plumber in town" and "guaranteed results" are advertising claims a real
 * licensed business has to be able to back up, and the writer cannot back up
 * anything. A specific sourced fact is always allowed; the claim shape is not.
 *
 * Fair Housing is NOT here — it is housing law and belongs to the realtor
 * profile. HIPAA is not here either. What is here applies to a plumber, an
 * agent and a consultant alike.
 */
const CLAIMS = [
  [/\b(?:the\s+)?(?:#\s?1|number one|No\.\s?1)\b/i, "a ranking claim needs a source"],
  [/\bbest (?:in|of) (?:the )?(?:town|city|area|state|county|[A-Z][a-z]+)\b/i, "superlative nobody can substantiate"],
  [/\b(?:voted|rated|awarded) (?:the )?(?:best|top|#\s?1)\b/i, "an award claim needs the awarding body and year"],
  // No exception for a nearby "warranty". The writer cannot know whether this
  // business offers one, so a guarantee it wrote is a promise nobody made.
  [/\bguarantee(?:d|s)?\b/i, "a guarantee is a contract term, not a sentence a writer may add"],
  [/\b100%\s*(?:satisfaction|success|guaranteed|effective)\b/i, "an absolute claim needs substantiation"],
  [/\b(?:cheapest|lowest priced?|lowest rates?|unbeatable price)\b/i, "a price claim needs to be true everywhere it is read"],
  [/\b(?:cure|cures|cured|heals?|treats?)\b[^.]{0,30}\b(?:anxiety|depression|cancer|disease|pain|illness)\b/i, "a health-outcome claim is the most enforced claim there is"],
  [/\brisk[- ]free\b/i, "'risk free' is a claim about money, not a description"],
  [/\b(?:always|never) (?:sells?|closes?|works?|succeeds?)\b/i, "an absolute about outcomes cannot be substantiated"],
];

const FILLER = [
  "placeholder", "lorem ipsum", "[placeholder", "tbd", "example.com",
  "yourdomain", "coming soon", "insert ", "xx%", "n/a",
];

/**
 * @param {object} post
 * @param {object} opts  { minWords, maxWords, place, company, profile }
 * @returns {string[]} reasons it must not publish. Empty means it may.
 */
export function checkArticle(post, opts) {
  const { profile } = opts;
  const problems = [];
  const text = profile.bodyText(post);
  const html = profile.htmlOf(post);
  const n = words(text);

  if (n < opts.minWords) problems.push(`${n} words, needs ${opts.minWords}`);
  if (n > opts.maxWords) problems.push(`${n} words, over the ${opts.maxWords} ceiling`);

  // Whatever this seed's law says. See article-profile.mjs.
  problems.push(...profile.extraChecks({ post, text, html, opts }));

  for (const [re, why] of CLAIMS) {
    const hit = text.match(re);
    if (hit) problems.push(`unsubstantiated claim: "${hit[0].trim()}" — ${why}`);
  }

  const low = text.toLowerCase();
  for (const f of FILLER) if (low.includes(f)) problems.push(`filler: "${f}"`);
  if (/\[[^\]]{2,40}\]/.test(text)) problems.push("a [bracketed placeholder] survived into the body");

  if (text.includes("—")) problems.push("em dash (house voice bans it)");

  // Interlinking. A post nobody can navigate out of is a dead end.
  if (!/href="\/"/.test(html)) problems.push("no link to the home page");
  if (!/href="\/contact"/.test(html)) problems.push("no /contact call to action");
  const internal = (html.match(/href="\/[^"]*"/g) || []).length;
  if (internal < 3) problems.push(`only ${internal} internal links, needs 3`);

  if (/href="https?:\/\//.test(html)) {
    // Not fatal on its own, but an unattended writer linking out freely is how
    // a blog becomes somebody else's backlink farm.
    const ext = (html.match(/href="https?:\/\/[^"]*"/g) || []).length;
    if (ext > 4) problems.push(`${ext} outbound links, more than 4 is a lot for one post`);
  }

  // A place in the title is required where the business IS a place (a local
  // trade, an agent) and wrong where it is not (a coach with clients in nine
  // states). The profile decides; this file does not guess.
  if (opts.place) {
    const re = new RegExp(opts.place.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (profile.requirePlaceInTitle && !re.test(post.title)) {
      problems.push(`title does not name ${opts.place}`);
    }
    if (!re.test(text)) problems.push(`body does not name ${opts.place}`);
  }

  // NOT a shared rule. Two seeds carry each heading beside its html and must
  // not have headings inside it; service-site-seed stores one html body whose
  // own type requires h2/h3. Shared, this check held back every article on
  // that seed. The profile decides. Styles and classes stay shared: no seed's
  // post body may carry them.
  if (/style=|class=/i.test(html)) problems.push("inline styles or classes in the post body");

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

export function duplicateOf(post, existingBodies, profile) {
  const b = bag(profile.bodyText(post));
  let worst = 0;
  let against = "";
  for (const { title, text } of existingBodies) {
    const o = bag(text);
    let hit = 0;
    for (const x of b) if (o.has(x)) hit++;
    const j = hit / (b.size + o.size - hit || 1);
    if (j > worst) { worst = j; against = title; }
  }
  return worst >= BODY_LIMIT ? { score: worst, against } : null;
}
