---
name: realtor-site-setup
description: >-
  Set up a new real estate agent's website from this seed — orient them, discover
  and harvest what they already have (existing site, files, photos, old blog posts),
  interview to fill the gaps, wire accounts + GHL + voice, spin up the site, import
  their existing content, and hand off to the ongoing content engine. Use when
  someone says "set up my site", "onboard me", "build my real estate website",
  "fill in my site", or is starting from a fresh clone of this repo.
---

# Realtor Site Setup

You are setting up ONE agent's site from this seed. Your job: turn the placeholder
`site.config.ts` into that agent's real, confirmed information — and never invent
anything.

Most agents are **not starting from zero.** They usually have an old site, a
brokerage bio, a Zillow profile, photos on their laptop, and a folder of blog
posts. **Harvest first, interrogate second.** Asking someone to retype what
already exists is how onboarding dies.

## The one rule that matters most

**Only write data the agent has confirmed is real.** You cannot know an agent's
license number, address, or phone. Ask (or harvest), then echo it back for
confirmation before writing. A realistic-but-wrong value is worse than a blank.
Never fabricate reviews, stats, awards, or credentials.

Harvested data is a **candidate, never a truth.** Anything pulled from a website,
a document, or a profile is a proposal the agent must confirm before it lands in
config.

---

## Phase 0 — Orientation (the first thing they see)

On a fresh clone (`launchReady: false` + `[BRACKETS]` in config), **you open the
conversation.** Don't wait to be asked. Say something like:

> "Hi — this is your new website, ready to be made yours. Right now it's a working
> site full of placeholders.
>
> Here's how this goes: I'll ask about your business, and wherever you've already
> got something — an existing site, photos, old blog posts — I'll pull from that
> instead of making you retype it. Then I'll build the site and we'll put it live
> on your domain.
>
> Handy if you have them: your license number, office address, and a link to any
> site or profile you already have. You can stop and pick this back up any time,
> and nothing goes live until you've confirmed every detail is right.
>
> First question — **have you already set up Krista's Agent-OS?**"

**Ask ONE question and stop.** Do not stack questions in the opener. A beginner
answers the last one they heard and the rest quietly vanish. Wait for the Agent-OS
answer, *then* ask about their website.

**On timing — branch it, don't guess.** Once you know whether they have an existing
site and content, give a real estimate:

- Starting from scratch → *"about 20–30 minutes of questions."*
- Existing site, old blog posts, photos to pull in → *"closer to an hour, because
  I'm pulling in what you already have instead of making you retype it. That time
  saves you far more later."*

Never under-promise and overrun; it makes everything after it feel worse.

Then set two expectations, plainly and early. **Both matter — say them out loud:**

> "Two things so you know what to expect.
>
> **First: this first build gets us to about 70%, not 100% — on purpose.** I'd
> rather put something real in front of you and have you react to it than guess for
> hours and get it wrong. The first version will be good, not finished.
>
> **Second: after that, I'm your whole team.** Designer, developer, copywriter,
> editor, assistant — all of it. We go back and forth until it's exactly right, and
> then I keep it going: new pages, new listings, blog posts, funnels, updates. This
> isn't a one-time build you're stuck with. It's the start of something we keep
> improving."

And once: **you will never invent anything.** If they don't know something, it
stays blank rather than guessed.

## Phase 1 — Discovery (before any interview questions)

Ask these first. They determine how much work everything else is.

0. **"Have you set up Krista's Agent-OS?"** Ask this FIRST. Most agents coming to
   this site have already been through her onboarding, which means a lot of what
   we'd otherwise interview for is **already written down**. If yes, get the folder
   path and harvest it (Phase 2a) before asking anything redundant.
1. **"Do you already have a website?"** Get the URL. Also ask about anything else
   representing them online: brokerage bio page, Zillow/Realtor.com profile, an old
   or separate blog, a Google Business Profile, social profiles.
2. **"How accurate is it?"** Give them easy options — *all current / mostly right
   with some stale bits / pretty out of date / honestly embarrassing.* Their answer
   sets how much you trust the scrape (Phase 2).
3. **"What's out of date on it?"** Specifics — moved brokerages, new license, old
   phone, areas they no longer serve, team members who left.
4. **What tools are they already using?** IDX/MLS provider, CRM (GoHighLevel or
   other), email platform, scheduling, analytics, existing domain + registrar,
   existing blog host. **The site has to fit their stack, not replace it** — note
   every one and which we integrate with vs. leave alone.
