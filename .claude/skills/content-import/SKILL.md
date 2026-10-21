---
name: content-import
description: >-
  Bring an agent's EXISTING content into this site — old blog posts from their
  computer or Drive (.docx, Google Docs, WordPress XML export, Markdown, plain
  text, PDF), or scraped from a live blog as a fallback — and rebuild them as real,
  interlinked posts that pass the gate, with 301 redirects when the old URLs were
  live. Use when someone says "I have old blog posts", "import my blog", "bring my
  content over", "I have a folder of articles", "migrate my posts", or during
  realtor-site-setup Phase 7.
# deep judgment, voice, and creative quality
model: opus
---

# Content Import

Most agents already have content — usually posts sitting in a folder of Word docs,
sometimes a WordPress export, sometimes a live blog that isn't even attached to
their current site. **Bringing it over beats rewriting it**: it preserves work they
paid for, and their existing rankings and inbound links.

**Prefer their local files over scraping.** Files are higher fidelity (no nav junk,
no truncation, real formatting) and faster. Scrape only when there's no local copy.

## Rules that don't bend

- **Never invent.** Missing dates, authors, or stats stay unknown or become
  `[PLACEHOLDER: ... to verify]`. Don't backfill a date because a post "looks like"
  2023 — ask.
- **Imported ≠ exempt.** Every imported post is a real page and must pass the same
  gate: interlinking rules, no filler markers, generated schema.
- **Never hand-write JSON-LD** — `lib/schema.ts` emits `BlogPosting` automatically.
- **Their words stay theirs.** Fix formatting, structure, and broken links; don't
  silently rewrite their voice. If a post needs a real rewrite, say so and route it
  through `realtor-content-writer` + `copywriter` with the agent's sign-off.
- **Don't import someone else's content.** If a post is obviously syndicated from a
  brokerage/vendor feed, flag it — republishing it can be a duplicate-content and
  licensing problem.

## Step 1 — Find the source

Ask where the content lives, and take a path or a drop:

> "Where are your old posts? A folder on your computer, Google Drive, Dropbox, or
> are they only live on a blog somewhere? Word docs are fine — so is a WordPress
> export."

| Source | Handling |
|---|---|
| **`.docx` / Google Docs export** | Most common. Extract title, body, any date; headings become sections. |
| **WordPress export (WXR/XML)** | Best case — carries title, slug, date, categories, and **original URLs** (keep them for 301s). |
| **Markdown / plain text** | Direct; infer structure from headings. |
| **PDF** | Extract text; expect to rebuild structure by hand. |
| **Live blog (fallback only)** | Scrape post URLs + bodies when no local copy exists. Strip nav/sidebar/footer. |

Take an inventory **before** converting anything: how many posts, date range, and
which look worth keeping. Show it to the agent.

## Step 2 — Triage with the agent (don't import everything)

Old blogs carry dead weight. Go through the inventory together and sort:

- **Import as-is** — still accurate and useful.
- **Import + update** — good bones, stale facts (old market numbers, old process).
  Every stale number becomes `[PLACEHOLDER: local stat to verify]`.
- **Merge** — several thin posts on one topic become one strong page.
- **Skip** — outdated, off-brand, duplicated, or syndicated from elsewhere.
- **Redirect only** — not worth keeping, but the URL has links/traffic → 301 it to
  the closest relevant page.

Ask about anything ambiguous. When in doubt, skip and flag — a bad post drags the
whole site.

## Step 3 — Convert to real posts

Each kept post becomes an entry in `content/posts.ts` (`Post` shape):
`slug, title, metaTitle, metaDescription, date, city, readMinutes, excerpt,
primaryKeyword, secondaryKeywords, sections[], related[]`.

- **Slug:** keep the original when the old URL was live (cleanest redirect); else
  a clean keyword slug.
- **Date:** the real publish date. Unknown → ask; never invent one.
- **City / keywords:** must match a real area in `site.config.ts`.
- **Sections:** map their headings; keep their structure unless it's broken.
- **Meta:** write real `metaTitle` (<60 chars) / `metaDescription` (150–160) if the
  original lacks them.

## Step 4 — Interlink (this is what makes the import worth it)

Old posts almost always link nowhere useful. Per `content-model.md`, every post must:

- name the company with its **first mention linked to `/`**
- name the location in title/intro/body
- link **in-content to the relevant money page(s)** (`/areas/<area>/<niche>`)
- close with a CTA to **`/contact`**
- carry **5–8 internal links** total, keyword-rich anchors

This is the step that converts a stranded archive into traffic that actually feeds
the money pages. Don't skip it to save time.

## Step 5 — Redirects (only if the old URLs were live)

For every imported or skipped-but-linked post whose old URL was public, add an
entry to `content/redirects.mjs`:

```js
{ source: "/old-blog/my-post", destination: "/blog/my-post", permanent: true }
```

Map to the **closest relevant page** — never blanket-redirect everything to the
homepage (search engines treat that as soft-404s). If the domain itself is moving,
`domain-setup` owns the full migration; hand the URL list to it.

## Step 6 — Gate

Against a running `npm run dev`:

```bash
npm run validate:schema
npm run launch:check
```

Both must exit clean, then `site-design-system` signs off. Imported posts fail the
gate for the same reasons new ones do — usually thin interlinking or a leftover
placeholder. Fix the content, never loosen the gate.

## Step 7 — Hand off to the ongoing engine

Once the archive is in, set up what comes next so the blog doesn't go stale again:
**`krista-aeo-geo-writer`** for new authority articles on a cadence, and
`realtor-content-writer` for pages. Tell the agent plainly which old posts you
skipped and why — that list is often their best next-content roadmap.

## Imported content is harvested data

An old post is a candidate, not a fact. Stats, market figures, team references,
and "since 2008"-style claims all rot, and importing them republishes them under
today's date with today's authority.

Flag every factual claim for the agent to re-confirm, and convert anything they
can't verify to `[PLACEHOLDER: ... to verify]` rather than shipping it. See
`.claude/rules/truth-verification.md`.
