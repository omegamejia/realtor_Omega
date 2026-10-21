# What changed in the engine

Your site is two things. **Your site** is `site.config.ts` and `content/` — your
facts, your words, your photos. **The engine** is everything else: the page
templates, the schema generator, the design system, the skills Claude uses, and
the launch gate. `npm run update:engine` replaces the engine and never touches
your site.

This file is the record of what changed and, more usefully, **what each change
might ask of you.** Some updates are pure machinery and you will never notice
them. Others add a rule that your existing pages have to satisfy, and those are
the ones worth reading.

Each entry is tagged:

| Tag | Meaning |
|---|---|
| `machinery` | Nothing is asked of you. It just works better. |
| `content` | Your existing pages may need a look. The gate will tell you which. |
| `decision` | There is a choice to make, and it is yours. |

**Nothing here is applied to your site automatically, and nothing should be.**
Claude reads this file, tells you what changed in plain language, checks whether
any of it conflicts with what you have written, and asks before doing anything.

---

## 2026-08-24 — Your listings become readable by machines

### `content` · Every listing now needs its coordinates

An agent pointed her AI phone agent at her listings page and asked it about one of
her own properties. It said it did not have one. The page was fine: it was public,
it loaded, and the prices were right there on screen. But the hidden label that
describes the page to machines listed her company and every person on her team,
and not one house. The assistant learned the staff roster perfectly and never knew
the inventory existed.

Three things changed so that cannot happen again.

**Your listings page now describes every property, not just links to them.** An
outside assistant reads one page and gets the whole book. Before, it had to visit
each listing separately, which no CRM knowledge base is going to do.

**Each listing carries real map coordinates.** Not the address text, the actual
latitude and longitude. A text search for a rural address quietly drops the pin in
the middle of town, and nobody notices because a map still looks like a map.

**What this asks of you:** every listing you already have needs its coordinates
added. `npm run launch:check` now lists which ones by name. Claude can do it with
you in a couple of minutes: open each address in Google Maps and copy the numbers
out of the address bar. Your site keeps working in the meantime, and nothing about
it looks broken while you do it.

### `machinery` · Two new pages built for AI, and a map you can tap

**`/ai-brief`** is one page carrying everything true about your business: you, your
team and their licenses, every area you work, your services, and every listing in
full. It rewrites itself whenever your site changes. Point any assistant at that
one address and it is current.

**`/listings/details`** is the same idea for your listings alone.

Neither is meant for visitors. They exist so a phone agent, a chat assistant or a
CRM can read your business without you pasting anything into it by hand and
re-pasting it every time a price changes.

Also: the address under a listing map is now a link, so somebody who wants
directions can tap it instead of retyping it, and every listing has a way to
contact you pegged directly under the map rather than only at the bottom of the
page.

### `machinery` · Where a listing's shape is defined has moved

The definition of what a listing is now lives in the engine rather than beside your
data, so future improvements reach you through an update instead of needing you to
edit the file your listings live in. Your listings themselves have not moved and
are still yours alone.

---

## 2026-08-18 — Geographic branding, and two gate rules

### `content` · The page has to say what its URL promises

If a page's web address names a place, its main heading has to name the same
place. A page at `/areas/brentwood/selling-your-home` with a heading reading
"Selling Your Home in the Bay Area" now fails the gate.

**Why this exists:** a real site rebranded from one region to a wider one, and a
sensible-looking find-and-replace quietly rewrote the headings on the local pages
that were the entire reason the site ranked. The URLs still said Brentwood. The
headings no longer did.

**What it may ask of you:** if you have ever widened your service area, run
`npm run launch:check`. Anything it flags is a page whose heading and address
disagree. Fix the heading, or change the URL and add a redirect. Claude can do
either, but which one is right depends on whether that URL has traffic.

### `content` · Schema has to say what the page says

Structured data is the label Google and AI assistants read. It is invisible on
screen, so when it drifts away from your visible page nobody notices.

The gate now fails when a page's schema names a different place than its heading,
and when an FAQ appears in your schema but not in your visible text. The second
one is Google's own requirement for FAQ markup.

**Why this exists:** every specialty page on a live site was sending Google
"Downsizing in Brentwood" while the page itself said "Downsizing in the Bay
Area". The schema validator passed the whole time, because well-formed is not the
same as correct.

**What it may ask of you:** nothing, if your headings and schema already agree.
The gate will say so.

### `machinery` · The launch gate stopped crying wolf

Four checks were flagging correct content, which is worse than useless because it
trains you to skim past real problems.

- `todo` matched **Todos Santos Plaza**, a real place name, and failed 15 pages
- `n/a` matched any address like `/information/about`
- `fill in` matched ordinary writing such as "fill in disclosures"
- 41 spelling warnings for one BART station buried two genuine misspellings

Filler words now match whole words, and proper nouns are left alone.

### `machinery` · The area-slug check was barely running

It compared each area's URL to its name only when the two sat on adjacent lines
in your config. On most entries a photo field sits between them, so on a real
site it was checking 5 of 28 areas and silently skipping the rest.

### `decision` · A written rule for widening your service area

New: `.claude/rules/geographic-branding.md`. Worth reading once if your business
is growing, because expanding is exactly when a site quietly breaks.

The short version: a sentence about where **your business** works is branding and
can widen. A sentence about where **a town** is is a fact and stays. Your
keywords are never swept, because your pages still rank for them and you still
work there.

**The decision that is yours:** anything with a name attached — a lead magnet, a
guide, a downloadable PDF — is not renamed by a sweep, because the file, the
funnel and the email sequence outside this repo still carry the old name. Claude
will ask rather than rename.

---

## How to keep this up to date

```bash
npm run update:engine
```

That is a **preview**. It changes nothing. It tells you what is new, which
entries might affect your pages, and whether you have customised any engine file
that an update would overwrite.

When you are happy:

```bash
npm run update:engine -- --apply
```

Then `npm run gate` to see whether any new rule has flagged your existing
content. If you do not like the result, `git checkout .` puts everything back.

Ask Claude to do this for you. It is what the session-start check in `CLAUDE.md`
is for, and it will explain the conflicts rather than reading you a file list.
