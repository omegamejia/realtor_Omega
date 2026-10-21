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

Listings live in `content/listings.ts` and render at `/listings` (searchable, with
voice) and `/listings/[slug]`. Each listing carries `SingleFamilyResidence` schema.
This is the agent's OWN manual listing data — see the IDX/MLS section for the feed
integration and its blockers.

## Add a listing

1. Collect: address, city, list price, beds, baths, sqft, lot size, garage,
   a short description in the agent's voice, a photo URL, and the listed date.
2. Add a `Listing` object to `content/listings.ts` with a slug from the address
   (e.g. `123-main-st`), `status: "active"`.
3. Confirm the details with the agent before publishing (prices are load-bearing —
   never guess a price).
4. Run `npm run validate:schema` and `npm run launch:check`, then deploy. See
   **`site-design-system`** for the full gate check.

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
