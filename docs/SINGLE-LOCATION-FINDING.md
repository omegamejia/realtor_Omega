# The seed is the wrong shape for a single-location business

Research, 2026-09-28. No changes made.

## The short version

A single-location business publishing a page per nearby town is not merely
awkward. **It is the textbook definition of a doorway page, and the penalty is
domain-wide.**

> "When a single-location business publishes city pages for areas where it has
> no physical presence, no address, no staff, and no local inventory, hoping to
> intercept near-me searches, this creates a doorway page violation."

> "When Google penalizes doorway pages, your entire domain gets filtered out of
> local search results, not just the spammy pages... Businesses have lost 60 to
> 80% of their organic traffic overnight."

Cedar Lane Antiques has one address, on Cedar Lane in Teaneck. It has no
presence, staff or stock in Hackensack, Englewood or Bergenfield. The twelve
pages I built at `/areas/<town>/<category>` are that pattern exactly.

**And the seed's own gate already told me so.** It failed those twelve pages at
57 to 59% similarity, and the definition of the violation is "essentially the
same content as other location pages with just the city name swapped". I read
that as a writing problem and rewrote the sections until the number dropped.
The number was a symptom. The pages should not exist.

## What the shape actually is

Three shapes, and only the first one earns area pages.

| Shape | Who travels | Area pages? |
|---|---|---|
| **Multi-area service** (plumber, HVAC, realtor) | The business goes to the customer | Legitimate, if each has real depth |
| **Single-location destination** (shop, salon, gym, restaurant) | The customer comes to the business | **No. This is the doorway pattern** |
| **Hybrid** (this shop: counter trade plus house clearances) | Both, for different halves | **One** service-area page, not a matrix |

For the hybrid case the research is unambiguous about the safe form:

> "a single strong service-area page that clearly explains coverage, response
> times, and logistics is often safer than 25 near-duplicate city pages, since
> depth usually outperforms sprawl."

So Cedar Lane needs **one** page covering where the van goes. Not twelve.

## What a single-location business needs instead

The area matrix is occupying the space where the things that actually drive
visits should be.

**1. Stock. This is the finding I did not expect.**

> "Your inventory is your best salesperson."

The central problem for independent retail is that shoppers cannot tell what is
actually in a shop right now, so they do not come. And **76% of people who
search for something nearby visit a store within 24 hours.** For a shop whose
whole pitch is that the stock changes weekly, a page showing what came in this
week is worth more than all twelve area pages combined.

The seed has no concept of it. The realtor seed has listings, which is exactly
this idea wearing a different hat, and it did not travel.

**2. Hours and the map, treated as primary rather than as footer furniture.**

**3. A reason to come that is not a transaction.** Events, demonstrations,
tastings, regular hours where something happens. Turning the place into a
destination rather than a shelf.

**4. The bridge from online to in person.** 36% of online orders at independent
retailers are fulfilled as in-store pickup, against roughly 10% nationally.

**5. The sell-to-us intent**, which earlier research found is routinely
overlooked on shop sites and is half this business's revenue.

## What I got wrong, specifically

- **I did not ask.** I inherited `serviceAreas` from the seed and invented a
  "buying radius" so the structure would have something to hold, rather than
  saying the structure did not fit.
- **"The Houses That Take Longest To Look At"** is a heading about my own
  workflow. No customer has ever wanted to know which houses take me longest.
- **I treated a gate failure as a copy problem.** The near-duplicate check was
  telling me the information architecture was wrong and I edited prose until the
  warning went away.

## What I would propose, for a decision rather than to act on

1. **A third seed, or a mode of the local-service seed**, for single-location
   businesses: stock-first, no area matrix, one service-area page only where the
   business genuinely travels.
2. **A stock concept in that seed**, modelled on the realtor seed's listings,
   because "what is in the shop this week" is the single highest-value page such
   a business can have.
3. **A gate rule**: if `businessType` is a single-location shape and more than
   one area page exists, fail with the doorway explanation rather than waiting
   for the near-duplicate check to hint at it.
4. **A setup question that is currently missing entirely**: *do customers come to
   you, or do you go to them, or both?* Everything above follows from the answer,
   and nothing in the seed asks it.

## Sources

- [StoreRocket, why Google penalizes doorway pages](https://storerocket.io/learn/doorway-pages)
- [Splinternet Marketing, doorway risk on city and service-area pages](https://splinternetmarketing.com/digital-strategy/google-doorway-page-risk-fixing-city-and-service-area-seo/)
- [Web Moves, how many service-area pages the evidence supports](https://www.webmoves.net/how-many-service-area-pages-should-you-have/)
- [Workstand, your inventory drives foot traffic](https://blog.workstand.com/your-inventory-drives-foot-traffic)
- [Verde Media, local inventory and near-me shoppers](https://verdemedia.com/blog/local-inventory-ads-explained)
- [SmartBrief, independent retailers and in-store experience](https://www.smartbrief.com/original/independent-retailers)
- [Second To None, turning a store into a destination](https://www.second-to-none.com/turn-retail-store-destination/)
