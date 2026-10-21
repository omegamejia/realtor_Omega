# What changed in the engine

Your site is two things. **Your site** is `site.config.ts` and `content/` — your
facts, your words, your photos. **The engine** is everything else: the page
templates, the schema generator, the design system, the skills Claude uses, and
the launch gate. `npm run update:engine` replaces the engine and never touches
your site.

This file is the record of what changed and, more usefully, **what each change
might ask of you.** Some updates are pure machinery and you will never notice
them. Others add a rule that your existing pages have to satisfy, and those are
the ones worth reading.

Each entry is tagged:

| Tag | Meaning |
|---|---|
| `machinery` | Nothing is asked of you. It just works better. |
| `content` | Your existing pages may need a look. The gate will tell you which. |
| `decision` | There is a choice to make, and it is yours. |

**Nothing here is applied to your site automatically, and nothing should be.**
Claude reads this file, tells you what changed in plain language, checks whether
any of it conflicts with what you have written, and asks before doing anything.

---

## 2026-10-02 — IDX has a written procedure, and the gate can see it

### `decision` · Two things about IDX that everybody gets wrong

The setting always existed and always took two minutes. What was missing was
everything around it, and two assumptions an agent makes that are both wrong and
both expensive.

**IDX will not help you rank.** The MLS search sits in a frame served by your
provider, and Google credits content inside a frame to the address the frame
points at — your provider's, not yours. What IDX actually buys is retention:
somebody who wants to browse the whole market does it on your site, next to your
phone number, instead of leaving for Zillow. That is a good enough reason to buy
it. It is not an SEO reason, and an agent who buys it expecting rankings has
bought the wrong product.

**It is not a quick job, and most of it is not ours.** Your broker signs the MLS
data licence, the MLS approves the vendor and the specific web address, then the
provider hands over a link. Days to weeks. Pasting the link in is the two-minute
part. **If you want IDX, the thing to do today is ask your broker and ask your
MLS for their approved-vendor list** — not wait for a step in your setup.

The whole procedure, including what to say and a checklist to copy, is now in
**`docs/IDX-SETUP.md`**.

### `content` · The launch check now looks at your IDX setting

A blank setting is reported as a perfectly finished state rather than nagged
about — plenty of agents never buy a provider and the listings page works without
one.

A setting that is filled in **wrongly** now stops the launch: a placeholder left
in place, an address that is not `https://`, something that is not a web address
at all, or a value that never reaches the page.

It also says plainly what it **cannot** check — whether your provider's search
actually loads. That frame belongs to them, so nothing on our side can see inside
it, and an address your provider has not approved shows an empty box rather than
an error. Which is why the last step is always a person opening the page.

### The MLS search now fits a phone, and is locked down

It was a fixed height, so on a phone your provider's page scrolled inside a short
window and that inner scrollbar fought the page. It is sized to the screen now.

The frame is also sandboxed: it gets what a property search genuinely needs and
nothing else.

### New troubleshooting entry: "the MLS search is an empty grey box"

This happens to nearly everybody twice — once on the first deploy, and again the
day the real domain is connected, because your provider's permission is granted
per web address. A new domain is a new address.

---

## 2026-09-24 — Your listings come from you, and each one gets its own page

### `decision` · Claude will stop reading listings off a website — including yours

Two rules, and both came out of a real near-miss on a working site.

**Where a listing comes from.** From now on Claude builds a listing from one of
three places only: **what you tell it**, **your Agent-OS `04-Listings/` folder**
if you have one, or **an MLS link you hand it**. Never from a web page — not
Zillow, and not your own current website.

Why that last one matters: on a real agent's site, Claude pulled seven
properties off the "Featured Listings" strip on her homepage. That site turned
out to have **two different sets of listings** — the homepage strip, and a
separate listings section with five completely different addresses. They
disagreed about which houses existed, and about status: a homepage card said
*"PENDING, multiple offers, $100,000+ over asking"* while that same property's
own page said *"JUST LISTED"*. Nothing looked broken. A set of wrong listings
nearly went live under a licensed agent's name.

Your own website is a snapshot of whenever somebody last updated it, and there
is no way to tell which parts stopped being true. You know which houses you are
working on. Claude will ask.

**One listing, one page.** Every property gets its own page at
`/listings/<address>` — one record, one page, named for the address. A
"featured" strip on your homepage is a *view* of those pages, never a separate
list. That is what stops the two-sets-of-listings problem happening on your
site.

**What this asks of you:** nothing changes on your site. Next time you add a
listing, Claude asks you rather than going looking — which is faster anyway, and
it means the AI phone assistant answers callers from facts you confirmed.

