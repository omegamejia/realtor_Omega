---
name: voice-agent
description: >-
  Make the agent's AI phone assistant actually know their listings. Builds and
  keeps current the GoHighLevel knowledge base that the voice caller and site
  chat answer from: the crawlable pages, one source per listing, and the
  question-shaped lists that let it answer "what do you have in [town]" or
  "anything under [price]". Also ships the assistant's system prompt. Use when
  someone says "set up my AI caller", "the voice agent doesn't know my
  listings", "connect my knowledge base", "my AI says it has no listings", or
  after any listing is added, changed, or sold.
# deep judgment: this is the agent's voice to the public, and wrong output is a
# licensed professional saying something untrue on a recorded line.
model: opus
---

# Voice Agent

The AI phone assistant answers from a **GoHighLevel knowledge base**. This skill
owns what goes into it, and the prompt the assistant runs on.

## The thing you must understand before doing any of this

**A knowledge base is a similarity search, not a database.** It finds passages
that *resemble* the caller's question. It cannot enumerate, count, or filter.

That single fact explains every failure this skill exists to prevent:

- Ask it about **an address** and it works, because the question resembles a page
  containing that address.
- Ask it **"what do you have?"** and it returns nothing, because no passage
  anywhere resembles that question. The assistant then reports, honestly, that it
  has no listings, while thirty of them sit in the knowledge base.

This happened on a real agent's live line. The caller asked what was available,
the assistant said it had nothing, and the caller said "I don't know why you're
lying to me." Nothing was broken. The inventory was fully indexed. No passage
matched the question.

**So the job is not "put the listings in." It is "make sure a passage exists that
looks like the answer to every question a caller actually asks."**

## What has to exist

| Source | What it is | Answers |
|---|---|---|
| `/ai-brief` | One page: the business, team with licences, areas, services, every listing | Background, who the agent is, general questions |
| `/listings/details` | Every listing in full, plain text | Detail across the whole book |
| One source per listing | `/listings/<slug>` | "Tell me about [address]" |
| **Question-shaped lists** | FAQ entries, question in, addresses out | **"What do you have in [town]?", "Anything under [price]?", "Any land?"** |
| *Team member pages (optional)* | `/team/<slug>` for each person, if the agent wants them | "Who is [name]?", "Can I talk to someone on the team about…" |

The first three are pages on their site and are crawled. The fourth is created
through the API and is the part that makes the assistant usable.

**Those four are required.** Any three of them produce the failure above. Team
pages are the agent's choice, covered in step 2: the team's names, titles,
licences and bios are already in `/ai-brief`, so leaving them out loses nothing
essential.

## Before you start

You need three things. Ask for them once, together:

1. **A Private Integration Token from their sub-account.** In GoHighLevel:
   **Settings → Private Integrations → Create new integration**, with the
   Knowledge Base scopes, read *and* write. It starts with `pit-`. It is shown
   once, at creation. It must be created inside *their* location; a token from
   the agency or another account returns `401 Invalid Private Integration token`.
2. **Their location ID.** In the URL when they are logged in:
   `app.<domain>.com/v2/location/<THIS>/...`
3. **Their site must be deployed**, because everything here is crawled from live
   URLs. A local dev server is not reachable. **It does not have to be launched.**
   Before launch the site asks crawlers to stay away, except from the pages this
   skill registers: `app/robots.ts` leaves `/ai-brief`, `/listings/` and, when
   `includeTeamPages` is on, `/team/` open. So an agent can have a working
   assistant while the rest of the site is still being written, and those pages
   still stay out of Google because they tell search engines not to list them.

Store the token as **`GHL_API_TOKEN`** the same way `ghl-integration` does, never
in a file that gets committed. The location ID is the same value lead capture
uses, so it goes in `site.config.ts` → `ghl.locationId` (it may already be
there). The knowledge base ID goes in `voiceAgent.knowledgeBaseId`.

**Never paste a token into chat, a commit, or a page.** If one has been exposed,
tell them to rotate it in Private Integrations before you continue.

## The API

Base: `https://services.leadconnectorhq.com`
Headers on every call: `Authorization: Bearer <token>` and `Version: 2021-07-28`

| Do this | Call |
|---|---|
| List knowledge bases | `GET /knowledge-base/?locationId=` |
| **Create one** | `POST /knowledge-base/` · `{locationId, name}` |
| Read one | `GET /knowledge-base/{id}?locationId=` |
| List crawled sources | `GET /knowledge-bases/crawler?locationId=&knowledgeBaseId=` |
| **Add a page** | `POST /knowledge-bases/crawler` · `{locationId, knowledgeBaseId, url, option}` |
| Crawl status | `GET /knowledge-bases/crawler/status?locationId=&knowledgeBaseId=` |
| **Remove pages** | `DELETE /knowledge-bases/crawler` · `{locationId, knowledgeBaseId, urlIds[]}` |
| List FAQs | `GET /knowledge-bases/faqs?locationId=&knowledgeBaseId=` |
| **Create an FAQ** | `POST /knowledge-bases/faqs` · `{locationId, knowledgeBaseId, question, answer}` |

