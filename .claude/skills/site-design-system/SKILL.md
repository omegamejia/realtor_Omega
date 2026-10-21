---
name: site-design-system
description: >-
  The site's own design, schema, and SEO-governance authority, and the owner of
  the photography-first look in app/tb.css. Use when someone wants to change the
  visual design, add a new page type or component, asks "what's our design
  system" or "what should this look like," wants stand-in photography or the shot
  list, or wants something reviewed before it ships.
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

## The look: photography-first, and it is not a suggestion

**The interface is ink on white. The photographs are the only coloured thing on
the page.** That single decision drives everything else here, and every rule
below exists to protect it.

`app/tb.css` is the design system. It loads after `globals.css` and restyles the
existing classes, so a page takes the look without being rewritten, and its
colour tokens are derived from `--fg` / `--bg` so dark mode keeps working.

### The five rules

1. **Photographs carry the colour.** Ink on white, one pale grey band for
   alternation. Blue water, green trees and warm interiors are the only saturated
   things on screen, so they are where the eye goes. **Never add a coloured
   block, a tinted card or a brand-colour fill to make a section "pop".** That is
   the instinct this system exists to stop.
2. **One light serif, set large.** Newsreader at weight 300, whole sentences at
   headline size, paired with small spaced capitals in Montserrat for labels and
   links. **No bold headlines anywhere.** Weight is not how emphasis is made here;
   size and space are.
3. **Text links, not buttons.** Small capitals over a hairline underline
   (`.tb-link`). If you are reaching for a pill button, you want a `.tb-link`.

   **Two exceptions, and only two.** The button that submits a form, and
   `.tb-btn` for one urgent action: the phone number on a call-first trade, or a
   booking CTA where the visitor is in trouble rather than browsing. Somebody
   whose boiler has failed is not scanning for small spaced capitals. Everything
   else on the page is still a text link.
4. **Space around everything.** Sections breathe for most of a screen. Cramping
   a band to fit more in is the wrong trade every time.
5. **Motion everywhere, never loud.** Things rise in as they enter, photographs
   settle from a slight zoom, the hero cross-fades, numbers count, the photo strip
   drifts. All of it is CSS and one small client component. All of it disappears
   under `prefers-reduced-motion`.

### The blocks

`components/tb.tsx` (server) and `components/tb-client.tsx` (client). Compose
pages from these before writing anything new.

| Component | What it is |
|---|---|
| `HeroSlideshow` | Full-bleed cross-fading photographs. `sticky` pins it on desktop so the page slides up over it. |
| `Statement` | One sentence set large. `as="h2"` when it titles a section, `as="p"` when it is prose. |
| `StatGrid` | Numbers that count up as they enter. **Confirmed figures only.** |
| `Pillars` | Four linked blocks with a picture each. |
| `PhotoTicker` | A slow horizontal drift of photographs, each a link. |
| `FadeCarousel` | One frame, photographs cross-fading inside it. |
| `SplitFeature` | Picture one side, words the other. `reverse` alternates. |
| `QuoteFeature` | One line set very large over a photograph. |
| `VideoBand` / `AutoVideo` | Full-width muted looping video with a poster. |
| `ImageCard` + `ScrollRail` | A horizontally scrolling rail of picture cards. |
| `InquireSection` | Underline-field form. Carries the one solid button. |
| `Reveal` | Scroll-reveal wrapper. Most bands are wrapped in one. |

`Bleed`, `SectionNav`, `Chapters`, `FieldNote` and `HighlightGrid` all still
exist in `components/editorial.tsx` and are restyled by `tb.css`. They are for
long-form content pages; the blocks above are for composed pages.

**Bands alternate light and dark, in both themes.** A page that is one surface
top to bottom reads as unfinished. `band="light"` / `band="dark"` on the blocks
that take it, `.tb-band--alt` on sections that do not.

### Every photo frame starts full, and none of it may launch

