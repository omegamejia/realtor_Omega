---
name: site-design-system
description: >-
  The site's own design, schema, and SEO-governance authority. Use when someone
  wants to change the visual design, add a new page type or component, asks
  "what's our design system," or wants something reviewed before it ships.
  Also the mandatory final check after realtor-content-writer, listings-manager,
  or funnel-builder finish producing content — nothing is done until this
  skill's gate passes clean.
# deep judgment, voice, and creative quality
model: opus
---

# Site Design System

This skill owns two things for this one site: the **visual/component
conventions** (so new pages and components look like they belong), and the
**gate** that makes sure nothing ships with fabricated facts, hand-written
schema, or broken interlinking. `content-model.md` (in `realtor-content-writer`)
is the canonical spec for the *words* — word counts, keyword placement,
required sections. This skill doesn't duplicate that; it owns everything
around it.

## Visual & component conventions

- **Brand colors come from one place.** `site.config.ts`'s `brand.primaryColor`
  and `brand.accentColor` are wired into CSS custom properties (`--brand`,
  `--accent`) in `app/layout.tsx`. Every component uses `var(--brand)` /
  `var(--accent)`, never a hardcoded hex. If a new component needs a brand
  color, reference the CSS variable — don't hardcode the agent's color, and
  don't invent a new one.
- **Reuse the shared blocks, don't reinvent them:**
  - `components/ui.tsx` — `Section`, `Eyebrow`, `Heading`, `ButtonLink`, `Card`.
    These are the layout/typography primitives every page is built from.
  - `components/RelatedLinks.tsx` — the interlinking block. This is *how*
    pages satisfy the hub-and-spoke linking rule below — use it rather than
    hand-writing a links list.
  - `components/RichContent.tsx` — renders page body content, including the
    FAQ block (a page's `faqs` array renders here and is what emits `FAQPage`
    schema — see below).
  - `components/Navbar.tsx`, `components/Footer.tsx` — the site chrome. A new
    page type still goes through these; don't build a standalone page shell.
- **A new page type or component** (not just new content on an existing type)
  is exactly what this skill is for — work out where it fits in the existing
  component set before writing something new from scratch.
- **If you add a new page type (a new route under `app/`), add it to
  `app/sitemap.ts` too.** That file is the single source of truth for "what
  pages exist" — the gates discover every page to check from the sitemap it
  generates. A route that isn't in the sitemap is invisible to the gates (never
  scanned for filler or schema), so leaving it out is a silent coverage hole.

## Theming levers — change ONE place, the whole site follows

The site is built so a single edit propagates everywhere. Never restyle a page
in isolation — reach for the right lever:

- **Brand + accent color** → `site.config.ts` → `brand.primaryColor` /
  `accentColor`. These become `--brand` / `--accent` (in `app/layout.tsx`) and
  every component, the footer, and the accent treatments read from them.
- **The two-tone headline accent** (the signature) → `.hl-accent` in
  `app/globals.css`. Tune its four `text-decoration-*` values once to restyle
  every accented headline. Applied via `<PageHero titleAccent="…">` and the
  home hero.
- **Page-title type** → `.display-h1` (and `.display-hero` for the home
  headline) in `globals.css`. One fluid `clamp()` scale drives every page's
  `<h1>`.
- **The eyebrow accent rule** → `.eyebrow-tick` in `globals.css`.
- **Every page header** → the `<PageHero>` component
  (`components/PageHero.tsx`). All ~14 pages route through it — eyebrow,
  breadcrumb/back-link, two-tone `<h1>`, subhead. Change the header once here.
- **The logo mark** → `<BrandMark>` (`components/BrandMark.tsx`), used by the
  navbar (desktop + mobile) and footer. Swap it for a real `<img>` logo once.
- **Footer look** → the `--footer-*` tokens in `globals.css`. `--footer-bg`
  derives from `--brand`, so the footer re-brands per agent automatically.

Rule: if you're about to write a one-off style on a single page, stop — either
it belongs in one of the levers above, or it's genuinely page-specific. When in
doubt, add it to the shared component/token, not the page.

## Schema — generated, never hand-written

`lib/schema.ts` is the only source of JSON-LD on this site (`baseGraph`,
`pageSchema`, `nicheSchema`, `areaSchema`, `moneySchema`, `teamPageSchema`,
`teamMemberSchema`, `blogPostSchema`, `listingsPageSchema`, `listingSchema`,
rendered via `components/JsonLd.tsx`). It builds Organization, WebSite,
RealEstateAgent (LocalBusiness) with OfferCatalog + geo + areaServed, one
Person per team member, WebPage/Service/Place/BreadcrumbList per page, and
FAQPage/BlogPosting where relevant — all from `site.config.ts` and page
content. If a page's schema looks wrong, the fix is in the config or content
that feeds `lib/schema.ts`, never a hand-added `<script type="application/ld+json">`.

## Interlinking — the hard rules (enforced by the gate, not optional)

- Every page links home and has a `/contact` CTA.
- 5–8 internal links per page, keyword-rich anchors.
- Hub-and-spoke: money pages link up to their area hub + niche pillar and
  across to 2–3 adjacent-city money pages; hubs/pillars link down to money
  pages.

(Full detail lives in `realtor-content-writer/content-model.md` — this is the
summary version for anyone not primarily writing words.)

## The gate — run this before calling anything done

Against a running `npm run dev` (defaults to `localhost:3000`, or pass a URL
for a deployed site):

```bash
npm run validate:schema
npm run launch:check
```

Both gates check **every** page on the site — they read the page list from the
site's own `/sitemap.xml` (generated by `app/sitemap.ts` from config +
content), so coverage tracks reality automatically and no renamed or added page
escapes the check. Both must exit clean — zero errors, not "looks fine."
Specifically:

- **`validate:schema`** hard-fails on invalid JSON, any schema node missing
  `@type`, any `@id` reference that doesn't resolve on that page, or a page
  missing a required base type (Organization, WebSite, RealEstateAgent,
  Person). It also flags any lingering `[BRACKET]` placeholder text as a
  warning — that's your intake checklist, not something to ignore.
- **`launch:check`** fails on filler tokens (lorem ipsum, `example.com`,
  `(555)`, `tbd`, `n/a`, unresolved `[BRACKET]` placeholders...), on
  `launchReady` not being literally `true` in `site.config.ts`, and on any
  page missing the home link / `/contact` link / 5-internal-link minimum.

If either fails, the fix is real content or real config — never loosen the
gate to make it pass, and never set `launchReady: true` to skip it. A fresh,
unconfigured seed is *expected* to fail both gates; that's the gate working,
not a bug.

## When to reach for this skill

- Before telling the agent a content or design change is finished — run the
  gate.
- Before adding a new page type or reusable component — check this file for
  the existing pattern first.
- When asked to change how the site looks (colors, layout, a new visual
  treatment) — keep it flowing through the CSS variables and shared blocks
  above, not a one-off styled component.
