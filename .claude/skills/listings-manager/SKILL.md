---
name: listings-manager
description: >-
  Manage the agent's property listings on their site — add a new listing, update
  one, and mark a listing sold (with the closing details). Use when someone says
  "add a listing", "new listing at [address]", "update the [address] listing",
  "I just sold [address]", "mark [address] sold", "put [address] pending", or asks
  about the listings page / MLS / IDX.
# fast, well-defined, structured work
model: sonnet
---

# Listings Manager

Listings live in `content/listings.ts`. **One record feeds six things**, and that
is the whole design:

| What reads it | Why it matters |
|---|---|
| `/listings` and `/listings/[slug]` | What a visitor sees |
| **The map pin** | Uses the listing's `geo`, not its address text |
| **`lib/schema.ts`** | `SingleFamilyResidence`, on the detail page AND inside an `ItemList` on `/listings` |
| **`/listings/details`** | Every listing in full, on one crawlable page |
| **`/ai-brief`** | The single URL an outside assistant is pointed at |
| **The on-site chat**, via `lib/knowledge.ts` | Answers from the same record |
| **The AI phone assistant**, via the `voice-agent` skill | Answers callers from a GoHighLevel knowledge base that must be resynced |

None of the last four are visible on screen. That is exactly why a listing added
with a field missing looks completely fine to the person who added it, and why
the gate checks them mechanically.

**This is not hypothetical.** An agent's voice caller was pointed at her listings
page and answered "I don't have one of those" about a property that was plainly
on her site. The page was crawlable, the prices were in the HTML, and the
structured data described her company and twenty team members and not one house.
Nothing failed. Nothing warned. `npm run launch:check` now catches that case.

## Add a listing

### Step 0 — Ask for a link, not fifteen facts

**Never open with the field list.** Collecting address, city, price, beds, baths,
sqft, lot size, garage, type, stories, year built, features, description, photo
and listed date by asking is fifteen questions for one house — and an agent with
five listings will not sit through seventy-five. They also already typed all of
it once, into the MLS.

**The agent is the source of truth, and it is not close.** They are the listing
agent. They wrote the MLS entry, they hired the photographer, they know the
price, the status and the closing date. Everything below is a way of not making
them retype what they already wrote — it is never a way of finding out something
they did not tell you.

**Look where they have already written it, before you ask anything.**

**1. Their Agent-OS, if they have one.** This is the first place to look and it
often has the whole listing already. Locate the vault the way
`realtor-site-setup` §2a does, then read:

| Where | What is in it |
|---|---|
| `04-Listings/<address-slug>/Listing-Details.md` | MLS info, price, status — the record itself |
| `04-Listings/<address-slug>/Listing-Description-Long.md` | **The site description.** Long-form, written for a landing page, already in their voice |
| `04-Listings/<address-slug>/Photos/` | Their own photos, or a link to where they are |
| `06-Pipeline/<address-slug>/Timeline.md` | Under contract, with the real milestone dates including closing |
| `99-Archive/Listings/<year>/<address-slug>/` | Closed — a sold listing |
| `10-Daily/<newest>-morning-brief.md` | Its **Active listings** and **Pipeline deals** sections are a current snapshot of what they have |

Two details worth knowing. **`Listing-Description-Long.md` is the one you want**
— `Listing-Description-MLS.md` sitting beside it is the portal copy, and that is
the one that is duplicated across Zillow and everywhere else. And a listing's
**folder location is its status**: `04-Listings` is active, `06-Pipeline` is
under contract, `99-Archive/Listings` is sold. Read the status from where the
folder lives, then confirm it, rather than asking them to recite their own
pipeline.

**Check the dates.** A morning brief from six weeks ago lists what was true six
weeks ago. Use it to know what to ask about, never as the current state.

**2. Their email or Drive, only if connected and opted in** (see
`listings-routine`). A listing agreement or MLS sheet for that address is often
already there. Never go fishing for anything else, and say what you found before
you use it.

**3. Ask them — and the MLS link is the one outside source.** If none of the
above has it:

> "Easiest way: send me the MLS link or the listing sheet for it, and I'll pull
> the details off and show you what I got. Or just tell me the address and I'll
> ask you about the rest."

