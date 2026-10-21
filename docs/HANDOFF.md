# Handoff, 2026-09-28

Written at the end of a long session that produced real seed improvements and a
demo site that is still wrong. Read the "what is still broken" and "how this went
wrong" sections before touching anything.

## Where the code is

| What | Where | Branch | State |
|---|---|---|---|
| **realtor seed** | `~/projects/realtor-site-seed/.claude/worktrees/hopeful-banach-555356` | `claude/hopeful-banach-555356` | committed, not merged |
| **local-service seed** | `/private/tmp/claude-501/lss-theme` (worktree) | `feat/photography-first` | committed, **not merged** |
| **demo instance** | `~/projects/cedar-lane-antiques` | no git | running on **:3040**, production build |
| **design reference** | `~/projects/krista-mashore-site` | untouched | the Turnberry theme this all came from |

**The local-service seed worktree is temporary (`/private/tmp`).** Its branch
exists in the real repo, but the working copy will not survive a reboot. Merge
or re-checkout it early.

**`~/projects/local-service-site-seed` has another session's uncommitted work in
it** (a `site.positioning` block in `site.config.ts` and `app/page.tsx`). That is
why everything was done in a worktree. Do not clobber it.

## What actually got built (this part is good and worth keeping)

**The look.** The photography-first Turnberry theme was living only in
`krista-mashore-site` and never went back to the seeds, which is why every
generated site looked older than the demo. Both seeds now have `app/tb.css`, the
`tb` component set, Newsreader + Montserrat, and `app/tb.css` added to the
`update-engine` ENGINE list so existing sites actually receive it.

**Media that is never empty.** `content/sample-media.json` fills every frame from
the first render, each slot carrying a `need` line describing the real photo, so
the registry doubles as the shot list (`npm run shot-list`). `launch:check` fails
any page still on a sample host. Slots carry `suits` so a photo of a trade is not
shown to a business in a different trade.

**Checks added to `launch:check`, all of which caught real defects:**

- `checkLinksResolve` follows every internal link and fails on 404. Found 21 on a
  "finished" site.
- The doorway rule: a single-location business may not publish town pages.
- `reader:` required on every written page.
- Proform check ("a whole one") and a decode-cost check for long sentences.
- Stock freshness.
- Irregular past tenses added to the verb list (it read "the teak CAME out of a
  house" as a fragment).

**Shape, not subtraction.** `business.whoTravels` (`customer` / `business` /
`both`) and a `site.pages` manifest decide which routes exist. Routes, sitemap,
nav, footer and mobile menu all read the same helper.

**Copy process.** `content/market-research.md` is a gated step before any copy.
`brand-voice.md` now asks for three or four readers with awareness levels rather
than one. Research during the session found things that changed the site: families
settling an estate do not know buyouts exist (awareness level 2), and what the
category leaves unsolved is the leftovers.

## What is still broken

1. **The areas are still there, and this is the thing to fix first.**
   `CascadeFlyout` in `components/Navbar.tsx` still renders area names inside the
   "What We Do" menu even when `hasPage("areas")` is false. On the demo it shows
   `[Area One] [Area Two] [Area Three]`. **It is on screen right now.**
2. **`serviceAreas` should probably leave the `customer` shape entirely**, not be
   hidden. Hiding it is what produced the whack-a-mole above. If the data is not
   there, nothing can render it.
3. **Cedar Lane's page copy was never rewritten** for the new shape. What existed
   was mostly the twelve area pages that should not exist. Config is filled; the
   pages are not.
4. **`/sell` was planned and never built.** The sell-to-us intent is half this
   business and research says shop sites routinely bury it.
5. **Pages were removed by blanket default rather than by asking.** `process` and
   `team` may well be right for a salon or a clinic. The manifest supports them;
   the defaults were set without checking.
6. **`launch:check` should run against a production build.** The dev server
   exited repeatedly during this session (Next watches stdin and dies on EOF when
   a tool call ends), so some "verified" runs were against a dead server.

## How this went wrong, so it is not repeated

These are process failures, not knowledge gaps. Every one of them cost an hour.

1. **Fixing one layer and declaring it done.** Routes were guarded but not the
   links to them. One menu was fixed and not the other. Desktop nav and not
   mobile. Every single time, the user found the next layer.
2. **Trusting a script over looking.** "Zero broken links" was reported while the
   menu on screen still listed dead areas, because the checker reads crawled HTML
   and nobody ever opened the menu and read it.
3. **Treating an architecture failure as a copy failure.** The near-duplicate
   check flagged twelve town pages at 57 to 59%. The prose was rewritten until
   the number dropped. The number was a symptom; the pages should not have
   existed.
4. **Not asking whether the structure fit the business.** The seed's area matrix
   was inherited and a "buying radius" was invented so it would have something to
   hold, instead of saying it did not fit.
5. **Subtracting instead of designing.** The site was built by stripping pieces
   off a real-estate template as each one was objected to, rather than deciding
   what a single-location shop needs and building that.

## Suggested order for the next session

1. Delete `serviceAreas` from the `customer` shape and rip `CascadeFlyout`'s area
   branch out. Then load the site and **open every menu by hand.**
2. Decide the real page set for a single-location shop with the owner's answers,
   not by defaults. Build `/sell`.
3. Write the copy from `market-research.md`, one reader per page.
4. Merge both seed branches. The local-service worktree is in `/private/tmp` and
   is not durable.
5. Point `launch:check` at a production build.

## Research gathered today, with sources

- Doorway pages: the penalty is domain-wide, 60 to 80% traffic loss.
  [StoreRocket](https://storerocket.io/learn/doorway-pages) ·
  [Splinternet](https://splinternetmarketing.com/digital-strategy/google-doorway-page-risk-fixing-city-and-service-area-seo/)
- One strong service-area page beats 25 near-duplicates.
  [Web Moves](https://www.webmoves.net/how-many-service-area-pages-should-you-have/)
- Inventory drives foot traffic; 76% who search nearby visit within 24 hours.
  [Workstand](https://blog.workstand.com/your-inventory-drives-foot-traffic) ·
  [Verde Media](https://verdemedia.com/blog/local-inventory-ads-explained)
- Most antique buyers browse rather than search for a specific item; the
  sell-to-us intent is routinely overlooked.
  [Digital Drew SEM](https://digitaldrewsem.com/antique-shops-can-attract-high-intent-buyers/)
- Families assume their only options are an estate sale, a tag sale or an
  auction, and are left holding the leftovers.
  [Ohio Estate Liquidation](https://ohioestateliquidation.com/) ·
  [NY Showplace](https://estatebuyers.nyshowplace.com/)
- Dental anxiety is about 36% of patients, 12% severe; emergency intent is the
  highest-converting page on a practice site.
  [Willis Dentistry](https://willisdentistry.com/blog/10-questions-every-new-patient-should-ask-before-choosing-a-dentist) ·
  [O360](https://o360.com/blogs/2026-top-seo-trends-for-dental-websites/)