5. **Design & brand.** Ask both halves — most agents can answer the first and
   struggle with the second, which is exactly why the second matters:
   - **"Do you already have brand colors?"** Hex codes, a brand/style guide, a logo
     with set colors, brokerage brand requirements they must follow. If they have
     them, they go straight into `site.config.ts` → `brand.primaryColor` /
     `accentColor` and re-theme the entire site (see Phase 5e).
   - **"Show me 2–3 sites whose look you like."** Any industry — not just real
     estate. Then, for each: **"What specifically do you like about it?"** Push past
     "it's clean" — is it the whitespace, the big type, the photography, the calm
     palette, the boldness? Harvest them in Phase 2f.
6. **Source of truth.** Ask directly:

   > "When two places disagree — say your old site says one thing and your
   > brokerage bio says another — which should I believe?"

   Default hierarchy unless they say otherwise (write down what they choose):

   > **their live confirmation > license/brokerage record > their CRM > current
   > website > third-party profiles (Zillow etc.) > social bios**

   Record the ranking; use it to resolve every later conflict, and when two sources
   still disagree, **ask** rather than pick.

## Phase 2 — Harvest (pull, don't interrogate)

### 2a. Their Agent-OS (check this FIRST — richest source)

If they've done Krista's onboarding, most of the brand work is already done. **Do
not re-ask what's already written there.** Find the vault (ask for the path; it's
commonly `~/Agent-OS`, `~/projects/…/Agent-OS`, or inside their Obsidian vault),
then read `11-Brand-System/`:

| Agent-OS file | Feeds |
|---|---|
| `00-Credentials.md` | license #, brokerage, credentials → `site.config.ts` |
| `02-Ideal-Client.md` | `brand-voice.md` §1 Ideal Dream Client |
| `02b-Ideal-Client-VOC.md` | §2 VOC — their clients' **verbatim** phrases |
| `07-Voice-Rules.md` | §4 Voice DNA, banned words/structures |
| `01-Brand-Brain.md`, `08-Manifest.md` | §3 authority stand |
| `03-Offers.md` | services/niches, funnel offers |
| `04-Content-Pillars.md` | blog + AEO/GEO article topics |
| `05-Funnel-Map.md`, `06-Funnel-Execution-Engine.md` | `funnel-builder` inputs |
| `09-Local-Market-Authority.md` | areas served + local authority signals (**AEO gold**) |
| `10-Team-and-Handoffs.md` | team members |
| `Copywriter-Brain.md` | the real knowledge base for `copywriter` / `hooks` |

Also worth a look: `01-Sphere-and-Past-Clients` (testimonials — only with explicit
permission), `04-Listings`, and `07-Marketing` (existing content and past posts).

**Rules for reading their vault:**

- **Never read `14-Confidential/`.** It exists, it's theirs, it's off-limits.
- **Check completeness, not just presence.** These ship as templates — scan for
  unfilled placeholders. A half-filled Brand System is worse than none if you treat
  it as done. Say which files were complete and which were skeletons.
- **Check freshness.** Look at file dates and ask *"when did you last update this?"*
  Old material **drives** the interview; it doesn't win it.
- **It's a starting point, not the Bible.** Use it to turn open questions into
  confirmations: *"Your Brand System says your ideal client is X and you serve
  Y and Z — still true?"* That's a far better conversation than asking cold. If
  something conflicts with the site or with what they say now, apply the
  source-of-truth ranking from Phase 1 and **ask**.
- **Don't write back into their vault** unless they explicitly ask you to.

**What Agent-OS does NOT have** — still interview for these: office lat/lng, area
lat/lng, IDX embed, GHL location ID, domain/registrar, GitHub/Vercel accounts,
Google Maps embed, and current review counts.

**Then snapshot it.** Write the brand material into `content/brand-voice.md` with a
note of the source path and the date it was pulled, so the repo stays
self-contained (it has to build and deploy without the vault). Agent-OS remains
the source of truth for brand; `brand-voice.md` is a dated derivative you refresh
when they update the OS.

If they don't have Agent-OS — or the Brand System is mostly empty — run
`content-engine-builder` (Phase 5d) to create the voice material from scratch.

### 2b. Their existing site

