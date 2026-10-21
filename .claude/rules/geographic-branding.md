# Geographic branding — how wide to claim, and where to stay specific

This is the rule for place names. It exists because an agent's footprint grows,
and the copy written when they worked one town does not update itself.

**The whole rule in one line: brand at the widest area you genuinely serve, and
stay specific everywhere a specific place is more useful to the reader.**

Those two things are not in tension. Branding is a claim about the business.
Specificity is a fact about a town. A site needs both, and the mistake is
applying one setting to the entire site.

---

## 1. Two kinds of sentence, and only one of them changes

Before changing any place name, decide which kind of sentence it is.

| | Says | Example | On a rebrand |
|---|---|---|---|
| **Scope** | where the **business** works | "Selling your home in East County" | **Changes** |
| **Geography** | where a **town** is | "Antioch is the oldest of the East County cities" | **Stays** |

Flattening geography into the wider brand costs the local specificity the whole
site is built on. "Pittsburg is the shortest drive west of anywhere in East
County" is useful to a reader precisely because it is narrow. Rewriting it to
"in the Bay Area" makes it vaguer and less true.

## 2. Where each one applies

**Change to the wide area:**

- `metaTitle`, `h1`, and hero copy on **main pages** — the homepage, the specialty
  pages (`/buyers/*`, `/sellers/*`), `/process`
- **Calls to action on main pages.** A CTA is the business asking for the
  business, so it carries the brand, not the neighborhood.
- Boilerplate that describes the company ("a real estate team in X helping
  homeowners across Y")
- Anything asserting the footprint on a page **outside** that footprint — a
  template that prints the old region into every area's `metaDescription` is the
  common version of this bug

**Keep narrow:**

- The **region or town page itself**, and its CTAs. On `/areas/<the-region>`,
  "Talk to us about <the region>" is correct and should not be widened.
- Comparisons between towns — pricing, commute, housing stock, inventory
- Any fact where the narrow name is what makes it true

## 2b. The slug is a promise — the h1 must keep it

**If a URL names a place, the `<h1>` must name the same place.** `/areas/brentwood/selling-your-home`
tells a visitor and a crawler that this page is about Brentwood; an h1 reading
"Selling Your Home in the Bay Area" breaks that promise, and it is exactly what a
well-meaning sweep produces.

This is the cheapest available test for whether a rebrand went too far, because
it needs no judgment: compare the slug to the h1.

**It is enforced.** `npm run launch:check` fails on any mismatch (Layer 7), for
every area in `site.config.ts`. A page whose slug carries no place — `/sellers/downsizing`,
`/buyers/relocation` — is exempt, which is why those may say the wide area.

The corollary: **to widen a page's h1, widen its slug too, or leave the h1 alone.**

## 2c. Schema has to say what the page says

Structured data is invisible on screen, so it drifts from the visible page and
nobody notices. `validate:schema` will not catch this — it proves the JSON-LD is
well formed, not that the words inside it are the words a visitor reads.

Real case: every specialty page shipped schema reading "Downsizing in Brentwood"
while the h1 read "Downsizing in the Bay Area", because the schema builder was
never handed the page's content. Structurally perfect, factually wrong, invisible.

**Enforced** (Layer 8): a page-level schema node must not name a different place
than the h1, and every `FAQPage` question must appear in the visible text — which
is Google's own requirement for FAQ markup.

Only page nodes are compared. `Organization` / `RealEstateAgent` / `Person` nodes
legitimately carry the **office** location on every page of the site, and holding
those to the h1 flags all 336 area pages for being correct.

## 3. Keywords are not branding — do not sweep them

A rebrand changes how the business is positioned. It does not mean the business
stopped working the old area, and the pages still rank for those terms.

**Leave `primaryKeyword` and `secondaryKeywords` alone** unless the agent says
otherwise. Deleting live targeting to make a find-and-replace look complete
trades real traffic for tidiness.

Where a niche page is now regional, the narrow targeting still lives on the money
pages (`/areas/<area>/<niche>`), which is where it belongs.

## 4. Widening creates contradictions — go looking for them

Copy written when the agent served a smaller area often treats the wider area as
somewhere **else**. After widening, those sentences become self-contradictory and
a reader notices immediately.

Search for the new brand name in old copy and read every hit:

| Before | Problem | After |
|---|---|---|
| "Which East County town is best for commuting **to the Bay Area**?" | You are now claiming to be in the Bay Area | "Which town has the best commute **into San Francisco**?" |
| "entry price is lower than **most of the Bay Area**" | Compares the region against itself | "lower than **the inner Bay Area**" |

Name the actual destination or the actual comparison. The fix is almost always
to be more concrete, not more vague.

## 5. Counts rot

"East County is 23 distinct areas to us" was true until five areas were added.
Any sentence containing a number about the footprint is a maintenance liability.
Check every one against `site.serviceAreas.length` when the footprint changes, or
prefer wording that does not carry a count.

## 6. Named assets are the agent's call

Lead magnets, guides, events and anything with a filename or a CRM tag may exist
outside this repo. Renaming the page while the PDF, the funnel tag and the email
sequence still carry the old name creates a mismatch nobody will notice until a
lead does.

**Never rename a named asset as part of a sweep.** Ask. A CTA's button text can
be widened without renaming the asset it points at, which is usually the right
interim move.

---

## Applying it

The trigger is always the same: **the agent tells you their service area grew.**
Before touching anything, ask which of the two kinds of sentence you are editing,
and run `npm run launch:check` afterwards — Layers 7 and 8 catch the sweep that
went too far.

A worked example. An agent branded as "East County" expands across the Bay Area:

- homepage, `/buyers/*`, `/sellers/*`, `/process` → Bay Area
- `/areas/<town>` and `/areas/<town>/<niche>` → unchanged, every one of them
- keywords → unchanged
- "commuting to the Bay Area" → "commuting into San Francisco", because the
  sentence now contradicts the brand
- lead magnets → left alone until the agent decides