**A photography-first design with no photographs looks worse than the design it
replaced.** So `content/sample-media.json` fills every frame from the first
render with properly licensed stand-ins.

- `sampleSrc("home.hero.2")` resolves a slot. The agent's own photo always wins.
- **One photograph, one place.** Use the `pick()` pattern in `app/page.tsx`: it
  remembers what it has used so a rail never repeats a picture shown higher up.
- Every slot carries a `need`: what the real photograph has to show. That makes
  the registry the shot list. `npm run shot-list` writes `docs/SHOT-LIST.md`.
- **`launch:check` fails any page still serving from a sample host.** Stand-ins
  are for building, never for shipping, because a stock kitchen standing in for a
  house this agent sold is a claim about their work.
- **Area slots are deliberately empty in the seed.** A photograph of the wrong
  town is a false claim, not a placeholder. They are filled per site at setup,
  and verified against the place before they are used.

## Long lists collapse. Hierarchies nest. (both are rules, not options)

An agent working twenty neighborhoods is the normal case, not the edge case, and
two features fall out of it.

**Any grid over ~8 items collapses to two rows behind `ShowMore`.** Twenty full
cards is four screens of scrolling before a visitor reaches anything else on the
page, and somebody who does not see their neighborhood in the first six is not
helped by the next fourteen being visible. They are helped by being able to ask
for them.

- Use `<ShowMore visible={6} label="areas">` wrapping the mapped children.
- **Every item stays in the DOM**, hidden with CSS rather than unmounted. These
  cards *are* the interlinking between a hub and its children; rendering only
  six would quietly cut the site's internal link graph to save some scrolling.
  Hidden links still crawl. Unmounted ones do not.
- Keep `visible` to a whole number of rows so the collapsed state is not ragged.

**Menus nest by `parentCity`, they do not list flat.** A neighborhood declares
its city in config, so it is reached *through* that city:

- `topLevelAreas()` gives the menu column: cities and standalone areas only.
- `childAreas(name)` gives the flyout: hovering Brentwood reveals the
  neighborhoods inside Brentwood, with Brentwood itself still one click away on
  the row being hovered.
- The result is a menu whose hierarchy matches the URL hierarchy, which is what a
  crawler expects and what a visitor already assumes.

**Both apply anywhere a list can grow with the agent's business** — areas,
niches, listings, team. Ask "what does this look like at twenty?" before shipping
a grid or a menu, because that is what it will be.

## The duplication rule (learned the hard way, do not relearn it)

**Any block of prose repeated on every page is duplicate content, no matter how
good the prose is.**

The first `ProcessStrip` carried one sentence per step. That added roughly 120
identical words to 63 service pages and pushed near-duplicate similarity from
52% to 57%, turning **45 page pairs from warnings into hard gate failures**.
Trimming it to numbers and names only put it back to zero failures and lost
nothing, because the links were always where the value was.

So: **navigation is free, prose is not.** When something needs to appear on every
page, ship it as links. If it genuinely needs words, it belongs on one page that
the others point into.

## The two frameworks are the site's spine, and they are named

**Sellers get E.P.I.C.** — Equity, Presentation, Impact, Campaign. Tagline
*Position. Impact. Conversion.* It is Krista's own listing-presentation
framework, and its power is that it is four **arguments about positioning**, not
a task list.

**Buyers get R.E.A.L.** — Ready, Educated, Aligned, Locked. Derived from what KMC
teaches on the buyer side: consult before showings, pre-approval before touring,
an honest reality check early, representation explicit up front.

**Why this matters and why it is not negotiable.** The site previously ran a
chronological list of agent verbs (prepare, present, position, market, negotiate,
close). Every agent site converges there, because there are only so many verbs
for selling a house, and one we admired had almost exactly the same list. A
renamed list would have had the same problem. EPIC and REAL change the **axis**,
which is the only thing that actually makes a page distinct.

**Sellers and buyers are deliberately asymmetric.** A seller is choosing an
agent, so they get a positioning argument. A buyer is navigating something
unfamiliar, so they get a readiness sequence. Do not force one to mirror the
other.