---

## 2026-09-23 — Straight answers to the questions everyone asks

### `machinery` · A page of plain answers: `docs/FAQ.md`

New page, written from the questions agents actually asked out loud partway
through their own builds on the first workshop call. Will this replace the website
I already have · do I need my domain yet · what does "building it locally" mean ·
my spouse and I are both here, do we each build one · my Google listing has an old
office address · what is Vercel and does it cost money · do I still need IDX.

`docs/TROUBLESHOOTING.md` is still the page for when something looks broken. This
one is for when nothing is broken and you want to know what is going on. You can
also ask Claude any of it in your own words — it reads from the same page, so you
get the same answer every time rather than a fresh guess.

### `machinery` · Setup no longer sounds like it is going to delete your website

Two wording fixes, both from watching people freeze on a live call.

The question about how the new site should **look** used to offer a "fresh start",
and more than one agent heard that as *we are about to replace the site I already
have*. It now says plainly that it is asking about the look of the new site and
that your existing one is not affected either way — and setup says so the moment
you mention having a site, rather than waiting for you to ask.

The second is the domain. You do not need one to build this, and being asked about
it early made people think a decision was due. Setup now explains what "locally"
means — it lives on your computer, it looks and works like a real site, you are
the only person who can see it — and leaves the domain until the end, where it
belongs.

**What this asks of you:** nothing. No page of yours changes.

---

## 2026-09-15 — Your own Facebook and Google tracking, if you run ads

### `decision` · Put your own pixel on your site

If you advertise on Facebook or Instagram, or want to see your traffic in Google
Analytics, your site can now carry your own tracking tags. Ask Claude and it will
set them up from two IDs you copy out of your own accounts.

They are **your** tags on **your** accounts. Nothing reports to KMC or to anyone
else, and nothing loads at all until you supply an ID — so a site that never asks
for this stays completely free of other companies' scripts.

What you get: every page view counted, and a **lead** recorded the moment someone
submits your contact form or a funnel, so what your ads report matches what
actually landed in your CRM. What is never sent: the person's name, email or
phone. The event says a lead happened, not who it was.

**What this asks of you:** two things, if you want it. The IDs, and a paragraph
in your privacy policy naming the companies involved — Claude writes it with you,
and the launch check refuses to let a site go live with tracking that the policy
does not mention.

### `decision` · Heatmaps and recordings, free

Your site can show you how people actually use it: where they scroll to, what
they click, and what they click that isn't a button. It runs on Microsoft
Clarity, which is free with no limit on your traffic and keeps recordings for 90
days. You create the free account and hand Claude the project ID; there is no
code for you to paste anywhere.

It hides what visitors type into forms, and that stays hidden.

### `machinery` · Tracking is checked before launch, not only at it

Your site's pre-flight checklist is skipped while you are still building, which
is right — it would only ever report your own unfinished pages. One rule now runs
anyway: if a tracking tag is switched on, your privacy policy has to name the
company behind it. Sites are online and visited long before they launch, and a
pixel does not wait for launch day to start watching.

**What this asks of you:** nothing, unless you have tracking on and no paragraph
about it. Then it will tell you, rather than waiting until launch.

### `machinery` · Engine updates now include the automated jobs

`npm run update:engine` never copied the folder that holds the automated checks
and the weekly report job, so an update could tell you it was finished and leave
you without a Monday report. It copies them now.

### `machinery` · Every lead now says which advert brought it

When somebody fills in a form, the campaign they arrived from is saved with them
in your CRM — the source line and the contact's timeline. So "which ad produced
this person?" is answered where you already look, instead of only inside
Facebook's or Google's own dashboards.

It records the campaign, not the person: the advert's tags, and the click ID the
ad platform adds itself. The site a visitor came from is reduced to its name
("facebook.com"), never the full address.

**What this asks of you:** nothing. It works on its own once your ads are running.

### `decision` · A weekly report that tells you what to change

Every Monday your site collects its own numbers — leads, what is on the site, and
what Clarity saw — whether or not your computer is on. Then you say to Claude
**"walk me through this week's report"** and get it in plain English: what
happened, whether last week's suggestions worked, and the two or three things
worth changing next.

The grading is the point. A dashboard nobody opens changes nothing; a short
weekly conversation that ends in two specific changes does.

**What this asks of you:** say "set up my reporting" once. About twenty minutes,
most of it creating free accounts. `docs/REPORTING.md` is the plain-language
version to read first.

---

## 2026-09-14 — Keeping your own website? Your phone assistant can still know your listings

