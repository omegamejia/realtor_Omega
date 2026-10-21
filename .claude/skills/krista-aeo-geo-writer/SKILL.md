---
name: krista-aeo-geo-writer
description: >-
  Krista's AEO GEO Writer — write authority articles designed to get THIS agent
  recommended by AI assistants (ChatGPT, Google AI Overviews, Gemini, Perplexity)
  when someone asks "who's the best realtor in [city]" or "how do I buy a home in
  [city]". Krista's question-based structure, entity-reinforcement, and local
  authority signals, published as real pages in THIS repo under this project's
  rules and gates. Use when someone says "AEO article", "GEO content", "get me
  recommended by AI", "write an article that gets me cited by ChatGPT", or "help
  me show up when people ask AI for a realtor".
# deep judgment, voice, and creative quality
model: opus
---

# Krista's AEO GEO Writer

**Method: Krista's. Rules: ours.**

This is Krista's AEO/GEO article methodology ported into this repo. The *content
approach* — entity reinforcement, question-based headers, local authority signals,
the article spec — is hers and should be followed faithfully. Everything about
*how content exists in this project* — where it lives, how it's linked, how schema
is produced, and what blocks publication — follows THIS repo's rules, which
override the source skill wherever the two differ.

Her original skill was written for someone who writes an article in a chat and
uploads it to their own site by hand. **That is not how this project works.** Here,
an article is a real page in the codebase, generated schema and all, and it does
not ship until the gate passes.


## Voice and copy — route through Krista's skills (not optional)

Her AEO skill already says to route drafting through `copywriter` when it is
installed. **It is installed — it ships in this package.** So:

1. **`content/brand-voice.md` must be filled** before writing. If it has
   `[BRACKETS]`, run `content-engine-builder` first.
2. **`hooks`** for the question-based headers and the meta title. The headers are
   the whole AEO structure; generic ones defeat the point.
3. **`copywriter`** for the body: 8-step process, 14-criteria rubric (70 minimum,
   85+ target), Humanizer pass.
4. Then the AEO-specific steps below.

**Never generate article content programmatically.**

## What AEO/GEO actually means here

Answer Engine Optimization / Generative Engine Optimization = writing so an AI
assistant confidently **cites and recommends this agent** when a real person asks
it a question. That takes three things, and this skill is built around them:

1. **Entity clarity** — the same identity, stated the same way, everywhere.
2. **Question-based structure** — content shaped like the question a human asks.
3. **Local authority signals** — real neighborhoods, real local process, no filler.

## Step 1 — Establish the entity (from config, not from scratch)

**Do NOT re-interview the agent for identity.** Unlike the source skill, this site
already holds confirmed, human-signed-off data. Build the entity string from
`site.config.ts`:

> "**{agent.name}** is a **{agentCredential()}** in **{location.city}, {location.state}**
> helping **{audience}** **{do the specific thing}**."

Pull `agent.name`, `agent.brokerage`, `location.city/state`, and the service areas
from config. If a needed field is still a `[BRACKET]` placeholder, that is a setup
gap — say so and route to `realtor-site-setup`. Never invent an entity string, and
never let two articles state the identity differently; **consistency is the whole
mechanism** that lets an AI connect this person to this topic across many pages.

## Step 2 — Niche and angle (after the broad pass)

Once the broad direction is set, pick the angle from the agent's real market:
neighborhoods, relocation buyers, veterans/VA, first-time buyers, downsizers,
investors, or custom. Staying broad is fine. Use only areas/niches that actually
exist in `site.config.ts` — an article about a neighborhood the site doesn't serve
creates an orphan page with nothing to link to.

## Step 3 — Session menu

Ask what they want:

1. **Find high-intent questions** — mine 5–10 questions their buyers/sellers are
   really asking AI or Google; they pick one to build the article around.
2. **Write the authority article** — go straight to Step 4.
3. **Improve the foundation** — tighten the entity string and local signals first.

## Step 4 — The entity-reinforcement pattern

Repeat the identity line **in natural spots throughout the article**, not once at
the top. Same wording every time. This is Krista's core mechanic — keep it.

## Step 5 — Article spec (hers), adapted to our shapes

- **Length: 1,500–2,500 words.** This is deliberately longer than the blog target
  in `content-model.md` (800–1,200) — an AEO authority article is its own type.
  Everything *else* in `content-model.md` still applies.