**Shared structure, individual words.** The four pillar names and their order
travel to every site. The sentences must be written per agent in their own voice.
Hundreds of sites publishing *"We don't just market, we dominate"* verbatim is
duplicate content across the whole network, and it dilutes the line for everyone.

## `/process` is the hub, and everything deep links into it

`/process` carries the method in full. Its section anchors are a contract
shared by three files, and changing one without the others silently breaks the
site:

| File | What it holds |
|---|---|
| `content/page-content/process.ts` (or `content/pages.ts`) | `PageSection.id` for each step |
| `components/editorial.tsx` | `PROCESS_STEPS` ids |
| `lib/schema.ts` | `processSchema` `HowToStep.url` anchors |

Ids, selling (`/process`, E.P.I.C.): `overview` `equity` `presentation` `impact`
`campaign`. Ids, buying (`/process/buying`, R.E.A.L.): `overview` `ready`
`educated` `aligned` `locked`.

These are the ids in `components/editorial.tsx` today. An earlier draft of this
document listed the retired verb ids (`prepare` `present` `position` `market`
`negotiate` `close`) as the contract, which is the very list the section above
explains was replaced. Anything written against those produces an anchor that
does not exist. **Verify anchors against the rendered page, never against a
document.** A wrong `#anchor` still returns HTTP 200, so a link check cannot
catch it; the page simply loads and does not jump.

**Two tracks, never mixed.** `/process` is selling, `/process/buying` is buying,
and they have different steps because they are different jobs. `ProcessStrip`
takes `track="selling" | "buying"`; money pages pick from the `seller` flag,
buyer hubs pass `"buying"`, area hubs use selling since they serve both. The
schema follows the same split: `citesProcess` takes the track, so a buyer page
references the buying `HowTo` and never the selling one.

Adding a third track later means adding it to `PROCESS_TRACKS`, the scaffold, and
`processSchema`'s id list. Those three must agree.

## Visual & component conventions

- **Brand colors come from one place.** `site.config.ts`'s `brand.primaryColor`
  and `brand.accentColor` are wired into CSS custom properties (`--brand`,
  `--accent`) in `app/layout.tsx`. Every component uses `var(--brand)` /
  `var(--accent)`, never a hardcoded hex. If a new component needs a brand
  color, reference the CSS variable — don't hardcode the agent's color, and
  don't invent a new one.
- **Reuse the shared blocks, don't reinvent them:**
  - `components/tb.tsx` and `components/tb-client.tsx` — **reach for these
    first.** The composed blocks listed at the top of this file are what pages
    are built from now.
  - `components/ui.tsx` — `Section`, `Eyebrow`, `Heading`, `ButtonLink`, `Card`.
    Still present and restyled by `tb.css`. `ButtonLink` is the exception rather
    than the default: rule 3 says a text link unless it submits a form.
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
- **The whole look** → `app/tb.css`. It is the design system, it loads after
  `globals.css`, and it restyles the existing classes. Change it there and every
  page follows. Never fork a style onto one page.
- **The two faces** → `app/layout.tsx` wires Newsreader and Montserrat to
  `--font-newsreader` / `--font-montserrat`, and `tb.css` assembles
  `--font-display` / `--font-sans` from them with real fallbacks. Swapping an
  agent onto their own brand fonts is two lines in `tb.css`.
- **The two-tone headline accent** (the signature) → `.hl-accent` in
  `app/globals.css`. Tune its four `text-decoration-*` values once to restyle
  every accented headline.
- **Stand-in photography** → `content/sample-media.json`, then
  `npm run shot-list`. Never hardcode an image path into a page component; an
  engine update overwrites it.
- **Page-title type** → `.display-h1` (and `.display-hero` for the home
  headline) in `globals.css`. One fluid `clamp()` scale drives every page's
  `<h1>`.
