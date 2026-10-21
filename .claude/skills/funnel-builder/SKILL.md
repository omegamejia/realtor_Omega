---
name: funnel-builder
description: >-
  Build a funnel on our OWN domain (never hosted in GoHighLevel) — one or many
  pages that draw traffic toward a single goal: capture a lead, register for an
  event, book a call, sell a product, or deliver a lead magnet. Inherits the
  site's theme + business info when integrated, or runs standalone on an existing
  site. Captures into GoHighLevel via the ghl-integration skill and tags for
  delivery/nurture. Use when someone says "build a funnel", "add a lead magnet",
  "opt-in page", "landing page", "event/webinar signup", "sales funnel",
  "seller/buyer guide", or wants a focused page that trades something for contact info.
# deep judgment, voice, and creative quality
model: opus
---

# Funnel Builder — funnels on our own domain

A funnel here is **native to our site** (Next.js), not built or hosted inside
GoHighLevel. It borrows the *shape* of a GHL funnel — a focused, single-goal flow
of one or more pages — but the pages are ours, on our domain, styled by our
design system, and gate-checked like every other page. GHL is reached **only via
API** for lead capture (see the `ghl-integration` skill), never as the host.

This replaces the old "lead-magnet guide only" scope: a funnel can now pursue
**any goal**, in **1 to N steps**, and its form can collect **any fields**
(wired to GHL custom fields). Start with the traditional GHL patterns below; the
architecture is deliberately open so funnels can later add richer steps
(quizzes, calculators, and AI/conversational capture) without a rewrite.

## The anatomy every funnel reuses (learned from real GHL funnels)

1. **One audience, one pain, one goal.** Narrow beats broad — "selling a home
   during divorce" converts far better than "free home guide." Name the single
   next step and repeat its CTA down the page.
2. **The persuasion stack:** pain-point hero → outcome promise → authority/story
   → what-you-get → proof (testimonials, real only) → repeated CTA → legal footer.
3. **The capture moment:** a form (inline or popup) collecting name/email/phone +
   any custom fields, with explicit consent when SMS is involved.
4. **Delivery + nurture:** a thank-you page we host, and a **tag** that fires the
   GHL workflow which emails the lead (GHL sends the email; we own the page).


## Voice and copy — route through Krista's skills (not optional)

Funnel copy is persuasive copy under the agent's name, which is exactly what
`copywriter` exists for. Never write it freehand.

1. **`content/brand-voice.md` must be filled.** If it still has `[BRACKETS]`, stop
   and run `content-engine-builder`. No voice file means inventing a voice.
2. **`hooks`** for the headline, subheadline, bullets, and the button text. A
   funnel headline that does not stop someone is the whole funnel failing.
3. **`copywriter`** for the body: 8-step process, 14-criteria rubric (**70 minimum
   to ship, 85+ target**), Humanizer pass. Under 70 gets rewritten, not shipped.
4. Then the structure and gate rules below.

**Never generate funnel copy programmatically or from a template fill.**

## Build a funnel

1. **Define the funnel** (ask the agent, don't invent): goal, audience + their
   pain, the offer/lead-magnet, the exact form fields, the single next step, and
   whether it's **integrated** (this site) or **standalone** (their existing site).
2. **Add it to config.** Extend `site.config.ts` → `funnels[]`. A funnel now
   carries: `slug`, `goal` ("optin" | "event" | "booking" | "product" | "magnet"),
   `steps` (1..N page definitions — a single opt-in is just `steps: [one]`),
   `title`, `subtitle`, `bullets`, `formFields` (each maps to a GHL field via
   ghl-integration), `tag` (defaults to `funnel-<slug>`), `thankYou`, and optional
   `deliverUrl`. Keep single-page funnels trivially simple — most are one step.
3. **Build the page(s)** with the design system — always. Route headers through
   `<PageHero>`, use the brand tokens and shared components (see
   `site-design-system`). Integrated funnels **inherit** `brand`, business info,
   and `location` from `site.config.ts` automatically; a standalone funnel gets
   its own light config for those. Never hand-roll one-off styles — that's the
   whole reason the theme lives in one place.
4. **Wire capture via `ghl-integration`.** Hand it the `formFields`; it provisions
   the custom fields in the agent's GHL folder, records each field's id/key back
   into the funnel config, applies the `tag`, and posts through `/api/lead`. Do
   **not** write bespoke GHL calls here.
5. **Write real content.** Any lead magnet / guide is a real page, gate-checked —
   genuinely worth an email address, **verified facts only**, unknown stats as
   `[PLACEHOLDER: local stat to verify]` (follow `realtor-content-writer`'s
   content-model). No invented proof, reviews, or numbers. Ever.
6. **Thank-you + delivery.** The thank-you page is ours (links to the guide/asset
   or confirms the booking/registration). The **tag** fires the GHL workflow the
   agent builds to send the delivery email + nurture. Offer this same tag→email
   option to the plain contact page too, not just funnels.
7. **Gate + connection test.** Run `site-design-system`'s gate
   (`npm run validate:schema` + `npm run launch:check` against `npm run dev`) AND
   `ghl-integration`'s connection test. A funnel isn't done until both pass —
   pages clean, and a real test lead lands in GHL with its fields + tag.
8. **Promote it.** Funnels are ad/social destinations, not main nav. Link the
   opt-in from the relevant pages and campaigns.

## Multi-step (keep it open)

Most funnels are one page. When more are needed (long-form sale → opt-in →
upsell → thank-you), each step is a page def in `steps[]`. **Don't hard-code what
each step must do** — every use case differs. Default to capturing all fields at
the single capture moment; only split capture across steps when the use case
truly calls for it. Leave room for future step *types* (quiz, calculator,
AI/conversational capture) — add a new step renderer, not a new funnel system.

## Standalone vs. integrated

- **Integrated:** lives in this seed site, deploys to the same domain, inherits
  theme + business + GHL `locationId`. This is the default.
- **Standalone:** same funnel structure and the same `ghl-integration` pipe on
  someone's existing site; brand/business/GHL live in that project's own config.

## Hard rules

- Never host in GHL — funnels are our pages; GHL is API-only capture + nurture.
- Never bypass `ghl-integration` for CRM calls, and never call a funnel wired
  without its connection test passing.
- Real value + verified facts only; the gate blocks filler — don't force past it.
- One audience, one goal, one next step per funnel. Focus is the conversion.
- Inherit the theme; don't restyle a funnel off-system.