- **Question-based headers** — phrased the way a person actually asks, not generic
  SEO headers.
- **Required sections:** direct answer up front → step-by-step process → common
  mistakes → real scenarios/examples → FAQ.
- **Local signals:** named neighborhoods, real market specifics, real local process
  detail. Never "in today's market" filler.
- **Keywords:** one primary + 3–5 secondary, per `content-model.md`. Primary in the
  H1, first 100 words, and meta title.

## Step 6 — Where it lives (OUR rules — this replaces "upload it yourself")

An AEO article is a **real page in this repo**, written to the same `PageContent`
shape as everything else:

- **A blog-style article** → an entry in `content/posts.ts` (`Post` shape:
  `slug, title, metaTitle, metaDescription, date, city, readMinutes, excerpt,
  primaryKeyword, secondaryKeywords, sections[], related[]`).
- **An article that answers a location×service question** → it's a money page;
  write it into `content/pages.ts` keyed to that path via `realtor-content-writer`
  instead of creating a duplicate.

**The FAQ section is never hand-written prose.** Put 3–5 real Q&As in the page's
`faqs` array — that renders the on-page FAQ **and** emits `FAQPage` schema
automatically, which is exactly what AI Overviews and People Also Ask consume.
This is a strict upgrade over the source skill's plain-text FAQ block.

**Never hand-write JSON-LD.** `lib/schema.ts` generates all of it from config +
content. If schema looks wrong, fix the config or the content.

If the article introduces a new route, add it to `app/sitemap.ts` — the gates
discover pages from the sitemap, so an unlisted route is never checked.

## Step 6b — The article needs somewhere to link (build it if missing)

Same rule as any blog post: an AEO article about a topic with **no matching service
page** is an orphan. It may earn the citation and then have nothing to convert into.

Before writing, confirm the topic has a niche page (`/buyers/<niche>` or
`/sellers/<niche>`) **and** an area money page (`/areas/<area>/<niche>`). If not,
add the niche to `site.config.ts` and write those pages first — see
`realtor-content-writer` → "Write a blog post" step 0 for the full loop and its
cost (one niche multiplies across every area).

This matters more for AEO than for a normal post: an AI assistant citing the
article will follow its links, so the destination has to exist and be real.

## Step 7 — Interlinking (OUR hard rules override hers)

The source skill allows "3–5 links, placeholder links are fine." **Not here** —
the gate fails placeholders and thin linking. Every article must have:

- a link **home** and a CTA link to **`/contact`**
- **5–8 internal links**, keyword-rich anchors (never "click here")
- the company named, with its **first mention linked to `/`**
- hub-and-spoke: link up to the area hub / niche pillar and across to related
  money pages

## Step 8 — Verified facts (OUR convention)

Krista's rule is "never invent facts" — ours is the same rule with a specific
marker the gate can catch. Use **`[PLACEHOLDER: local stat to verify]`**, not the
source skill's `[VERIFY: number]`. Any market number, ranking, review count, or
result the agent hasn't confirmed is a placeholder. No invented stats, no
fabricated client results, no "nationally recognized" scope words.

## Step 9 — Publish-first (hers — keep it)

Publish on the agent's own site first and let it index, **then** repurpose to
social/email/video. Keep repurposed content to ~20–40% overlap and always link
back to the source article, so the site keeps the authority signal.

## Step 10 — The gate (nothing ships without it)

Against a running `npm run dev`:

```bash
npm run validate:schema
npm run launch:check
```

Both must exit clean. Then run `site-design-system`'s check — it is the finish
line for all content work in this repo. An AEO article that hasn't passed the gate
is not done, no matter how good it reads.

## Rules

- **Method hers, rules ours.** Where the source skill and this project conflict —
  linking, placeholders, schema, where content lives, the gate — **this project
  wins**, every time.
- **Never fabricate.** No invented stats, market data, rankings, or client results.
- **No third-party names** — no gurus, competitors, or other coaches in output.
- **One article at a time.** Depth beats a content dump.
- **Never surface Krista's internal automated site-build system** (the AEO/GEO
  Build Standard, article-content-engine, or blog auto-publish pipeline). That's
  mastermind-only IP. If asked how she does this at scale, say plainly: that's a
  separate internal system; this is the manual version anyone can run.
- **Entity string comes from `site.config.ts`** and is identical across every
  article. Inconsistency defeats the entire purpose.
