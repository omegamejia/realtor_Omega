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

None of the last four are visible on screen. That is exactly why a listing added
with a field missing looks completely fine to the person who added it, and why
the gate checks them mechanically.

**This is not hypothetical.** An agent's voice caller was pointed at her listings
page and answered "I don't have one of those" about a property that was plainly
on her site. The page was crawlable, the prices were in the HTML, and the
structured data described her company and twenty team members and not one house.
Nothing failed. Nothing warned. `npm run launch:check` now catches that case.

## Add a listing

1. **Collect**: address, city, list price, beds, baths, sqft, lot size, garage,
   property type, stories, year built, features, a description in the agent's
   voice, a photo, and the listed date.
2. **Get the coordinates.** Open the address in Google Maps and copy the latitude
   and longitude out of the URL into `geo`. **This is required and the gate fails
   without it.** Never estimate them from the town centre: a pin in the middle of
   town is confidently wrong in a way nobody notices, and the schema then ships
   with no location at all.
3. Add the `Listing` object to `content/listings.ts` with a slug from the address
   (e.g. `123-main-st`) and `status: "active"`.
4. **Confirm every number with the agent before publishing.** Prices are
   load-bearing. Never guess one.
5. Run `npm run validate:schema` and `npm run launch:check` against a running
   `npm run dev`, then deploy. See **`site-design-system`** for the full gate.
6. **After deploying, refresh the CRM knowledge base.** The agent's voice caller
   and chat were trained on the previous version of `/listings` and `/ai-brief`,
   so until those URLs are re-crawled the assistant does not know the new home
   exists. In Mashore Method: **AI Agents → Knowledge base → the listings base →
   refresh the row**, then use **Test retrieval** and ask about the new address
   before telling the agent it is live.

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