`option` is `Exact`, `Path` or `Domain`. **Use `Exact`.** It crawls the one page
and ingests it in a single call, so nothing else needs calling afterwards.

**Verified quirks, so you do not waste an hour on them:**

- **You can create the knowledge base yourself.** The agent does not need to make
  a shell first. The limit is **15 knowledge bases per location**; past that,
  creation returns a clear 400 and they must delete one.
- **The list endpoints return at most 10 items** no matter what paging you pass.
  `count` is accurate, the array is not. **Never treat that array as the complete
  set** — work from the site's own listing data instead.
- Requests from some HTTP clients get a Cloudflare `403 error code: 1010` on
  user-agent. If that appears, the call is fine and the client is not.
- A `403 "LocationId is missing in body"` on a write means the route exists and
  your body is wrong, not that you lack permission.

## Step 1 — Find or create the knowledge base

List them. If one already covers listings, use it and record its ID. If not,
create one named for what it holds, and record the ID in `site.config.ts`.

Tell them plainly which one you are using. An agent with several knowledge bases
will not know which their caller reads from, and putting listings in the wrong
one is silent.

## Step 2 — Register the pages

Add, one `Exact` call each:

- `/ai-brief`
- `/listings/details`
- `/listings/<slug>` for **every listing that is not sold**

Poll the status endpoint until they report `Successful`. Space the calls a few
seconds apart.

**Then ask about team pages, once.** Something like:

> "Your team members each have their own page on your site. Do you want your phone
> assistant to have those too, so it can answer questions about a specific person?
> It already knows everyone's name, title and licence either way."

Both answers are fine, and it is genuinely theirs to make: some agents want callers
routed to a named person, others would rather every call reach them first, and a
team that changes often means more upkeep. **Record the answer as
`voiceAgent.includeTeamPages` in `site.config.ts`** so later syncs follow it
without asking again. If yes, add `/team/<slug>` for every **current** team member,
one `Exact` call each. Never add a page for someone who has left.

**Only ever manage sources you added.** If the knowledge base already contains
team pages, area pages, or anything a human put there, leave them alone. Never
delete something you did not create.

## Step 2b — Read the listings, then ask about the gaps

**Do this before writing any list.** Step 3 builds the lists out of these fields,
so a gap here is a gap the caller hears — and this is the moment the agent is
already thinking about their inventory, which they will not be again for weeks.

Read every listing in `content/listings.ts` and collect what is missing. The
fields worth asking about, in the order callers ask:

| Missing | Why it matters on a call |
|---|---|
| `hoa` | "Is there an HOA?" is a top-three question. Absent means the assistant says it will confirm; `hoa: false` is a real answer and unlocks the "no HOA" list |
| `yearBuilt`, `stories` | Asked constantly, and `stories` decides the single-story list |
| `taxes`, `schools` | Asked on nearly every family call |
| `showing` | "Can I see it this evening?" |
| `lotSqft`, `garage` | Small, and each one makes a listing answerable |

**Ask them as one short list, not one question per field.** This is the exception
to asking one thing at a time: the agent is reviewing their own properties and
every answer is a word or a number, so a batch reads as a checklist rather than an
interview.

> "Before I write these — a few quick ones about the two homes. Does either have
> an HOA, and if not, can I mark them as definitely having none? Do you know the
> year 2 Test Elm Ct was built, and whether it's one story or two?"

Then:

- **Write only what they confirm**, following `listings-manager`: real details, or
  `hoa: false` for a confirmed none. "I think so" is not a value.
- **Leave the rest out** and add each to `content/OPEN-ITEMS.md`.
- **Ask once.** If they will check later, build the lists without those categories
  and carry on; the next `listings-routine` run raises it again.

## Step 3 — Build the question-shaped lists

**This is the step that makes it work, and it is the step you cannot do
generically.** The categories come from *their* listings, not from a template.

**Read every listing in `content/listings.ts` and work out what is actually
there.** Then create one FAQ per category that genuinely exists.

Always derive these from the data:

- **Every town** that has at least one listing. Not the service-area list — the
  towns the listings are actually in, which is usually fewer.
