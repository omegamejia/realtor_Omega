# Content Model — how every page and post is written

This is the canonical spec. It comes from current (2026) real estate SEO research.
Follow it exactly. The page templates already render this shape; your job is the words.

## Word-count targets (minimums, hit with substance not filler)

| Page type | Target |
|---|---|
| Area hub (`/areas/[city]`) | 1,100–1,400 words |
| Money page (`/areas/[city]/[niche]`) | 1,000–1,300 words |
| Niche pillar (`/buyers/[niche]`, `/sellers/[niche]`) | 900–1,200 words |
| Home body | 800–1,000 words |
| Blog post | 800–1,200 words |

A 1,200-word page of generalities is thin. A tight page that fully answers intent
ranks. Length is the output of real local substance, never a quota.

## Required sections

**Area hub:** Living in [City] · How [Business] Serves [City] · [City] Neighborhoods &
Communities · [City] Housing Market & Home Types · Neighborhood Tour & Local Lifestyle ·
FAQ · Final CTA.

**Money page:** Route-specific hero · Intent-specific value framing · Why [City]
[buyers/sellers] Choose [Business] · Our [Niche] Process in [City] · Local Context &
Proof · [City] [Niche] FAQ · Final CTA.

**Niche pillar:** Hero · What [Niche] Means for [Metro] [audience] · How [Business]
Delivers [Niche] · Our Process / What You Get · [Niche] Across the Cities We Serve · FAQ · CTA.

Every page's scaffold (rendered when unwritten) lists these sections with per-section
guidance and word targets — read the live scaffold page as your brief.


## Niches: five specialties MINIMUM, beyond plain buying and selling

**This is a hard requirement, not a suggestion.** Every site ships with at least
**five specialty niches** on top of the two generic ones. "Buying a home" and
"selling your home" are table stakes: every agent in the county has those pages
and they rank for nothing. The specialties are what actually win search, because
they match how people really phrase their situation.

Nobody searches "realtor". They search "selling a house during a divorce",
"downsizing at 65", "what to do with an inherited house", "buying a rental in
[city]". Those are the pages that get found, and each one is a page a competitor
almost certainly has not written.

**Pull at least five from this list, matched to what the agent genuinely does:**

| Specialty | Who it is for |
|---|---|
| First-time buyers | No jargon, programmes, hand-holding |
| Downsizing / right-sizing | Empty nesters, 55+, moving to less house |
| Divorce home sale | Two owners, one deadline, high emotion |
| Probate and trust sales | Inherited property, executors, timelines |
| Investment property | Rentals, cash flow, 1031 exchange |
| Relocation | Moving into or out of the metro |
| Luxury / high-end | Discretion, off-market, small buyer pool |
| New construction | Builder contracts, upgrades, representation |
| Military / VA | VA loans, PCS timelines, base proximity |

**Say these out loud in plain language, not as industry terms.** Agents recognise
"selling a house after a divorce" instantly and stare blankly at "divorce niche".
The setup interview carries the exact script to read.
| Multigenerational / ADU | Extended family, second units |
| Land and acreage | Rural parcels, wells, septic, zoning |
| Move-up buyers ("trading up out of a starter home") | Buy-before-sell sequencing, bridge timing |

**Never invent a specialty the agent does not actually serve.** Ask. If they have
only ever done three of these, write three properly and add more as they grow, but
say plainly that five is the target and why. A specialty page that is real beats
two that are aspirational.

Each specialty gets a niche pillar (`/buyers/<niche>` or `/sellers/<niche>`) plus a
money page per area (`/areas/<area>/<niche>`). One area with seven specialties is a
better site than five areas with two — depth beats breadth, and the specialty pages
are where the traffic actually is.

## The CLIENT REQUIREMENT (on every location/service page)

Each page must (a) name and talk about the company, (b) say specifically how the team
serves THIS area, and (c) show expertise. Never swap-and-repeat another city's text —
Google flags ~95%-identical templates as doorway pages.

## Keyword strategy

- Exactly ONE primary keyword per page + 3–5 secondary/long-tail + a semantic halo.
- Primary keyword pattern: money page = `{niche} in {city}`; area hub = `{city} neighborhoods`.
- Place the primary keyword in: H1 (near front), first 100 words, title tag (<60 chars),
  meta description (first 120 chars), URL slug, ≥1 H2, and the closing CTA section — once each.
- Density ~1–2% (never over 3%). After the anchor placements, prefer synonyms over repetition.

## Interlinking — HARD RULES

- Every page links back to the home page (the `RelatedLinks` block + brand mentions do this).
- Every page has a CTA linking to `/contact`.
- 5–8 internal links per page, keyword-rich anchors (never "click here").
- Hub-and-spoke: money pages link UP to their area hub + niche pillar, ACROSS to 2–3
  adjacent-city money pages; hubs/pillars link DOWN to money pages.
- `npm run launch:check` fails any page missing a home link, a `/contact` link, or with
  fewer than 5 internal links.

## Blogs (they exist to support the money pages)

Every post must: name the company and link its first mention to `/`; name the location in
the title/intro/body; link in-content to the relevant money page(s); end with a CTA to
`/contact`. This is how blogs capture keywords and funnel readers to action.

## Verified-facts guardrail (never break this)

Use ONLY facts the agent has confirmed. Any local statistic (median price, days on market,
school rating, appreciation) you don't have MUST be written literally as
`[PLACEHOLDER: local stat to verify]` — never invented. Never add scope words ("nationally")
or volume claims ("thousands", "most") that aren't verified. `launch:check` blocks any page
still containing placeholders or filler, so unverified data cannot ship.

## Schema (automatic — don't hand-write it)

The engine (`lib/schema.ts`) generates all JSON-LD from config + content: Organization,
WebSite, RealEstateAgent (LocalBusiness) with OfferCatalog + geo + areaServed, one Person
per team member, WebPage/Service/Place/BreadcrumbList per page, FAQPage when a page has
faqs, BlogPosting on posts. You never write JSON-LD. Adding `faqs` to a page's content
automatically emits FAQPage schema.

## FAQ = an array, per page

Add a `faqs` array to a page's content (3–5 real Q&As, direct answer first). This both
renders the on-page FAQ and emits FAQPage schema for AI Overviews / People Also Ask.