**Do not go to Zillow, Redfin or Realtor.com for this, and do not offer to.**
Three reasons, each sufficient: those pages are third-party copies that lag the
MLS, so a price or status from one can be wrong on their site under their
licence; the photos on them are not theirs to give (see below); and the text is
the syndicated portal copy. The agent's own MLS link, handed to you by the
agent, is a different thing — that is their listing, from the system of record.

### Step 0b — What you may take, and the three things you may not

Everything you pull is a **candidate, never a fact**
(`.claude/rules/truth-verification.md`). Extract it, then show it as one compact
list and ask *"what's wrong here?"* — one question instead of fifteen, and the
corrections are the confirmation.

Three exceptions, and they matter:

1. **The description depends entirely on where it came from.**

   - **Their own long-form description** — `Listing-Description-Long.md` in their
     Agent-OS, or anything they wrote for this purpose — is exactly right. It is
     theirs, it is already in their voice, and it was written for a page like
     this one. Use it, and show it to them before it goes live.
   - **The MLS remarks and any portal copy are not.** Two separate reasons and
     either is enough: that paragraph is already syndicated across a dozen sites,
     so republishing it gives their page nothing Google has not indexed
     elsewhere — and MLS content carries display rules (`legal-compliance.md` §7)
     that an IDX embed satisfies and a copy-paste does not. Read it for the
     facts, then **write a fresh one in their voice** and have them approve it.

2. **Photos come from them, never off a page.** Listing photos are almost always
   the **photographer's** copyright, licensed to the listing brokerage — not to
   the agent personally, and not to us. The `Photos/` folder in their own
   Agent-OS listing folder is the good case: those are the files they were sent.
   Pulling the same images off Zillow is not.

   When there is no folder, ask: *"can you send me the photos? Whatever your
   photographer sent you, or the folder your brokerage has — the actual files
   rather than the ones on a listing site, because those are usually licensed to
   the brokerage rather than to you."* If they are confident they hold the rights
   to images on their own brokerage page, that is their call to make, and it goes
   in `public/images/CREDITS.md`. A missing photo falls back to a gradient and
   never looks broken, so waiting for the real files always beats taking the
   wrong ones.

3. **Confirm price and status out loud, whatever the source said.** A price is
   the single most load-bearing number on the page, and status decides whether
   the phone assistant offers the house at all. Even a file in their own vault is
   a snapshot of the day it was written. One sentence, every listing, every time:
   *"$625,000 and active — both still right today?"*

### Step 0c — Then do the parts they cannot

Do not hand any of this back to them:

- **Geocode the address yourself** for `geo` (step 2). Do not ask an agent for
  latitude and longitude, and do not ask them to read it out of a Maps URL.
- **Work out the slug, the listed date** from what they sent, and the property
  type from the facts.
- **Say which fields you could not find**, name them, and ask only for those.
  That is the short list the agent actually has to answer — usually HOA, the
  photos, and whatever the sheet left blank.

### Step 1 — The record

**Collect** (now mostly filled in from the harvest above): address, city, list
price, beds, baths, sqft, lot size, garage, property type, stories, year built,
features, a description in the agent's voice, a photo, and the listed date.
2. **Get the coordinates — you do this, never the agent.** Look the address up
   yourself and put the latitude and longitude in `geo`. **This is required and
   the gate fails without it.** Never estimate them from the town centre: a pin
   in the middle of town is confidently wrong in a way nobody notices, and the
   schema then ships with no location at all.

   Asking an agent to find coordinates is asking them to read a web address and
   pick two numbers out of it. If you genuinely cannot resolve the address, say
   which address failed and ask them to confirm it is right — a geocode that
   finds nothing usually means a typo in the street name, not a missing skill.
3. Add the `Listing` object to `content/listings.ts` with a slug from the address
   (e.g. `123-main-st`) and `status: "active"`.
4. **Confirm every number with the agent before publishing.** Prices are
   load-bearing. Never guess one.

   **A number they don't know stays unset, never 0 and never "about".** Year
   built, stories, lot size and garage are all optional for exactly this reason.
   "Built in the 90s I think" is not a year: leave `yearBuilt` out, and the
   assistant tells a caller it will confirm rather than stating one. Put it on
   `content/OPEN-ITEMS.md` so it gets filled from the MLS sheet later.

   **HOA has three answers, and they are written differently.** The details go in
   `hoa`. A confirmed "no HOA" is `hoa: false`. "Not sure" leaves `hoa` out
   entirely. Never record "no HOA" as a feature or a description line instead:
   the assistant reads `hoa`, and a missing one tells callers it will confirm.