### `decision` · A route for agents who are not using this site

If you already have a website you are happy with, your AI phone assistant can
still know every one of your listings. Instead of the assistant reading your
pages, Claude writes the facts of each home straight into its knowledge base —
the same information, published to one place instead of two. No hosting, no
domain, nothing to deploy.

Two things to know before choosing it. Every change has to be pushed by Claude,
because there are no pages to re-read: a price change or a sale is wrong on the
phone until that happens, so the recurring listings check matters more. And
nothing here is findable by Google or by AI search, because the knowledge base is
private to your assistant.

**What this asks of you:** nothing, unless you want it. Having your own site is
still the better answer for most people, and this is here for when it isn't.

---

## 2026-09-11 — Your assistants no longer read placeholders out loud

### `machinery` · Unfinished details are left out of what your assistants read

Until your site is finished, parts of it are still stand-ins, like
"[Neighborhood One]" or the example listing the site ships with. Your AI phone
assistant and your chat assistant read the same details your pages do, so one
connected before launch could tell a caller you work in "[Neighborhood One]", or
count the example as a home for sale.

Anything still a stand-in is now left out of what they read. Your pages are
unchanged, and the launch check still refuses to launch until everything is real.

### `machinery` · "I don't know the year it was built" is now an allowed answer

A listing used to require a year built and a number of stories, so when you
didn't know one it went in as 0, and your phone assistant read "built 0" as a
fact. Both are now optional. Leave them out and the assistant tells a caller it
will confirm, instead of stating something nobody checked.

### `content` · "No HOA" and "not sure about the HOA" are now different answers

A listing with no HOA details used to tell your phone assistant "HOA: none",
including when nobody actually knew. Now a listing says one of three things: the
HOA details, a confirmed "none", or that it isn't on record, in which case the
assistant offers to confirm with you.

**What this asks of you:** after updating, any listing where you never entered
HOA details will read "not on record" rather than "none".

You do not have to go looking for those. When Claude sets up or re-syncs your AI
phone assistant, it now reads your listings first and asks you about the gaps in
one short list — the HOA on each home, a year built it doesn't have, one story or
two. Answer what you know, and it writes those in; the rest stays "not on record"
and goes on your open-items list.

**What this asks of you:** nothing. If your phone assistant was connected before
your site was finished, ask Claude to re-sync it.

### `machinery` · Your assistant's example neighborhood is now one of yours

The part of your business summary that explains how your towns and neighborhoods
fit together used a fixed example: "A home in Garin Ranch is in Brentwood." That
came from the site this was first built for, so every other agent's assistant was
handed a neighborhood and a town they don't work in. The example now comes from
your own areas, and is left out if you have no neighborhoods listed.

**What this asks of you:** nothing. If your phone assistant is already connected,
re-syncing it replaces the old sentence.

### `machinery` · The update preview says what it actually asks of you

The preview used to say an update "may involve pages you have already written"
whenever it included a choice for you, even when no page was affected. It now
says separately which changes may flag pages and which ask you to decide
something.

### `machinery` · Undoing an update now actually undoes it

After applying an update, the updater told you to run `git checkout .` if you
didn't like it. That command leaves an applied update exactly where it is, so
anyone who followed it kept the update while believing they had removed it. It
now gives the command that really puts your site back, and Claude uses the same
one.

**What this asks of you:** nothing, unless you undid an earlier update that way.
If you did, ask Claude to check whether that update is still in place.

---

## 2026-09-11 — Setup can start with your listings, and remembers where it stopped

### `decision` · Start with your listings and phone assistant, if you like

Setup used to run one way: every question, then every page, then launch. Some
agents have listings now and want their AI phone assistant answering about them
this week, with the rest of the website to follow. Claude now asks where you want
to start.

Choose listings first and it gets the details that appear on every page right
(your name, brokerage, license number and phone), puts your listings up, and
connects your assistant. The rest of the site stays hidden from Google until you
are ready to carry on.

**What this asks of you:** nothing if your site is already set up. If it isn't,
one question the next time setup runs.

### `machinery` · Setup writes down where it stopped

Setup now keeps `content/SETUP-PROGRESS.md`: where you chose to start, what is
done, and what comes next. Stop halfway, come back a month later, or have someone
on your team pick it up, and Claude carries on from there instead of starting
again at the first question. It lives in `content/`, so it is yours and an engine
update never touches it.

### `machinery` · Before launch, your phone assistant can still read your listings