- **Price bands** that suit their range. An agent whose listings run $40k to
  $1.4m needs different bands from one working a single price point. Pick bands
  that each hold something.
- **Property type** — homes with bedrooms, versus land, lots and acreage.
- **Bedroom counts** that exist. If nothing has six bedrooms, do not write that
  entry.

Then read the descriptions and find the **features that recur**. Do not guess
from a list; look at what these particular properties actually mention. Basements,
shops and outbuildings, mountain views, river or creek frontage, acreage, horse
or livestock setups, off-grid or well-and-septic, commercial zoning, multi-family
or duplex potential, build-ready lots with utilities at the line, investment
potential. **Only create an entry when at least one listing genuinely matches.**

**Word the question the way a caller says it**, with the variations they use:

> `Do you have anything with a shop, barn, or outbuilding?`
> `What listings do you have in [town]? What homes are for sale in [town]?`

**The answer is the addresses**, each with town, price, key specs and status, and
a closing line telling the assistant it can get full detail per property:

> `There are 4 available properties in [town] right now:`
> `- [address], [town] — [price] — 5 bd · 4 ba · 2,784 sqft — Active`
> `…`
> `Ask about any of these by street name for full detail.`

**Exclude sold listings from every list.** A caller offered a sold house is the
worst outcome this skill can produce.

**Check your own categories before writing them.** A property with bathrooms and
square footage is not a vacant lot, whatever its bedroom count says. A house
described as "new construction" is not a build-ready lot. Miscategorising is
worse than omitting, because the assistant states it with confidence.

## Step 4 — Install the assistant's prompt

The system prompt lives at **`.claude/skills/voice-agent/voice-agent-prompt.md`**
in this repo. Give them the whole thing to paste into their agent's prompt field.

**Save your edited copy, and the question lists, inside the site:**
`content/voice-agent/prompt.md` and `content/voice-agent/faqs.md`. Never a
temporary or scratch folder. In testing, a session blocked on the token drafted
both and saved them to its own scratchpad, which the agent could not find and the
next session never saw, so the work was lost. `content/` belongs to the agent and
an engine update never touches it. Rewrite both files at every sync, so they
always match what is actually in GoHighLevel.

Two things about it that matter and will be undone by accident if nobody says so:

**It contains no addresses, street names, or towns.** Every example is a bracketed
slot. This is not tidiness. An earlier version used realistic example streets to
illustrate a point, and the assistant read them out to a caller as though they
were real inventory, in a town they were not in. **Never put a real or realistic
place name in that prompt.**

**It contains a lookup table** naming the exact question text to search for each
kind of ask, and **you must edit it to match what you actually built in step 3.**

The template ships with the categories that are common across agents. **Delete
every row you did not create an FAQ for.** An agent with no horse property, no
commercial zoning and no river frontage should not have those rows: the assistant
would search for lists that do not exist, and a prompt that promises an answer it
cannot produce is precisely what makes an assistant start inventing.

**Add rows for anything you found that the template does not cover.** If half their
book is condos, or ski access, or historic district, that belongs in the table.

The rule is one row per FAQ, no row without one.

## Step 5 — Test it before saying it works

In their knowledge base, use **Test retrieval** and try:

- an address from their listings
- `What listings do you have in [town]?`
- `Do you have anything under [price]?`

If the address works and the town does not, the FAQs did not land. If nothing
works, the pages are not trained.

**If nothing works on a site that has not launched yet**, open
`<their site>/robots.txt`. It should list `Allow: /ai-brief` and
`Allow: /listings/`. If it only says `Disallow: /`, the site is on an older
engine that turned crawlers away before launch: apply the engine update, deploy,
then remove the pages from the knowledge base and add them again.

Then have them call the line and ask the questions a real caller asks: what have
you got, what's in [town], tell me about [address]. **Listen for the assistant
naming a street that is not theirs** — that means it is inventing, and the prompt
or the sources need fixing before it takes another call.

## When they have no site of ours — the knowledge-base-only route

**Never offer this first, and never mention it while a site is still on the
table.** Everyone should have their own site: it is the thing that gets found, it
captures the lead, and it keeps the assistant current by itself. This route exists
for the agent who has already said no — they have a site they are keeping
(WordPress, a brokerage page, a platform they pay for), or they want the phone
assistant and nothing else. When they ask, the answer is yes, and this is how.

**Say the trade before you agree to it, not after.** In testing, a session
answered "that's a supported route, I'll set it up that way" and only then
listed what the agent was giving up. Nothing was hidden, but the decision had
already been made for them. Put the four lines below first, end with *"still
want to go that way?"*, and take their yes. Then commit to the route and **stop
raising it** — one honest paragraph is the whole of the case, and anything more
is pestering someone who has already decided.