- **The eyebrow accent rule** → `.eyebrow-tick` in `globals.css`.
- **Every page header** → the `<PageHero>` component
  (`components/PageHero.tsx`), restyled by `tb.css` as `.tb-pagehero`. The home
  page uses `HeroSlideshow` instead; inner pages route through this. — eyebrow,
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

## Interaction rules (every one of these shipped broken first)

**Nothing may look selected unless it is.** The specialties grid inverts one cell
to give the page a focal point. As a resting state that reads as "this one is
chosen", so inversion is also the **hover** state for every cell, and hovering any
sibling makes the resting one step back. One thing emphasised at a time, and the
emphasis follows the pointer.

**Every clickable thing changes on hover.** If two buttons sit together and only
one responds, the other reads as decoration. That is exactly what happened with
the hero pair.

**Buttons on a photographic scrim come in a matched pair:**

| Variant | Resting | Hover |
|---|---|---|
| `on-dark-solid` (primary) | white fill, ink text | transparent, white text |
| `on-dark` (secondary) | transparent, white border | white fill, ink text |

Never the plain `solid` variant on a scrim. It uses the agent's brand colour, and
a near-black brand on a dark photo is invisible.

**Text inside a `Bleed` is white, and the specificity is load-bearing.**
`.display-h1` carries its own colour, so a zero-specificity override loses to it
and the headline silently goes dark. `.ed-bleed .display-h1` has its own rule for
exactly this reason. If you touch that block, check the hero afterwards.

**Summary steps link to the thing they summarise.** `Chapters` on the home page
deep links each step into `/process#<id>`. A numbered list a reader cannot click
is a list of things they now have to go find.

## Menus nest at every level, not just the top one

The Areas dropdown was fixed to nest and the job was called done. It was not: the
**Buyers and Sellers** dropdowns have their own area columns, and both mobile
menus have theirs. Four places, one of them fixed, three shipped flat.

- Every area column uses `topLevelAreas()`.
- Hovering a niche shows **city, then its neighborhoods indented**, each linking
  to that neighborhood's version of the page
  (`/areas/shadow-lakes/buying-a-home`). Listing cities only means the
  neighborhood money pages cannot be reached from the menu at all: a visitor has
  to guess they exist.
- Hovering an area shows its niches **and** an "Inside <city>" block.

When you change one menu, change all four, and open each one to confirm.

## Look at it. At five widths. Every time.

**A passing gate does not mean it looks right.** The gate reads HTML. It cannot
see a nav wrapping onto three lines, a button that has vanished into a dark
photo, or a menu that has overlapped itself. All three of those shipped on this
project while every check passed.

Before calling any visual change done, **open it and look**, at these widths:

| Width | What it represents | What breaks here |
|---|---|---|
| **390** | phone | logo pushing controls off screen, text overflow, tap targets under 44px |
| **768** | tablet portrait | desktop nav appearing before it fits |
| **1100** | small laptop | the most-missed width, where nav rows collide |
| **1440** | typical desktop | the reference |
| **1600+** | wide desktop | containers stretching past a readable line length |

Check **both themes** at at least one width, because contrast is computed from
the agent's brand color and a near-black or near-white brand behaves very
differently in each.

**What to actually look for:**

- Does any nav or menu item wrap or overlap another?
- Is every button legible against what is behind it? Buttons over a photo scrim
  need `variant="on-dark"`.
- Does anything scroll sideways? Nothing may, at any width.
- Do collapsed grids show a whole number of rows, not a ragged one?
- Do dropdowns and flyouts stay on screen rather than running off the edge?

**Drive the interactive parts, do not read the markup and assume.** Open the
menu, hover the parent item, click Show all, and confirm the state actually
changed. Reading a component and concluding it works is how a broken breakpoint
survives review.

**One warning from experience:** a headless screenshot can crop or scale in ways
that invent problems that are not there. If something looks broken in a capture,
measure it in a real browser before fixing it. More than one "bug" on this
project was the screenshot, not the page.

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