Until your site launches, it asks search engines and other crawlers to stay away,
so nobody finds a half-built site. If the crawler your AI phone assistant learns
from follows that request (GoHighLevel doesn't say whether it does), it was being
turned away too. The pages your assistant reads are now left open to it. They
still stay out of Google.

**What this asks of you:** nothing. If you set your assistant up before launching,
apply this update and ask Claude to re-sync it.

---

## 2026-09-11 — Team pages in your phone assistant are now your choice

### `decision` · One question when you set up your AI caller

When Claude sets up your AI phone assistant, it will now ask whether you want each
team member's own page in the assistant's knowledge too, so it can answer
questions about a specific person.

Either answer is right. The assistant already knows everyone's name, title and
licence from your business summary page, so saying no loses nothing essential.
Some agents want callers routed to a named person; others want every call to reach
them first. Your answer is remembered, and if someone leaves the team their page
comes out of the assistant straight away.

**What this asks of you:** one yes or no, the next time the AI caller is set up or
synced. Nothing changes until then.

### `machinery` · The updater points at the seed's new home

The seed moved to a new GitHub organization. The update command followed the old
address through a redirect; it now uses the new one directly.

---

## 2026-09-11 — The chat button becomes a soap bubble

### `machinery` · A new look for the chat button, and nothing to do

The chat button in the corner, and the orb that introduces it on a first visit to
your homepage, used to be a solid circle in your brand colour. It is now a nearly
clear soap bubble: a very thin dark outline, a rainbow shine along one edge where
the light catches it, and a small bright glint. Because it is almost transparent,
it matches any site, whatever its colours and photographs.

It also moves like a bubble. It floats up slowly on its first appearance, stretches
a little while it travels the way air pushes on a real bubble, wobbles when it
stops, and settles into a perfect circle. The greeting beside it is frosted glass.
Anyone whose device asks for reduced motion gets the bubble without the movement.

**What this asks of you:** nothing. If you have customised the chat widget or the
chat styles in `app/globals.css`, the updater will say so before replacing them.

---

## 2026-08-26 — Your AI phone assistant can finally answer "what do you have?"

### `decision` · A new setup step, and it needs two minutes in GoHighLevel

Your AI phone assistant does not read your website. It reads a separate copy of
what your site knows, and until now nobody was keeping that copy complete.

The failure this fixes is worth describing, because it is not obvious and it looked
fine from every angle. On a live agent's line, a caller asked what was available.
The assistant said it had nothing. She had thirty properties on her site, all of
them correctly loaded into the assistant's knowledge. Ask it about a specific
street and it answered perfectly. Ask it what it had, and it drew a blank.

The reason is that the assistant searches by resemblance. It finds text that looks
like your question. An address matches a page containing that address, so that
works. But "what do you have?" looks like nothing in particular, so nothing came
back, and it honestly reported having nothing.

**What changed:** your site now also publishes lists written the way people ask for
them. What is available in each town, in each price range, land versus houses, by
bedroom count, and by the features your properties actually have. Now there is
something for the question to match.

**What this asks of you:** one setup step, once. Claude needs a key from your
GoHighLevel account so it can build and maintain that knowledge for you. It is the
same key the contact form already uses, with one extra permission ticked. Ask
Claude to "set up my AI caller" and it will walk you through it.

**And a standing change:** from now on, every time you add, change or sell a
listing, Claude also updates what the assistant knows. Selling is the important
one. A sold home stays on your website as proof of your work, and comes straight
out of what the assistant offers, so nobody is ever told a closed house is for sale.

### `machinery` · The pages built for machines are now built properly

Two pages on your site exist only to be read by AI: one carrying everything about
your business, one carrying every listing in full.

Both were quietly broken. Because they used your normal page layout, the crawler
was reading the map in your footer first, and it stores that map's keyboard help
as text. On one agent's site, the first 504 characters of every page were "Move
left, Move right, Zoom in, Zoom out". On the shorter pages that was most of what
the assistant learned.

Those two pages now render as plain text with no layout at all. Nothing visible
changed for a human. What the machines read roughly tripled.

---

## 2026-08-24 — Your listings become readable by machines

### `content` · Every listing now needs its coordinates

An agent pointed her AI phone agent at her listings page and asked it about one of
her own properties. It said it did not have one. The page was fine: it was public,
it loaded, and the prices were right there on screen. But the hidden label that
describes the page to machines listed her company and every person on her team,
and not one house. The assistant learned the staff roster perfectly and never knew
the inventory existed.

Three things changed so that cannot happen again.

**Your listings page now describes every property, not just links to them.** An
outside assistant reads one page and gets the whole book. Before, it had to visit
each listing separately, which no CRM knowledge base is going to do.

**Each listing carries real map coordinates.** Not the address text, the actual
latitude and longitude. A text search for a rural address quietly drops the pin in
the middle of town, and nobody notices because a map still looks like a map.

**What this asks of you:** every listing you already have needs its coordinates
added. `npm run launch:check` now lists which ones by name. Claude can do it with
you in a couple of minutes: open each address in Google Maps and copy the numbers
out of the address bar. Your site keeps working in the meantime, and nothing about
it looks broken while you do it.

### `machinery` · Two new pages built for AI, and a map you can tap

**`/ai-brief`** is one page carrying everything true about your business: you, your
team and their licenses, every area you work, your services, and every listing in
full. It rewrites itself whenever your site changes. Point any assistant at that
one address and it is current.

**`/listings/details`** is the same idea for your listings alone.

Neither is meant for visitors. They exist so a phone agent, a chat assistant or a
CRM can read your business without you pasting anything into it by hand and
re-pasting it every time a price changes.

Also: the address under a listing map is now a link, so somebody who wants
directions can tap it instead of retyping it, and every listing has a way to
contact you pegged directly under the map rather than only at the bottom of the
page.

### `machinery` · Where a listing's shape is defined has moved

The definition of what a listing is now lives in the engine rather than beside your
data, so future improvements reach you through an update instead of needing you to
edit the file your listings live in. Your listings themselves have not moved and
are still yours alone.

---

## 2026-08-18 — Geographic branding, and two gate rules

### `content` · The page has to say what its URL promises

If a page's web address names a place, its main heading has to name the same
place. A page at `/areas/brentwood/selling-your-home` with a heading reading
"Selling Your Home in the Bay Area" now fails the gate.

**Why this exists:** a real site rebranded from one region to a wider one, and a
sensible-looking find-and-replace quietly rewrote the headings on the local pages
that were the entire reason the site ranked. The URLs still said Brentwood. The
headings no longer did.

**What it may ask of you:** if you have ever widened your service area, run
`npm run launch:check`. Anything it flags is a page whose heading and address
disagree. Fix the heading, or change the URL and add a redirect. Claude can do
either, but which one is right depends on whether that URL has traffic.

### `content` · Schema has to say what the page says

Structured data is the label Google and AI assistants read. It is invisible on
screen, so when it drifts away from your visible page nobody notices.

The gate now fails when a page's schema names a different place than its heading,
and when an FAQ appears in your schema but not in your visible text. The second
one is Google's own requirement for FAQ markup.

**Why this exists:** every specialty page on a live site was sending Google
"Downsizing in Brentwood" while the page itself said "Downsizing in the Bay
Area". The schema validator passed the whole time, because well-formed is not the
same as correct.

**What it may ask of you:** nothing, if your headings and schema already agree.
The gate will say so.

### `machinery` · The launch gate stopped crying wolf

Four checks were flagging correct content, which is worse than useless because it
trains you to skim past real problems.

- `todo` matched **Todos Santos Plaza**, a real place name, and failed 15 pages
- `n/a` matched any address like `/information/about`
- `fill in` matched ordinary writing such as "fill in disclosures"
- 41 spelling warnings for one BART station buried two genuine misspellings

Filler words now match whole words, and proper nouns are left alone.

### `machinery` · The area-slug check was barely running

It compared each area's URL to its name only when the two sat on adjacent lines
in your config. On most entries a photo field sits between them, so on a real
site it was checking 5 of 28 areas and silently skipping the rest.

### `decision` · A written rule for widening your service area

New: `.claude/rules/geographic-branding.md`. Worth reading once if your business
is growing, because expanding is exactly when a site quietly breaks.

The short version: a sentence about where **your business** works is branding and
can widen. A sentence about where **a town** is is a fact and stays. Your
keywords are never swept, because your pages still rank for them and you still
work there.

**The decision that is yours:** anything with a name attached — a lead magnet, a
guide, a downloadable PDF — is not renamed by a sweep, because the file, the
funnel and the email sequence outside this repo still carry the old name. Claude
will ask rather than rename.

---

## How to keep this up to date

```bash
npm run update:engine
```

That is a **preview**. It changes nothing. It tells you what is new, which
entries might affect your pages, and whether you have customised any engine file
that an update would overwrite.

When you are happy:

```bash
npm run update:engine -- --apply
```

Then `npm run gate` to see whether any new rule has flagged your existing
content. If you do not like the result, `git reset --hard && rm .engine-version`
puts everything back.

Ask Claude to do this for you. It is what the session-start check in `CLAUDE.md`
is for, and it will explain the conflicts rather than reading you a file list.