If they have one and it's worth trusting, fetch it and extract **candidates**:
name, title, license #, phone, email, office address, brokerage, bio, areas
served, services/niches, team members, testimonials, social links.

- Present them back grouped, as a confirm-or-correct list — never write silently.
- Mark anything they flagged stale in Phase 1 as **suspect**, and ask about those
  explicitly rather than defaulting to the scraped value.
- Testimonials are real people's words: only reuse with the agent's confirmation
  that they're genuine and permitted.
- If the old site will be **replaced on the same domain**, note every URL now —
  `domain-setup` needs them for the 301 map later.

### 2c. Their files (this is where the good stuff is)

Ask plainly, and give them a way to hand things over:

> "Anything already written about you? A bio, an About page, a brochure, a
> listing presentation, past blog posts, a brand or style guide? You can drop the
> files here, or just tell me the folder — Desktop, Documents, Google Drive,
> Dropbox — and I'll go look."

Accept a path or a drop. Read what's there and pull candidates from it the same
way — proposals, confirmed before use. If they mention a resource you can't
reach, ask them to export or drop it rather than guessing at its contents.

### 2d. Images

Walk the list explicitly — agents forget what they have:

- **Headshot** (required — the site has a visible empty slot without it)
- **Logo**
- **Team photos** (one per team member)
- **Office / brand photos**
- **Listing photos** they own
- **Local/neighborhood photos** — their own shots of the areas they serve

Take a folder path and go looking. Hand off placement to **`image-manager`** (it
owns copying into `public/images/`, sizing, and wiring paths). For anything they
don't have, follow the image-sourcing rules in `image-manager` — **their own
photos first**, then properly-licensed free stock, and never present a generic or
AI-made image as a real photo of a specific local place.

### 2e. Existing blog posts

Many agents have posts sitting in files even when the blog isn't attached to their
site. **Prefer their files over scraping** — it's faster, higher fidelity, and
avoids re-typing.

Ask: *"Do you have past blog posts? Even in a folder of Word docs or a WordPress
export — I can bring them over."* Handle `.docx`, Google Docs exports, WordPress
XML (WXR), Markdown, plain text, and PDF; scrape the live blog only as a fallback
when there's no local copy.

Hand the actual import to the **`content-import`** skill (Phase 7). Here, just
find out **what exists and where**.

### 2f. Design references (what they like, and *why*)

Take the reference sites from Phase 1 and actually look at them. Agents are usually
better at pointing than describing — your job is to turn "I like this one" into
specific, buildable direction.

For each reference, pull and note:

- **Color** — the real palette: dominant, accent, background, text. How much color
  vs. how much neutral. (Read computed styles; don't eyeball from a screenshot.)
- **Typography** — serif or sans for headlines, the size jump between headline and
  body, weight and letter-spacing.
- **Space & density** — generous whitespace vs. packed. Section rhythm.
- **Imagery** — big hero photography, people vs. property, illustration, or none.
- **The hero** — what's actually in it, and what the single action is.
- **Motion** — subtle, heavy, or none.

Then reflect it back and confirm: *"Across the three you picked, the common thread
is lots of whitespace, one strong accent color, and big serif headlines — is that
what's pulling you?"* Getting this agreement now prevents the endless-revision loop
later.

**Two hard limits:**

- **Take direction, not designs.** We extract *principles* — palette weight, type
  scale, spacing, hierarchy — never clone a site's layout or copy its assets. If
  the reference is a competing agent in their own market, cloning it is both a bad
  look and a legal risk. Say so plainly if they ask for a copy.
- **Everything lands in the token system.** Colors go to `site.config.ts` →
  `brand.*`; type/spacing/treatment go through the shared tokens and components
  owned by `site-design-system` (`.display-h1`, `.hl-accent`, `<PageHero>`,
  `--brand-cta`…). **Never hand-style one page to match a reference** — that's how
  a site stops being changeable in one place. Use the `frontend-design` plugin with
  `site-design-system` for the visual direction work.

## Phase 3 — Interview (fill only the gaps)

Now ask about what harvesting didn't answer. Conversational, a few at a time, in
plain language — not a form. Confirm as you go.

- **Agent / team:** per person — full name, title, whether a real REALTOR® (NAR
  member), license #, phone, email, headshot, 2–3 sentence bio. Mark one `lead: true`.
- **Business:** business name, legal name/LLC, brokerage, tagline, price range,
  founding year (if known).
- **Location:** city, state, full office address, and office lat/lng
  (Google Maps → right-click → copy coords).
- **Areas served:** every neighborhood/city with its real name + city-center lat/lng.
- **Services (niches): FIVE SPECIALTIES MINIMUM.** Most agents go blank when asked
  what they specialise in, so **do not ask an open question and wait.** Offer real
  options in plain language and let them react. Something like:

  > "Beyond plain buying and selling, what do you actually get called about? Most
  > agents have five or six of these without thinking of them as specialties:
  >
  > - first-time home buyers
  > - VA and military buyers
  > - trading up out of a starter home
  > - downsizing, empty nesters, moving to less house
  > - selling a house after a divorce
  > - selling a house someone inherited, probate or trust
  > - investors and rental property
  > - people relocating in from out of the area
  > - new construction
  > - higher-end or luxury homes
  >
  > Which of those have you actually done? And is there something you get called
  > about that is not on this list?"

  Recognition beats recall. They will pick five off that list in thirty seconds and
  struggle for ten minutes with "what are your specialties?"

  **Original wording of this requirement:** Plain "buying" and "selling"
  are table stakes and rank for nothing. Ask what they actually specialise in and
  get to **at least five** beyond the generic two. Prompt them with real options:
  first-time buyers, downsizing, divorce sales, probate and trust, investment
  property, relocation, luxury, new construction, military/VA, multigenerational,
  land, move-up buyers. See `content-model.md` for the full list and why this
  matters. **Never invent a specialty they do not serve** — ask, and if they only
  genuinely do three, write three and say plainly that five is the target.
- **Socials:** only real, live URLs.
- **Reviews:** ONLY a real aggregate rating + count from a real source. Otherwise
  blank — never guess.

**Echo back everything** ("Confirm your license is X") and only then write to
`site.config.ts`. Update each area's `lat`/`lng`.

## Phase 4 — Accounts & connections (runs in parallel)

Start this early and let it run alongside Phases 1–3 — it's the slowest part and
it only truly blocks **deploy**, not setup.

**Assume they have never heard of any of this.** Explain before you ask. Something
close to this, in your own words:

> "Two accounts, and then you're done with the technical part forever.
>
> Think of your website like a shop. **GitHub** is the filing cabinet in the back
> where every version of your blueprints is kept — nothing ever gets lost, and if
> we change something and you hate it, we can put it back exactly how it was.
>
> **Vercel** is the actual shop with the lights on and the door unlocked. It takes
> those blueprints and runs your real website 24/7 so customers can walk in. Without
> it, the plans exist but there's no building.
>
> They're separate companies and the accounts are **yours**, not mine and not
> KMC's — so nobody can hold your website hostage. I'll never ask for your
> password. Every place I say 'authorize', it just means: click the link, log in if
> it asks, and press the button that says Allow. That's the whole thing."

Then walk them through, one step at a time, waiting after each:

1. **GitHub account** (free) at github.com. Just a sign-up, like any website —
   nothing to install and nothing to learn.
2. **Vercel account, Pro plan** at vercel.com. Say the cost plainly: it's about
   $20/month and they pay it directly. Explain *why* — the free version isn't
   allowed to be used for a business, and this is their business.
3. **Their own copy of the site.** KMC gives them access; they click **"Use this
   template" → Create a new repository.** Tell them what that means: "this makes
   your own private copy of the website files, separate from everyone else's."
4. **Connect the two** (Vercel → Add New → Project → pick their repo). Explain the
   payoff: "from now on, when I change something, your live site updates by itself.
   You never have to upload anything." Warn them the first version will look like a
   template full of blanks — that's expected, not broken.
5. **Authorize Claude** for GitHub and Vercel so changes can be made and published
   for them.
6. **Confirm out loud** that you can see their repo and their Vercel project before
   moving on, so they know it actually worked.

If they get stuck, do it live on a screen share. **This is the single biggest place
people give up** — over-explain rather than under-explain, and never say "just."

### 4a. Plugins — one click, explained first

`.claude/settings.json` lists a few plugins this project expects. On a fresh clone
Claude Code will ask whether to install them. Beginners will not know what that
prompt is, so get ahead of it:

> "You'll see a message asking to install a few plugins. Plugins are like apps on
> your phone — Claude can do plenty on its own, and each plugin adds one extra
> skill. These are the design and publishing ones this website needs. It's safe,
> it's a one-time thing, and you can say yes."

Then confirm they said yes and that it worked. If the prompt didn't appear, tell
them the exact command to run rather than describing where to click.

The student owns everything — their GitHub, Vercel, domain, auth. You never create
accounts or enter their credentials.

1. **GitHub account** (free), if they don't have one.
2. **Vercel account, Pro plan** — Pro is required (free tier is non-commercial;
   this is a business site). They set it up and pay it.
3. **Their own copy of the site** — KMC grants template access; they click
   **"Use this template" → Create a new repository** so they own their repo.
4. **Import the repo into Vercel** (Add New → Project). First deploy shows
   placeholders — expected.
5. **Authorize Claude** for GitHub + Vercel (OAuth in their environment; their
   tokens stay theirs).
6. **Confirm out loud** you can see their repo and Vercel project before moving on.

If they're non-technical, do this live. It's the biggest friction point in the
whole process — over-explain rather than under-explain.

## Phase 5 — Wire the integrations

### 5a. Map

Set `location.googleMapsEmbedUrl` for the office address:
`https://www.google.com/maps?q=<url-encoded address>&output=embed`

### 5b. GoHighLevel — run the `ghl-integration` skill

Explain what this actually does first:

> "Right now, when someone fills in your contact form, that message has nowhere to
> go. GoHighLevel is your contact book and follow-up system. Connecting it means
> every person who fills in a form on your site lands in there automatically, so
> you can follow up instead of losing them. Your website is the front door;
> GoHighLevel is where their name gets written down."

GHL is API-only lead capture (the site is never hosted in GHL). That skill owns the
whole pipe: Private Integration Token (Contacts + Custom Fields scopes) in Doppler
as `GHL_API_TOKEN`, `locationId` in `site.config.ts`, the hand-made custom-field
**folder** + marker field, and a **connection test** (test contact in, read back,
fields + tag asserted, test contact deleted). Do this even before any funnels
exist — the contact form uses the same pipe.

If they use a **different CRM**, don't force GHL. Capture the lead the same way and
note the integration gap plainly rather than pretending it's wired.

### 5c. Chat assistant (the agent's OWN Claude API key)

The chat bubble on the site answers visitor questions using your real content.
Explain it before asking for anything:

> "The little chat bubble on your site answers questions from real visitors, using
> what's actually on your pages. To do that it needs its own key — think of it like
> a company card with your name on it. It's yours, you're billed for what it uses,
> and you can cancel it any time. I'll never see it or use it for anything else."

Steps:

1. They create a key at console.anthropic.com (their key, their billing).
2. Set `ANTHROPIC_API_KEY` as an env var — `.env.local` locally, a Vercel env var
   in production.
3. **Never** hardcode a key or use a shared/agency key.
4. Verify `GET /api/chat` returns `{ "configured": true, … }`, then ask the widget
   a real question and confirm it answers from the site.

### 5d. Voice — from Agent-OS if it exists, else `content-engine-builder`

**Check Phase 2a first.** If their Agent-OS Brand System is filled in, the voice
work is already done — snapshot it into `content/brand-voice.md` and use this step
only to **confirm and fill gaps**, not to re-run the whole exercise. Re-interviewing
someone for answers they already gave Krista is exactly the redundancy to avoid.

Run Krista's `content-engine-builder` in full only when there's **no Agent-OS, or
the Brand System is a skeleton**. Either way `content/brand-voice.md` ends up with:
Ideal Dream Client, VOC phrases in their clients' real words, authority stand,
voice DNA, banned words, hook menu — plus the source path and pull date.

`copywriter`, `hooks`, `krista-aeo-geo-writer`, and `realtor-content-writer` all
read it. Skip it and every page sounds generic — because the only alternative is
guessing at their voice, which this repo forbids. See
`.claude/skills/_KRISTA-SKILLS-HOUSE-RULES.md`.

### 5e. Design — colors and direction into the token system

- **Brand colors** from Phase 1 → `site.config.ts` → `brand.primaryColor` /
  `accentColor`. That's the only place they belong: those two values flow into
  `--brand`, `--accent`, `--brand-cta`, `--brand-ink`, the footer, and every
  component. Change them once, the whole site re-themes.
- **Design direction** from Phase 2f → apply through `site-design-system` (with the
  `frontend-design` plugin), in the shared tokens and components only. If they want
  a different headline treatment, it changes in `.display-h1` / `.hl-accent` /
  `<PageHero>` — never on one page.
- If they have **no** brand colors, don't stall: the seed's navy/gold is a working
  default. Say plainly it's a placeholder they can change any time in one place.

### 5f. IDX / MLS search

Explain the point of it:

> "IDX is the live list of every home for sale in your area. Your own listings are
> already on your site. Adding IDX means someone can search *every* home from your
> website instead of going to Zillow — which keeps them with you."

If they have an IDX provider (IDX Broker, iHomefinder, Showcase IDX, Realtyna,
their MLS's own widget), paste the embed URL into `site.config.ts` → `idx.embedUrl`.
The provider handles MLS compliance.

**Order on `/listings` is deliberate and must not be flipped: the agent's OWN
listings render first, the full MLS/IDX search sits below them.** Their listings
are why a visitor is on that page; the IDX feed is the catch-all for everything
else. Leave `idx.embedUrl` blank and the IDX block simply doesn't render.

Their own listings are managed with `listings-manager` (manual, agent-controlled) —
that's separate from the IDX feed, and both can coexist on the page.

## Phase 6 — Spin up the site

```bash
npm install
npm run build
npm run dev            # then, in another shell, against http://localhost:3000:
npm run validate:schema
npm run launch:check
```

`launch:check` lists every remaining gap — **that list IS the punch list.** Never
set `launchReady: true` until it passes and the agent has confirmed everything is
real.

**Show them the running site now, and restate the 70% frame as you do it.** This is
the moment it matters most — they're seeing their site for the first time and will
instinctively judge it as finished work:

> "Here it is. Remember, this is the 70% version — real, but not done. Tell me what
> feels off, what's wrong, what you'd change. Nothing here is precious and none of
> it is hard to change. This is the part where you being picky makes it better."

Then **actually iterate.** Take their reactions and work them through the right
skills — `site-design-system` for look, `copywriter` for words, `image-manager` for
photos, `realtor-content-writer` for pages. Keep going until they're happy; don't
treat the first pass as the deliverable.

## Phase 7 — Content

1. **Import what they already have** — hand off to **`content-import`**: their old
   blog posts become real posts in `content/posts.ts`, properly interlinked to the
   money pages, with 301s captured if the old URLs were live.
2. **Write the rest** — hand off to **`realtor-content-writer`** for area, niche,
   and money pages (they render scaffolds until written).
3. Everything goes through the gate; `site-design-system` is the finish line.

## Phase 7b — Write down everything they deferred

Agents say **"let's do that later"** constantly during setup — most often about
IDX, but also photos, socials, reviews, and the domain. Later never arrives unless
someone tracks it.

Before finishing, write a **deferred list**: what was postponed, why, and what it
unlocks. Hand it to `listings-routine`, which raises it at each recurring run and
chases each item until it's either done or **explicitly declined**. A deferral is
a decision to revisit, not a silence.

IDX is the one most worth re-asking: it's the difference between a listings page
showing a handful of homes and one that can answer any "what's for sale here"
question — on the site *and* on the phone.

## Phase 8 — Ongoing (set this up before you finish)

Don't end at launch. Leave them with a running engine:

- **AEO/GEO articles** — set a cadence with **`krista-aeo-geo-writer`** so new
  articles keep earning AI recommendations. Agree how often and who triggers it.
- **Funnels** — **`funnel-builder`** for lead magnets, events, and opt-ins,
  capturing through the same GHL pipe. Works inside this site (inherits theme +
  business + CRM) or standalone on another site.
- **Listings** — `listings-manager` for a single change, and **`listings-routine`**
  for the recurring freshness check. Set the cadence with them now. This matters
  more than ordinary content upkeep: the listings feed the site's knowledge base,
  which an AI voice agent answers inbound calls from. A sold home still showing as
  active means a caller gets told it's available.
- **Images** — `image-manager`.
- **Domain** — **`domain-setup`**. New domain is mechanical; switching a LIVE
  domain is a migration that protects their email (never touches MX), builds the
  301 map in `content/redirects.mjs`, and captures a DNS rollback. Don't switch a
  live domain without it.

## Never

- Never set `launchReady: true` while `launch:check` fails.
- Never invent a stat, review, license, address, or testimonial.
- Never write harvested data without the agent confirming it.
- Never put the GHL token or API keys in `site.config.ts` (env vars only).
- Never present a generic or AI-generated image as a real photo of a real place.