| With pages | Knowledge-base only |
|---|---|
| A re-crawl picks up a price change | Every change is pushed by hand, by Claude |
| The assistant can send a caller a link | Nothing to link to |
| The listings are also findable by Google and AI search | The knowledge base is private to the assistant |
| Costs hosting (about $20/month) | No hosting, no domain, nothing to deploy |

### What still applies

They still clone this repo, and `content/listings.ts` is still the source of
truth — this is the same data, published to one place instead of two. They still
need the Private Integration Token with Knowledge Base scopes and the location ID.
They do **not** need GitHub Pages, Vercel, a domain, or a deploy, and
`launchReady` stays `false` forever, which is correct: nothing is being launched.

### What goes in, instead of pages

Everything becomes an FAQ entry (`POST /knowledge-bases/faqs`), because a crawler
source needs a URL and there is no URL. Three kinds:

1. **One background entry.** Question: *"Who is [agent]? Tell me about the
   business. Who am I speaking to?"* Answer: the business, the team with licences,
   the areas and the services — the content of `/ai-brief` above the listings.
   **It must name the agent, the brokerage and the licence number**, because that
   is what the assistant says when a caller asks who they are dealing with.
2. **One entry per listing that is not sold.** Question in the words callers use:
   *"Tell me about [address]. What can you tell me about [street name]?"* Answer:
   that listing's full detail — the same text `listingBrief()` renders.
3. **The question-shaped lists from Step 3, unchanged.** These matter more here,
   not less: they are now the only thing that answers "what have you got?"

**Getting the text without deploying anything.** Run `npm run dev` on their
machine and read `http://localhost:3000/ai-brief` and
`http://localhost:3000/listings/details`. A local server is fine because *you* are
reading it, not GoHighLevel. **Say what you are doing before you do it**, because
an agent told "no website" who then sees you start one will reasonably think
something is contradicting itself: *"I'll start a preview on your own computer for
a minute to read the text off it — nobody on the internet can see it, and I shut
it down straight after."* That text already has every unfilled placeholder
stripped out and every unknown field marked "not on record", which is exactly what
should reach a caller.

**Record what you pushed** in `content/voice-agent/kb-entries.md`: one row per
entry with the listing slug, the question text, and the FAQ id the API returned.
The list endpoints return at most 10 items whatever paging you pass, so without
this file you cannot reliably find a sold listing's entry to delete later. That
file is the index; treat losing it as losing the ability to keep the assistant
honest.

**Length is untested.** Nobody here has hit GoHighLevel's limit on an FAQ answer.
If a long listing is rejected, split it into two entries — "the basics" (price,
beds, baths, size, status) and "the details" (HOA, taxes, schools, showings) —
and say in the prompt's lookup table that both exist.

**Check the prompt before handing it over.** Remove anything that offers to send a
link or points a caller at a page, because there are no pages. Everything else in
Step 4 is unchanged.

### Keeping it true here takes more discipline

Nothing refreshes on its own. A price change, a pending, a sale: each one is a
delete and a re-create by Claude, and until that happens the assistant is wrong on
a recorded line. Tell them that in those words, and set the `listings-routine`
cadence at setup rather than leaving it to memory.

**If they later want the real site**, nothing is wasted: the listings are already
in the repo. Set the site up, register the pages as crawler sources, then delete
the per-listing FAQ entries so the two cannot disagree.

## Keeping it true — this is not a one-time setup

**Every list you created is a snapshot, and a stale list is worse than none**,
because the assistant states it confidently.

| When this happens | Do this |
|---|---|
| A listing is added | Add its page, rebuild every list it belongs to |
| Price or details change | Remove and re-add its page so it re-crawls, rebuild the lists |
| It goes pending or takes backups | Keep it, re-add so the status is current |
| **It sells** | **Remove its page and take it out of every list, immediately** |
| A listing is withdrawn | Same as sold |
| Someone joins the team (if `includeTeamPages` is on) | Add their `/team/<slug>` page |
| **Someone leaves the team** | **Remove their page immediately**, even if the agent chose no team pages later |

`listings-manager` calls this skill after every change. `listings-routine` checks
it on the recurring pass. Neither is optional: the assistant is the agent's voice
on a recorded line, and it is a licensed professional who answers for what it
said.

## Hard rules

- **Never invent a listing, a price, a feature, or a category.** Everything comes
  from `content/listings.ts`.
- **Never include a sold property in a list.**
- **Never delete a source you did not add.**
- **Never put a place name in the assistant prompt.**
- **Never paste a token anywhere it persists.**
- **Never tell the agent it works until you have tested retrieval.**