5. Run `npm run validate:schema` and `npm run launch:check` against a running
   `npm run dev`, then deploy. See **`site-design-system`** for the full gate.
6. **Then run the `voice-agent` skill.** This is not optional and it is not
   just a refresh. The AI phone assistant answers from a knowledge base that has
   to learn the new property AND be told it belongs in the town list, the price
   band, the bedroom count and every feature category it matches. A listing that
   is on the website but not in those lists is one the caller will deny having.

   The same applies in reverse: **when a listing sells, `voice-agent` removes it
   everywhere**, because an assistant offering a sold house is worse than one
   that knows nothing.

Everything else happens on its own. The detail page, the brief page, the schema
and the chat context are all generated from the record you just added, so there
is no second file to update and no step to forget.

## Update a listing

Edit the listing's fields in `content/listings.ts`. Re-run the gates.

## Mark a listing SOLD (the closing flow)

When the agent says "I just sold [address]":
1. Congratulate them.
2. Set the listing's `status: "sold"`, and add `soldDate` and `soldPrice`.
3. If the agent wants, offer to pull the closing details from their email/CRM to
   fill `soldDate` / `soldPrice` — but ECHO IT BACK and get confirmation before
   writing (a sale price is a load-bearing number; never guess it). If you can't
   confirm, leave it and ask.
4. Sold listings drop out of the default `/listings` view (they're kept for the
   record and for `SoldOut` schema). Optionally feature them as social proof.
5. Run the gates, deploy.

Optional automation: a companion skill can watch the agent's email around a known
closing date for the settlement statement, then propose the sold update for their
confirmation. Never auto-write a price without the human confirming it.

## The on-site chat + voice search

- **Chat widget** (`/api/chat`) answers visitor questions from the site's own data.
  It runs live when the owner sets `ANTHROPIC_API_KEY`; otherwise it points visitors
  to the phone/contact page. It's a paid API per message — keep the rate limit and
  see the README cost note before a high-traffic launch.
- **Voice/text search** on `/listings` searches the agent's OWN listings (beds,
  baths, max price, keywords). It does NOT search the MLS.

## IDX / MLS search — the simple, zero-friction path

Full MLS search (every listing, auto-updating) is easy to add and stays MLS-compliant:

1. The agent already has (or signs up for) an **IDX provider** — IDX Broker,
   iHomefinder, Showcase IDX, Realtyna, or their MLS's own IDX. The provider is the
   one with MLS permission; that's the point.
2. The provider gives an **embed URL** (an iframe). Paste it into
   `site.config.ts → idx.embedUrl`.
3. It renders as a full MLS search on `/listings`. Done. No API, no MLS negotiation,
   no code. The provider handles compliance and keeps it current.

That is the frictionless version, and it's what most agents want. Use it.

## The harder part: AI / voice search OF the MLS (blocked today)

Letting the site's AI (or the voice search) query the *whole MLS* is a different,
harder thing, and you should be honest that it isn't ready:
- **MLS permission:** many MLSs restrict AI use of their data and require explicit
  permission.
- **IDX is a feed in an iframe**, not content the AI can freely read/search.
- **Interim data option:** a source like Property Raider (~$75/mo) can provide some
  of this outside the MLS restrictions.

So: the on-site voice/text search covers the agent's OWN listings; the embedded IDX
covers the full MLS via the provider; AI-searching the whole MLS is a future item.
Never promise MLS auto-sync beyond the IDX embed.

## Where listing data may come from

Listing facts — address, price, beds, baths, square footage, status — are
**confirmed or absent.** Never carry a number over from a portal listing, an old
flyer, or memory without the agent confirming it: a wrong price or square footage
on a licensee's own site is a correctness problem before it is an SEO one.

See `.claude/rules/truth-verification.md`. Anything unconfirmed goes on
`content/OPEN-ITEMS.md` rather than onto the page.
