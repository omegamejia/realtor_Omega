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
| **`/process`** | **2,000–2,800 words** |

A 1,200-word page of generalities is thin. A tight page that fully answers intent
ranks. Length is the output of real local substance, never a quota.

**Do not hit the target by repeating the process.** `/process` carries the method
in full; every service page links into its anchors instead of restating it. Words
that appear on all 60 service pages are duplicate content, and the gate measures
it: a shared block of ~120 words once pushed near-duplicate similarity from 52%
to 57% and failed 45 page pairs at once. Length has to come from *this* place and
*this* situation.

## `/process` and deep linking (every service page)

`/process` is the one page that describes the method, and it runs on **E.P.I.C.**:
`overview` `equity` `presentation` `impact` `campaign`. `/process/buying` runs on
**R.E.A.L.**: `overview` `ready` `educated` `aligned` `locked`. Those ids are a
fixed contract shared with `components/editorial.tsx` and `lib/schema.ts`.

**Write these two pages with more energy than anything else on the site.** They
are the argument for hiring this agent, and a flat recitation of pillars is worse
than no framework at all. Krista's own verbatim lines are the register to aim at:
*"This is not a CMA."* *"Perception creates value. We control the narrative."*
*"We don't just market, we dominate."* *"You don't list, you launch."*

Use her structure and her level of conviction. Do **not** copy her sentences onto
every agent's site: hundreds of identical pages is duplicate content and it
flattens the line for everyone. Say the same thing in this agent's voice.

- **Every seller-side page** carries `ProcessStrip`, which is six links and no
  prose. Never restate the steps in body copy.
- **Link to the step, not the page.** A valuation page's CTA goes to
  `/process#equity`, because pricing is the doubt that reader actually has.
  `processStepFor()` in `components/editorial.tsx` holds the mapping.
- **The home page's step summary is clickable too.** `Chapters` deep links each
  step into `/process#<id>`. A summary a reader cannot act on just makes them
  hunt for the page it came from.
- **Blog posts** end with the same six links, so a reader who finished an article
  lands on the method rather than nothing.
- **Buyer-side pages get none of this.** `/process` describes selling. Promising
  a first-time buyer a six-step listing plan is wrong, not merely off-topic.

When writing `/process` itself: the `market` step is the differentiator and the
one section no competitor can copy. Be specific about what is actually run.
"Exposure" is a word; reach is a number.

## The hero headline

The first thing anybody reads, and the line most likely to come out limp.

**Write a claim, not a greeting.** "Your trusted [city] real estate expert" says
nothing that a competitor could not also say.

**Drop the leading article.** "Marketing is what sells your house in Brentwood"
lands harder than "The marketing is what sells your house in Brentwood", because
the sentence opens on the noun carrying the argument instead of a throat-clear.
Apply this everywhere, not just the hero: headings that start with "The" usually
read better without it.

**The accent phrase is the place or the outcome**, because that is the word the
eye lands on.

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


## Same method, different place. This is the rule that makes the pages work.

**The technique does not change between neighborhoods, and you must not pretend
it does.** An agent sells a house in Deer Ridge the same way they sell one in
Shadow Lakes. Writing otherwise to manufacture variety is a lie a local reader
will spot immediately.

**What changes is the place.** Why people choose it, what they are giving up to
be there, what the houses actually are, and which schools come up in every
conversation. Showing you know *that* is the entire differentiator, and it is
what "Proximity" in Relevancy, Recency, Proximity actually means.

So on every area and money page:

| Keep the same | Must be specific to this area |
|---|---|
| The method and the process | Housing stock: era, builders, lots, layouts |
| How you work with clients | Who chooses here, and what for |
| The E.P.I.C. / R.E.A.L. framing | Schools people ask about, by name |
| Your credentials and proof | Commute reality, the road everyone uses |
| Fair-housing-safe framing | What is genuinely nearby, named |
| | The honest trade-off versus next door |

**The concrete bar: at least one third of the body copy on a money page must be
sentences that could not be true of the neighboring area.** Not the name swapped
in. Facts that stop being true if you change the town.

Test it the way a reader would: take a paragraph, replace the area name with the
one next door, and ask whether it is still true. If it is, that paragraph is
doing nothing. Rewrite it or cut it.

**Where the facts come from.** `serviceAreas[].localFacts`, collected once per
area during setup and reused across all of that area's pages. Never invent a
school name, a builder, a decade or a commute time. An empty field costs a
little SEO; a wrong claim about somebody's own neighborhood costs the agent
their credibility with the exact reader they are trying to win.

**Fair Housing still governs all of it.** Describe the PLACE, never the people
who live there. "Built mostly in the late nineties, four bedrooms on quarter-acre
lots, ten minutes to the 4" is specific and safe. "Great for families" is neither.
See `.claude/rules/legal-compliance.md`.

## Areas: never one, and always two levels

**Set `parentCity` on every neighborhood.** It is what lets the nav nest and the
schema state containment correctly. A flat list of twenty areas with no declared
parents produces a menu nobody can scan and schema that claims twenty peer
cities. See `site-design-system`.



**One service area is never enough**, and the fix is usually not more cities. It is
**neighborhoods inside the city they already serve.**

Build both levels, always:

- **The broad city** (`/areas/brentwood`) catches the general search and anchors
  the local entity signals.
- **The neighborhoods inside it** (`/areas/shadow-lakes`, and so on) catch the
  searches that convert, because someone typing a neighborhood name has already
  decided where they want to live.

Why both, in the terms worth explaining to the agent: the city page competes with
every agent in town and with the portals. A neighborhood page competes with almost
nobody. The neighborhood pages also link up to the city hub, which is what makes
the city page rank better than it would have alone. Skipping the neighborhoods does
not simplify the site, it just removes the pages that were going to work.

Each area multiplies against every niche, so areas and specialties compound. Four
neighborhoods plus the city, against five specialties, is thirty money pages. That
is the real content cost and it should be said out loud before it is committed to,
but it is also where the traffic is.

**Never invent a neighborhood** or list an area the agent does not actually work.
Ask them what locals call the parts of town.


## Fair Housing (non-negotiable, and the gate enforces it)

Every page here is **advertising by a licensed real estate professional**, which
puts it under the Fair Housing Act. Protected classes: race, color, national
origin, religion, sex (including sexual orientation and gender identity),
familial status, and disability.

**The rule that resolves almost every case: describe the PROPERTY, never the PEOPLE.**

| Don't write | Write instead |
|---|---|
| "Great for families" | "Four bedrooms, a fenced yard, and a park at the end of the street" |
| "Safe neighborhood" | Cite something factual and verifiable, or say nothing |
| "Walking distance to church" | "Walking distance to shops, restaurants, and places of worship" |
| "Good schools" | Name the schools or district; let the reader judge |
| "Exclusive community" | Describe what is actually there |
| "Perfect for a young professional" | Describe the home; let people decide who it suits |

This matters more here than on a hand-written site, because **an AI writing local
copy produces steering language by default.** "Great for families" is the natural
phrasing, which is exactly why it needs a rule and a gate rather than good
intentions. `npm run launch:check` fails on unambiguous steering and warns on
phrasing a human should review.

Never describe who lives somewhere, who would "fit in," or the character of the
residents. Amenities, distances, square footage, and verifiable facts are always
safe. Anything about people is not.

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

## Paragraphs travel — write every one so it survives being moved

These pages are **assembled**, not written top to bottom. A paragraph you write
for one section gets placed under a different heading on 22 other pages, and the
sentence above it will not be the sentence you were imagining. Two failures come
out of that, and both shipped hundreds of times before the gate caught them.

**1. Never write a paragraph that has no main verb.**

Descriptor phrases are useful — they are *ingredients*, meant to be dropped inside
a sentence. Emitted on their own they become nonsense with a period after it:

> ✗ A Saturday farmers market in City Park that has outlived the farm town it
> started in. The most competitive market out here, where good homes move fast.

Two noun phrases. No subject doing anything. The reader gets an atmosphere and no
statement. Give every sentence someone or something performing a verb:

> ✓ Brentwood still runs a Saturday farmers market in City Park that has outlived
> the farm town it started in. It is the most competitive market out here, where
> good homes move fast.

The same descriptor works perfectly once a carrier sentence holds it — *"You are
looking at the levees, the docks, and a community that is not a commuter town."*
The fragment was never the problem; publishing it unwrapped was.

**2. Never open a paragraph with a reference to something outside it.**

> ✗ Relocating, you have none of that, and touring houses does not fix it.
> ✗ Our job is telling you which is which before you fall for one.
> ✗ That is an information problem, not a loan problem.

Each one was written to follow a specific paragraph. Placed one slot over, "that",
"which is which" and "none of that" point at nothing, and the reader silently
scrolls back looking for the half of the thought that is missing.

Write the referent into the paragraph itself:

> ✓ When you are relocating you have none of that local knowledge, and touring
> houses does not fix it.
> ✓ Some houses are a good idea and some are not, and our job is telling you
> which is which before you fall for one.

Opening with *So* or *And* is fine **when the setup is the paragraph directly
above and always will be** — inside a hand-written page like `/process`, that
reads well. It is not fine in any content that gets assembled into slots.

**The test before you move on:** read the paragraph completely alone, with no
heading and nothing above it. If it still says something true and complete, it
will survive anywhere on the site. If it needs a neighbor, rewrite it.

`npm run launch:check` fails on a verbless paragraph and lists every
back-reference opener for review. See `checkProse` in `scripts/launch-check.mjs`.
