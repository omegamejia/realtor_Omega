---
name: realtor-site-setup
description: >-
  Set up a new real estate agent's website from this seed — orient them, discover
  and harvest what they already have (existing site, files, photos, old blog posts),
  interview to fill the gaps, wire accounts + GHL + voice, spin up the site, import
  their existing content, and WRITE EVERY PAGE before calling it done. Can start
  with the agent's listings and AI phone assistant before the rest of the site,
  and picks up a setup already under way from content/SETUP-PROGRESS.md. Use when
  someone says "set up my site", "onboard me", "build my real estate website",
  "fill in my site", "get my listings up first", "where did we leave off", or is
  starting from a fresh clone of this repo or one whose setup isn't finished.
---

# Realtor Site Setup

You are setting up ONE agent's site from this seed. Your job is to hand back a
**finished website** — not a configured one.

That means two things, and the second is the one that gets dropped:

1. Turn the placeholder `site.config.ts` into that agent's real, confirmed
   information — and never invent anything.
2. **Write every page.** Real copy, in their voice, on all of it. The config is
   the setup; the pages are the product. An agent who opens their site and sees
   placeholder text where their business should be does not think "good progress"
   — they think this did not work. Setup is not over until `npm run gate` reports
   zero pages still showing the built-in outline.

Most agents are **not starting from zero.** They usually have an old site, a
brokerage bio, a Zillow profile, photos on their laptop, and a folder of blog
posts. **Harvest first, interrogate second.** Asking someone to retype what
already exists is how onboarding dies.

## The one rule that matters most

**Only write data the agent has confirmed is real.** The full rule, including
where each kind of value is allowed to come from, is
`.claude/rules/truth-verification.md` — read it before Phase 2. You cannot know an agent's
license number, address, or phone. Ask (or harvest), then echo it back for
confirmation before writing. A realistic-but-wrong value is worse than a blank.
Never fabricate reviews, stats, awards, or credentials.

Harvested data is a **candidate, never a truth.** Anything pulled from a website,
a document, or a profile is a proposal the agent must confirm before it lands in
config.

## Never write the word "just"

`CLAUDE.md` bans it everywhere in this project, and setup is where it gets
ignored — a graded test run used it **thirteen times in ten turns**, including
*"just open this folder and say 'where did we leave off'"*, aimed at the one
instruction the agent has to remember on their own.

Every use makes a thing that is new to them sound like a thing that should have
been obvious, and they are the only person in the conversation who does not
already know how it works. "Just" is almost always deletable with no loss:

| Don't | Do |
|---|---|
| "It's just the screen that shows the number" | "It's the one screen that shows the number" |
| "Just open this folder and say…" | "Open this folder and say…" |
| "I just need to know which order to work in" | "I need to know which order to work in" |
| "It's probably just a typo" | "It's probably a typo" |

The same goes for "simply", "all you have to do", and "obviously".

## Starting points — not everyone starts at the top

The phases below have an order, and most agents should take it. Some shouldn't.
An agent with listings coming in this week who has to sit through sixty pages
before their phone assistant knows about them is an agent who gives up.

**Ask this third**, right after the website and Agent-OS questions in Phase 0:

> "Last one before we dig in. Do you want to build the whole website now, or is
> there something you need working first? Some agents want their listings up and
> their AI phone assistant answering about them before anything else. Either is
> completely fine."

| They say | Starting point | What happens |
|---|---|---|
| "The whole thing," or no preference | **Full site** (the default) | Every phase, in order |
| "My listings first," "I want the AI caller working," "the rest can wait" | **Listings first** | Below |
| "Someone already built this, I'm here to help run it" | **Wrong folder** | Below |
| "I already have a website and I'm keeping it — I only want the AI phone assistant" | **Assistant only** | Below |

### Listings first

1. **Phase 0b.** Get the machine ready.
2. **The every-page minimum** (Phases 3.0 and 2g): the agent's name, business
   name, brokerage, license number, phone and email, all confirmed, plus the
   office address confirmed or left blank.

   **One question per message, in that order.** This is a list of seven, and it is
   tempting to send it as a list. Don't: a beginner answers the last question they
   read and the rest quietly vanish, which in testing meant the name and license
   number went unanswered while the email got answered twice. Short questions
   asked singly finish faster than a form.

   These cannot wait. Every page carries them in the footer the moment the site
   is deployed, launched or not, and a licensee disclosure is not optional on a
   page the public can open.

   **Then two things the phone assistant tells callers**, because `/ai-brief`
   describes both and callers ask about both:

   - **The towns they serve.** Names only, confirmed. Neighborhoods, descriptions
     and everything else about an area can wait for Phase 3.
   - **Which services they actually offer.** The seed ships a default list (VA
     buyers, probate, divorce sales and more). A default is not an answer
     (`.claude/rules/truth-verification.md` §2), and the assistant would offer
     every one of them to a caller. Read the list out and remove any they don't
     do. One question, not the full specialty interview; Phase 3 comes back to
     specialties properly.

   Nothing else from Phases 1 to 3 yet. Anything still a `[BRACKET]` placeholder
   is left out of what the assistant reads, so a blank is safe. A wrong default
   is not, because it isn't a placeholder and nothing filters it out.
3. **Phase 4.** Accounts and the first deploy.
4. **Phase 5b.** GoHighLevel, collecting the token's knowledge-base access in the
   same visit.
5. **`listings-manager`** for every listing.
6. **Phase 5b-ii.** The `voice-agent` skill. It works before launch; that skill
   says why.
7. **Stop, and say where things stand:**

   > "Your listings are up and your phone assistant knows them. The rest of the
   > website isn't written yet, so it's hidden from Google, and I'd hold off
   > sharing the link until it is. Whenever you're ready, we pick up right here."

   Then offer to carry on with the rest.

**This is a pause, not a finish.** `launchReady` stays `false`, and the rule in
Phase 7 still holds: setup is done when every page is written. Resuming starts at
Phase 1, and nothing already confirmed gets asked again.

### Wrong folder

If someone opens a **brand-new** copy of this template and says their site
already exists, they are in the wrong place: this copy is blank, and their site
is somewhere else. Don't start an interview. Find the real one (`gh repo list`,
or ask who set it up), open that folder instead, and let the session-start check
in `CLAUDE.md` take it from there. Don't delete the blank copy without asking.

### Assistant only — they are keeping their own website

**Never offer this. Never mention it while a site of theirs is still possible.**
Every agent should have their own site: it is what gets found, it captures the
lead, and it keeps the phone assistant current without anyone pushing anything.
This is for the agent who has already decided otherwise — they have a site they
are keeping, or they want the phone assistant and nothing else. When they ask for
it, the answer is yes, and it is a supported route rather than a workaround.

**When they turn the site down in the middle of setup, that is the whole of your
next message.** Stop the question you were on. In testing, an agent said "I don't
want a website at all, can we just do the phone assistant" and the session wrote
the previous answer into the config and asked for their email address, as though
nothing had been said. They had to repeat themselves to be heard. A beginner who
has to say it twice concludes they are being railroaded into a website they
already declined.

So: answer the decision, say what changes, and confirm — then pick the dropped
question back up in your *next* message. **Name all four trades, out loud, and do
not soften them:**

- every listing change is pushed by hand, so the assistant is wrong until it is;
- nothing here is findable by Google or AI search, because the knowledge base is
  private to the phone line;
- the assistant cannot send a caller a link, because there are no pages;
- and there is no hosting bill, no domain, and nothing to deploy.

Then record it in `content/SETUP-PROGRESS.md` as the starting point, so no later
session treats the unwritten pages as a punch list.

1. **Phase 0b**, so their machine can run this.
2. **The every-page minimum** above, plus the towns and the services. Same list,
   different reason: nothing is being published, but the assistant says all of it
   out loud, starting with the licence number when a caller asks who they are
   dealing with.
3. **Phase 5b**, GoHighLevel, with the Knowledge Base scopes on the token.
4. **`listings-manager`** for every listing. `content/listings.ts` is still the
   source of truth, and it is the only copy.
5. **`voice-agent`**, its **knowledge-base-only route**. That section covers what
   replaces the pages and what the agent has to accept in exchange.

No GitHub-and-Vercel accounts, no domain, no deploy. `launchReady` stays `false`
permanently, which is correct: nothing is being launched, and the unwritten pages
are not a punch list. **Record the starting point in `content/SETUP-PROGRESS.md`**
so a later session does not treat this as a half-finished website and start
writing pages nobody asked for.

If they change their mind later, nothing is lost: their listings are already here.
Pick up at Phase 1 and build the site around the data.

### Any other order

Starting with a blog import, photos or the domain is fine too. Two things come
first whatever the order: the every-page minimum above, and the voice checkpoint
in Phase 7.2 before any bulk writing.

## Setup progress — write it down as you go

`content/SETUP-PROGRESS.md` is how a setup survives being stopped. The agent
comes back a month later, a team member picks it up, or a session runs out of
room. The next session reads this file and carries on, instead of guessing from
the config or starting again at the first question.

**Create it as soon as the starting point is chosen. Update it at the end of every
phase, and before any session ends.** One file, rewritten in place:

```markdown
# Setup progress

**Starting point:** Listings first
**Started:** 2026-09-11 · **Last worked on:** 2026-09-14
**Next:** Phase 1 discovery for the rest of the site.

| Stage | Status | Notes |
|---|---|---|
| Orientation and machine (Phases 0, 0b) | done | |
| Every-page minimum (name, brokerage, license, phone, address) | done | Address unconfirmed, on OPEN-ITEMS |
| Discovery, harvest, interview (Phases 1–3b) | not started | |
| Accounts and first deploy (Phase 4) | done | |
| GoHighLevel (5b) | done | Token has knowledge-base access |
| Listings | done | 4 active, 1 pending |
| AI phone assistant (5b-ii) | done | No team pages, by choice |
| Map, chat, voice, design, IDX (5a, 5c–5f) | not started | |
| Pages written (Phase 7) | not started | `npm run gate` gives the count |
| Launch (domain, launch check, `launchReady`) | not started | |
```

Status is one of `done`, `in progress`, `not started`, `waiting on agent`, or
`skipped` with the reason.

- **No facts in here.** It records where setup stands, never the data. Facts live
  in `site.config.ts` and `content/`, where the gate can check them, and anything
  still missing goes on `content/OPEN-ITEMS.md` (Phase 7b).
- **Mark it complete when the site launches, and keep it.** It is the record of
  how the site was built.

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
> First question — **do you already have a website?**"

**Ask ONE question and stop.** Do not stack questions in the opener. A beginner
answers the last one they heard and the rest quietly vanish.

**Why this question and not Agent-OS.** Agent-OS still gets asked, and still gets
asked early — but not as the first sentence. Some agents buy this site on its own
and have never heard the name; opening with it makes the very first thing out of
your mouth a term they have to ask you to explain, in a project that otherwise
works hard never to do that. "Do you already have a website?" is a question every
single one of them can answer instantly, and it is the one that decides how the
rest of the interview goes.

**Ask about Agent-OS second**, right after the website answer and before any real
interviewing begins:

> "One more before we dig in — **have you already set up Krista's Agent-OS?** If
> you have, a lot of what I'd otherwise ask you is already written down in there
> and I can read it instead of making you repeat yourself. If that doesn't ring a
> bell, no problem at all — it just means I'll ask you directly."

That phrasing costs nothing if they don't have it, and saves a great deal if they
do. Never assume they have it, and never make not having it feel like a gap.

**Then ask where they want to start**, third and last before the interview
proper. The question and what each answer means are under **Starting points**
above. Whatever they choose, create `content/SETUP-PROGRESS.md` now.

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

## Phase 0b — Get the machine ready (you do this, not them)

**Check before you ask, and install before you instruct.** Sending someone to
nodejs.org to pick the right download is a step they can get wrong, and it is a
step you can simply take. Most of this is already there anyway — check first.

**Run these as four separate commands, never chained with `&&` or `;`.** The
seed pre-approves each one by name in `.claude/settings.json`, and a chain is a
different command that matches none of them — so chaining turns a silent check
into a permission prompt reading "this Bash command contains multiple
operations", aimed at somebody on their second-ever interaction with Claude. In
testing that stopped the setup dead.

```bash
node --version
npm --version
git --version
gh --version
```

Report what you find in one line, plainly: *"Good news — three of the four things
are already on your computer. I'll grab the last one."*

**Then start the accounts track, here, in the same breath** — run `gh auth
status`. `CLAUDE.md` calls accounts a parallel track to start early, and this is
early. It is one more pre-approved command and it decides which of two very
different conversations you are about to have:

- **Already logged in** — say so and move on. Nothing is needed from them.
- **Not logged in, or no GitHub account at all** — do not fix it now and do not
  derail discovery with it. Say one sentence so it is on their radar — *"one
  thing we'll need later is a free GitHub account, which is where your website's
  files live, like a filing cabinet that keeps every past version. I'll walk you
  through it when we get there, it's an email and a password"* — and put it on
  the open-items list. In testing, ten turns went by without GitHub being
  mentioned once to an agent who did not have an account and did not know what
  one was, because the track was never started.

### What each is, if they ask

- **Node** — the engine that runs your website on your own computer so you can see
  it before anybody else can.
- **git / GitHub CLI** — how your files get saved and backed up, and how I talk to
  GitHub for you.

### Installing what's missing — no password required

Work down this ladder and stop at the first one that applies:

| Situation | Do this |
|---|---|
| Homebrew present (Mac/Linux) | `brew install node gh` |
| Windows | `winget install OpenJS.NodeJS.LTS` · `winget install GitHub.cli` |
| No package manager (Mac/Linux) | Install **nvm** (the official Node version manager) into their home directory, then `nvm install --lts`. This needs no admin rights. |

**Never run an installer that needs their password.** The macOS `.pkg` from
nodejs.org wants an admin password — that is exactly the path to avoid, because
you must never ask for a password or type one on their behalf. Every option above
installs into space the user already owns. If you somehow reach a point where only
an admin install will work, hand that one step back to them and say why.

**Tell them before you install anything.** A permission prompt for software they
have never heard of is where a nervous beginner stops and emails for help:

> "I need one small tool so I can talk to GitHub for you — it's the official one
> from GitHub, it takes about ten seconds, and you'll see a prompt asking to allow
> it. That's expected."

**Then confirm it worked** by re-running the version check, so "installed" is
something you verified rather than assumed.

## Phase 1 — Discovery (before any interview questions)

Ask these first. They determine how much work everything else is. Phase 0 has
already asked the first two openers (their website, then Agent-OS) and where they
want to start; this is where you follow each answer up.

0. **"Have you set up Krista's Agent-OS?"** Asked in Phase 0, straight after the
   website question. Many agents coming to this site have already been through her
   onboarding, which means a lot of what we'd otherwise interview for is **already
   written down**. If yes, get the folder path and harvest it (Phase 2a) before
   asking anything redundant.
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

   **Do not ask this as a list of seven.** It reads as an audit, and a beginner
   who does not know what half the words mean answers the one they recognise and
   goes quiet. Ask the open version — *"what are you already paying for that
   touches your website or your leads?"* — take whatever they name, and pick the
   rest up at the phase that actually needs it: IDX at the listings phase, the CRM
   at 5b, the domain at deploy. A tool you do not know about yet costs nothing
   until then; a beginner who feels examined in the first five minutes costs you
   the whole setup.
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

     **This one is homework, so never let it block.** Most agents do not have
     three sites in mind and will go away to think about it, which ends the
     session. Ask it once, and in the same breath give them the out: *"if nothing
     springs to mind, don't go hunting — the site already looks good, and it's
     far easier to react to yours once it's built than to describe it now."* Then
     carry on. If they have no colors either, **use the seed's defaults and say
     so** — a design they can see and change beats a decision they cannot make
     yet, and this is the single most common place a setup goes quiet for a week.
6. **Source of truth — do not ask this one up front.** It is a sensible question
   and a terrible opener. "When two places disagree, which should I believe?" is
   abstract, hypothetical, and about sources the agent has not thought about yet;
   in the first few minutes it makes the whole thing feel like a deposition.

   **Use this default silently** and only raise it when a real conflict appears:

   > **their live confirmation > license/brokerage record > their CRM > current
   > website > third-party profiles (Zillow etc.) > social bios**

   When two sources actually disagree, the question answers itself and is
   concrete: *"your brokerage page says Suite 200 and your old site says Suite
   210 — which is right?"* That they can answer in three seconds. Record what
   they tell you, and apply it to later conflicts of the same kind.

## Phase 2 — Research and harvest (pull, don't interrogate)

**Read `.claude/rules/truth-verification.md` before this phase.** Everything
gathered here is a **candidate, not a fact**, and nothing lands in config until
the agent has seen it and said yes. A real run put 45 of 127 facts onto a live
site unconfirmed — including the office address — and every check passed, because
wrong data is structurally identical to right data.

**Search before you ask.** Your time is cheap and theirs is not. Find everything
you can first, then run a single confirmation pass, so the interview is them
saying *yes/no/fix that* instead of reciting facts they already published.

### 2a. Their Agent-OS (check this FIRST — richest source)

If they've done Krista's onboarding, most of the brand work is already done. **Do
not re-ask what's already written there.**

**Look for it yourself before you ask anything.** "Where is your Agent-OS folder?"
is a question about a file path, asked of somebody who sells houses — and a
beginner who does not know the answer feels caught out in the first two minutes.
You can almost always find it. Run this **before** the Phase 1 questions:

```bash
find ~ -maxdepth 5 -type d -name "11-Brand-System"
```

`11-Brand-System` is the distinctive folder name, so a hit is almost certainly
theirs. Use `find`, not a list of `ls` paths with `*` in them: in zsh a glob that
matches nothing aborts the whole command, so one missing folder means you get an
error instead of the three directories that did exist. A non-zero exit here is
normal — it means `find` skipped a folder it could not read, not that it failed.

**Expect more than one hit, and do not assume the first is the live one.** A real
run of this returned four, three of which were backups:

```
~/Agent-Authority-OS-SAFETY-COPY-2026-08-24/Agent-OS/11-Brand-System
~/Backups/Agent-OS-safety-copy-2026-08-24/Agent-OS/11-Brand-System
~/Backups/agent-os-migration-2026-08-24/Agent-Authority-Operating-System/Agent-OS/11-Brand-System
~/projects/Agent-Authority-Operating-System/Agent-OS/11-Brand-System
```

Harvesting the August copy would put last season's brand, territory and stats on
a site the agent believes is current, and nothing downstream would ever catch it.
So when there is more than one: **ignore any path containing `backup`, `safety`,
`copy`, `archive`, `old` or a date stamp**, take the most recently modified of
what is left, and say which one you are using. If two live candidates survive
that, show both paths and ask — it is one question and it prevents a silent wrong
answer to every question after it.

Then say what you found rather than asking whether it exists:

> "I can see you've been through Krista's Agent-OS — that saves us a lot. Give me
> a minute to read it, then I'll show you what I've got and you tell me what's
> changed."

**Only ask for a path when the search finds nothing**, and ask it the way a
person would: *"did you set up Krista's Agent-OS? If you did and it's somewhere
unusual, drag the folder into this window and I'll find it."*

Then read `11-Brand-System/`:

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

### What this replaces — read it, then confirm, never re-ask

A filled Agent-OS answers most of the long interview. Every row below is a
question you would otherwise ask cold, and asking it cold of somebody who already
wrote the answer down is how a setup starts feeling like paperwork:

| Question you would have asked | Already answered in |
|---|---|
| "Which towns do you serve?" | `09` → Primary / Secondary territory |
| "Which neighborhoods inside them?" | `09` → neighborhood-by-neighborhood expertise |
| "Anywhere you *don't* work?" | `09` → out of bounds (refer out) |
| "What do you specialize in?" | `03-Offers.md` |
| "Are you a Realtor®?" · designations | `00-Credentials.md` |
| "What's your brokerage?" · license # | `00-Credentials.md` |
| "Who's on your team?" | `10-Team-and-Handoffs.md` |
| "Who's your ideal client?" | `02-Ideal-Client.md` (+ `02b` for their words) |
| "How do you want to sound?" | `07-Voice-Rules.md` |
| "What should the blog cover?" | `04-Content-Pillars.md` |

**Then show one screen and ask one question.** Not ten confirmations — a short
readable summary of what you found, and:

> "That's what your Agent-OS says. What's changed, and what did I get wrong?"

Anything they correct is confirmed by the correction. Anything they let stand is
confirmed by them reading it. That is a real confirmation under
`.claude/rules/truth-verification.md` — silence on a list they never saw is not,
which is why you show it rather than summarise it away.

**Placeholders are not answers.** These files ship as fill-in templates, and the
blanks look like this: `[N]`, `$[X]M`, `[%]`, `[Year] — [Award name]`,
`[FILL IN]`, `[Neighborhood 1 name]`, and unticked `- [ ]` checkboxes. **Never
carry one of those into the site, and never read one aloud as though it were
theirs.** A credentials file full of `[N]` means the agent skipped that page, not
that they have zero transactions.

**Their stats are the one thing to slow down on.** `00-Credentials.md` holds
volume, transaction counts, days on market and list-to-sale ratios — exactly the
numbers `legal-compliance.md` §4 requires a real source for, and exactly the
numbers that rot. A figure written there a year ago is a candidate with a date on
it, not a fact. Confirm each one you intend to publish, and say why you are
asking: *"this one goes on your site where a client can quote it back to you."*

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

### 2f. Find their public presence (do this every time)

These populate `social`, `googleBusinessProfileUrl`, and the whole `sameAs` block
in schema — the thing that tells Google and AI assistants that all these profiles
are the same business. Today they get filled by luck. Go looking:

| Look for | Feeds | Why it matters |
|---|---|---|
| **Google Business Profile** | `googleBusinessProfileUrl`, `googleMapsEmbedUrl`, address, geo, hours | The authority on NAP. If it exists, it settles four fields at once. |
| Facebook, Instagram, LinkedIn, YouTube, TikTok | `social.*` → `sameAs` | Entity reinforcement — how Google connects the site to the person. |
| Zillow, Realtor.com, Yelp | `sameAs`, reviews | Where their actual review history lives. |
| Brokerage bio page | team, license, title | Usually the most current roster. |

**Then run ONE confirmation pass.** Put everything found in a single table and ask:

> "Here's what I found under your name. Before I put any of it on your site — tell
> me which are actually yours, and whether each one is current. Anything you don't
> recognise, or don't want linked, I'll leave off."

**Never assume a profile is theirs because the name matches.** Common names exist,
agents change brokerages, and abandoned profiles outlive the jobs that created
them. Linking the wrong one tells Google the wrong business is this business.

**Anything they don't confirm stays empty and goes on the open-items list.** An
empty `sameAs` costs a little SEO. A wrong one costs correctness.

**The gate now fails on an address embed**, so this is not advisory. An address
embed and a profile embed both render a map and look identical on the page; only
one carries any local SEO value. `npm run launch:check` tells them apart by
looking for `?pb=` (profile) versus `?q=` (address).

**Walk them through it live. Do not send them off to find it.** This is the step
that gets skipped, and skipping it leaves a map that looks fine and is worth
nothing. Say it like this, one instruction at a time, waiting between each:

> "Two minutes and we get the map right. Open Google Maps and search your
> business name, not your address."
>
> "You should see a card on the left with your reviews and photos. Click it. If
> you get a plain address result instead, tell me what you see and we will find
> the right one."
>
> "Now click Share. There are two tabs. On **Embed a map**, copy the whole thing
> it gives you and paste it here."
>
> "Now click **Send a link** and copy that one too."

Both values come from the same card. If they cannot find a business card at all,
they may not have a Business Profile yet, which is worth knowing: for a local
business it is the single highest-value thing they can go create, and it belongs
on the open-items list at the top.

**Never accept an address search as a substitute.** `npm run launch:check` fails
on it, on purpose.

**Capture the map from the profile, never from the address.** Both map fields
must come off the Business Profile card — the one with the rating and photos —
not a plain address result:

1. Search the **business name** on Google Maps and click the business card.
2. **Share → Embed a map** → copy the `src="..."` → `googleMapsEmbedUrl`.
3. **Share → Send a link** → copy the link → `googleBusinessProfileUrl`.

An address embed drops an anonymous pin on a building. The profile embed shows
the business name, rating, and photos, and every interaction is credited to the
listing Google actually ranks. Identical on screen, completely different value —
which is exactly why it gets done wrong and never noticed.

**No Business Profile yet?** Leave both blank, put it on the open-items list, and
tell them plainly it's the highest-value thing they can go create: for a local
business it outranks almost anything else on the site.

### 2g. Nail down NAP (name, address, phone) — the highest-stakes data

Name, address, and phone drive the map pin, the knowledge graph, and every local
ranking signal. **One source is not a source.**

- Require **two independent sources agreeing**, or **explicit confirmation**.
- **The Google Business Profile wins** when one exists — it is the record Google
  already matches against, and it carries the coordinates and hours too.
- **Surface conflicts, never resolve them quietly.** If the GBP, the brokerage
  page, and their old footer disagree, say so and let them decide:

> "I found two different addresses for you — [A] on your old site, [B] on your
> Google listing. Which is current? This one matters more than most: it's what
> shows on the map and what Google checks you against."

A conflict is information. Picking one silently throws that information away and
looks identical to having been right.

### 2h. Design references (what they like, and *why*)

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

Now ask about what harvesting didn't answer. Conversational, in plain language,
not a form. Confirm as you go.

**One question per message, everywhere in setup, including when you pick a setup
back up.** It is the rule most often broken, because a batch of three feels
efficient. In testing, a session asked name and brokerage together, then license,
phone and email together, and the agent answered only the last one each time: the
seven facts took fifteen messages instead of seven. A read-back for confirmation
is fine as a block, because it asks one thing: "is this right?"

### 3.0 — Identity: ask this FIRST, before anything else in this phase

**There are four different names here and they are not interchangeable.** Ask for
each one separately, and never let one answer fill more than one slot:

| Field | Question |
|---|---|
| `agent.name` | "What's your name, as you want it read on the site?" |
| `brand.logoText` | "What's the business called — the name at the top of every page?" |
| `business.legalName` | "And the legal entity, if it's different — the LLC or corporation name." |
| `agent.brokerage` | "Which brokerage are you licensed under?" |

Then the question everything downstream depends on:

> "When somebody recommends you to a friend, do they say **your name** or **the
> company's**? There's no wrong answer — I just need to know which one leads,
> because it changes the header, what Google lists as the business, and whether
> the writing says 'I' or 'we'."

**Why this matters more than it looks.** The site's identity used to be inferred
from whoever was marked `lead: true` in the team list — nobody was ever asked what
the site was called. The result was a header saying one thing, a browser tab
saying another, and `Organization` schema naming a person instead of a business on
every page. One unasked question, three visible defects.

Record the answer. `copywriter` needs it for voice, `lib/schema.ts` needs it for
the `Organization` node, and `site-design-system` needs it for the header.

### 3.1 — Everything else

- **Team — verify the roster, don't just collect it.** Ask outright: **"Are all of
  these people still with you?"** A brokerage page is a snapshot and someone who
  left three months ago is still on it. Then per person: full name, title, whether
  a real REALTOR® (NAR member), license #, phone, email, headshot, 2–3 sentence
  bio. Mark one `lead: true`. **Every person gets their own About page** (`/team/<slug>`)
  written in Phase 7, so every person needs a real headshot and a real bio — not
  an inferred one. If someone won't supply a bio, the page waits; it never gets
  invented.
- **Business:** business name, legal name/LLC, brokerage, tagline, founding year
  (if known). **Price range: ask, or leave it empty.** It ships blank on purpose —
  it renders only into schema where nobody can see it, so a guess there would
  never be caught.
- **Location:** city, state, full office address, and office lat/lng
  (Google Maps → right-click → copy coords).
- **Areas served: NEVER STOP AT ONE.** One area is never enough, and agents will
  almost always name their city and stop. Push, and **push downward into
  neighborhoods**, not just outward into other cities. If they say "Brentwood":

  > "Great. Two things there. First, anywhere else besides Brentwood, even
  > occasionally? Second, and this is the one people forget: **which
  > neighborhoods inside Brentwood?** Buyers search both ways. Some type
  > 'homes for sale in Brentwood', and plenty type the specific neighborhood
  > because that is where they already want to live. If we only build the city
  > page we miss all of them."

  Then get the actual neighborhood names from them, four or five if they exist.
  Every city has them: subdivisions, school zones, the older side versus the
  newer side, whatever locals actually call the parts of town.

  **Then, for each area, get the local facts.** This is the single highest-value
  thing collected in the whole interview, because it is what stops twenty pages
  being the same page with the name swapped. Ask conversationally, one area at a
  time, and take whatever they give you:

  > "Tell me about [Deer Ridge] like you're telling a client who's never been.
  > What are the houses, roughly when were they built? Who ends up buying there
  > and what are they after? Which schools do people ask you about? And what
  > would somebody give up choosing [Deer Ridge] over [Shadow Lakes]?"

  Write the answers into `serviceAreas[].localFacts`. **Never invent any of it.**
  A wrong school name or a made-up builder on somebody's own neighborhood page is
  the fastest way to lose a local reader who knows better, and it is the agent's
  name on it, not ours.

  If they run out of steam after two areas, that is fine and normal. Get the
  areas they actually work, put the rest on the open-items list, and come back.

  **Then ask, for each area: is it its own city, or a neighborhood inside one?**

  > "Quick one on each of these — is [Oakley] its own city, or is it a
  > neighborhood inside [Brentwood]?"

  Set `parentCity` on every area that is a neighborhood; leave it unset for a
  standalone city. It drives three things at once: the nav nests neighborhoods
  under their city instead of listing twenty flat, the schema states real
  containment, and the area grids know what to collapse.

  **If they work neighborhoods of a city they do not otherwise serve, ask whether
  the city itself should be an area too.** Usually it should: it is the higher
  volume search term and it gives the neighborhoods somewhere to nest. If they
  say no, that is fine and handled, those areas simply sit at the top level. **This is not a detail.** Because we now push agents to list
  neighborhoods *and* cities, `serviceAreas` mixes two different kinds of place
  with nothing distinguishing them. Guess wrong and the site's schema asserts
  that one city contains another — factually false, invisible on the page, and
  repeated on every page of the site. Ask; never infer it from the office
  address.

  **Teach them why, briefly, because they will care once they get it:**

  > "The city page competes with every agent in town and with Zillow. A
  > neighborhood page competes with almost nobody, and the person searching it is
  > further along, because they have already picked where they want to live. Those
  > pages also feed the city page, so you end up ranking better for the broad term
  > than if you had only written the broad term."

  Collect for each: real name, and city-center lat/lng (Google Maps, right-click,
  copy coordinates).

  **Both levels always.** The broad city AND the neighborhoods inside it, because
  people genuinely search both. Never only one or the other.

  **The honest limit:** never invent a neighborhood or claim an area they do not
  work. If they truly only sell in one small town with no distinct neighborhoods,
  build that properly and say plainly that adding areas later is the single
  biggest lever they have.
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

## Phase 3b — Images and brand assets (ASK, every time)

**This phase is not optional and it is not conditional on them offering.** Ask
for these out loud, by name. A site with real copy and no headshot still looks
unfinished, and an agent who is never asked assumes the system does not want
them. Every reported "it never asked me for my logo" traces to skipping this.

Ask for each, one at a time, and say why it matters:

| Ask for | Say why | If they don't have it |
|---|---|---|
| **A headshot for every person on the team** | "One for each of you. Each person gets their own page on the site, and people hire the person, not the brokerage , these are the most-looked-at images you have." | Note who is missing, keep those slots empty, add to the open-items list. Never use a stock photo of a person, and never use one person's photo for another. |
| **Logo** | "Goes top-left on every page. If you don't have one, we use your name set in your brand typeface, which honestly looks cleaner than a bad logo." | Offer the name-as-logo fallback. That is a real answer, not a consolation. |
| **Brand colors** | "Everything on the site takes its color from these , buttons, links, headings. One change updates every page." | Pull from their existing site or logo, show them, confirm before writing. |
| **Listing photos** | "For any home you're currently marketing." | Fine to skip; listings can come later via `listings-manager`. |
| **Neighborhood / area photos** | "Real photos of the areas you work beat stock every time, and they're yours." | `image-manager`'s sourcing ladder. Never present stock as a real local place. |
| **One WIDE photo for the site** | "This sits behind the headline on your home page and both process pages. Landscape, 1600px or wider." | Goes in `business.heroImageUrl`. Never hardcode an image path in a page file: that is agent data living in an engine file, and an engine update will wipe it. Empty falls back to a brand gradient that still looks deliberate. |
| **One WIDE photo per area** | "Each area page opens with a full-width photo behind the headline. Landscape, at least 1600px across. A listing exterior, a streetscape, an aerial." | Falls back to a shared brand image. Say plainly that a real local photo is the single biggest visual upgrade available, and add missing ones to the open-items list. |

**The template is photographic, so say so early.** Every area page, the home page
and `/process` open with a full-bleed image behind white type. Landscape only:
a portrait headshot stretched across a hero looks broken, and cropping it loses
the face. Set `heroImage` on each `ServiceArea` and hand the files to
`image-manager`.

**If they have no wide photos at all**, the fallback still looks intentional
rather than empty, and the site ships. It just never looks like *their* market,
which is worth one honest sentence rather than quietly settling for it.

**How to ask for a file.** They are not going to know what a path is. Say:
*"Find the photo on your computer, then drag it right into this chat window"* ,
or *"tell me which folder it's in and I'll go get it."* Both work. Do not ask
them to type a file path.

Hand every file to **`image-manager`** for sizing, placement, and wiring. Log
provenance for anything that is not theirs, per `.claude/rules/image-sourcing.md`.

**Every page wants its own image, and most sites will not have enough.** That is
expected and it is not a blocker: `Bleed` falls back to the site-wide photo and
then to a brand gradient, both of which look deliberate. What is NOT acceptable
is losing track of it. Count what is missing, write the number into
`content/OPEN-ITEMS.md`, and hand it to `listings-routine` so it gets raised at
every recurring run until the gap closes or they say stop.

`npm run launch:check` reports the coverage, so the number is measured rather
than remembered.

**Before leaving this phase**, say what you got and what is still missing, so a
gap is a decision rather than an accident.

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

### Connect FIRST, then do it for them

**This is the order, and it is not negotiable: get connected, then act.** The
worst version of this phase is narrating clicks — *"go to github.com, press the
green button, now name it, now scroll down"* — at somebody who has never seen the
page. They mis-click, land somewhere unexpected, and the whole setup stalls on a
screen you cannot see.

**The only two things they must do by hand are the two that need their identity
and their credit card:** creating the accounts and paying for Vercel. Everything
after that is work you can do directly, and should.

1. **They create the two accounts** (below). Only they can do this.
2. **They connect you.** One authorization each, then you take over.
3. **You do the rest** — create the repository from the template, clone it, link
   Vercel, set environment variables, deploy.

**Getting connected — check what you already have before asking for anything.**

- Run `gh auth status`. If it reports a logged-in account, you already have GitHub
  and can create and clone the repository yourself. Say so and move on.
- If not, have them run **`gh auth login`** and choose the browser option. It opens
  a page, they press one button, done. Explain it as: *"this is you telling GitHub
  it's okay for me to work on your files — like adding me to the account, except
  you can revoke it any time."* If the GitHub CLI isn't installed, install it
  rather than reverting to manual clicking — `brew install gh` on a Mac,
  `winget install GitHub.cli` on Windows, or whatever their system uses. Check
  which platform you're on before naming a command; telling a Windows user to run
  `brew` is the kind of small wrongness that costs a beginner twenty minutes.
- Check their Claude connectors too. If a GitHub connector is already set up, use
  it — fewer steps is always better than more.
- **Same rule for Vercel** when you reach deploy: `vercel login` and drive it from
  there instead of narrating the dashboard.

**Only fall back to walking them through the website by hand if connecting truly
fails** — and when you do, say why, so it reads as a workaround rather than the
plan: *"the shortcut isn't cooperating, so we'll do this one by hand — I'll go one
step at a time."*

### The steps

1. **GitHub account** (free) at github.com. Just a sign-up, like any website —
   nothing to install and nothing to learn. **They must do this one.**
2. **Vercel account, Pro plan** at vercel.com. Say the cost plainly: it's about
   $20/month and they pay it directly. Explain *why* — the free version isn't
   allowed to be used for a business, and this is their business. **They must do
   this one too** — it needs their card.
3. **Get connected** (above). One authorization, and the rest stops being their
   problem.
4. **You create their copy of the site** from the template — don't make them hunt
   for a button:
   ```bash
   gh repo create <their-repo-name> --template Krista-Mashore-Coaching/realtor-site-seed --private --clone
   ```
   Tell them what happened in their language: *"that's your own private copy of the
   website, and it's now on your computer. Nobody else can see it."* If they don't
   have access to the template yet, that's a KMC invite they need to accept — the
   one thing here nobody can automate around.
5. **You link Vercel to the repository** and deploy. Explain the payoff: "from now
   on, when I change something, your live site updates by itself. You never have to
   upload anything." Warn them the first version will look like a template full of
   blanks — that's expected, not broken.
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
3. **They authorize you** — `gh auth login` (and `vercel login` at deploy). One
   browser click each. Their tokens stay theirs.
4. **You create their copy** from the template with
   `gh repo create <name> --template Krista-Mashore-Coaching/realtor-site-seed --private --clone`,
   so they own the repo without hunting for a button. KMC still has to grant
   template access first — that part nobody can automate around.
5. **You import the repo into Vercel** and deploy. First deploy shows
   placeholders — expected.

Manual clicking through github.com and the Vercel dashboard is the fallback if
connecting fails, not the default. See the connect-first rule at the top of this
phase.
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
whole pipe: Private Integration Token (Contacts + Custom Fields scopes) in `.env.local` + Vercel
as `GHL_API_TOKEN`, `locationId` in `site.config.ts`, the hand-made custom-field
**folder** + marker field, and a **connection test** (test contact in, read back,
fields + tag asserted, test contact deleted). Do this even before any funnels
exist — the contact form uses the same pipe.

If they use a **different CRM**, don't force GHL. Capture the lead the same way and
note the integration gap plainly rather than pretending it's wired.

**While you have the token, collect the two extra things the voice agent needs**,
so nobody has to go back into GoHighLevel a second time:

- the **Knowledge Base scopes** on that same Private Integration Token, read *and*
  write. If the token was already made without them, it has to be recreated; the
  token string is only shown once.
- their **location ID**, which is already going into `site.config.ts` for lead
  capture and is the same value.

### 5b-ii. The AI phone assistant — run the `voice-agent` skill

Only once listings exist and the site is deployed. **Deployed, not launched:** an
agent who chose **Listings first** reaches this step while every other page is
still an outline, and that is fine. Explain it plainly first:

> "Your AI phone assistant doesn't read your website. It reads a separate copy of
> what your site knows, and that copy has to be built and kept up to date. If we
> skip this, someone calls and asks what you have for sale, and it says nothing."

That skill builds the knowledge base, registers a source per listing, writes the
question-shaped lists that let it answer "what do you have in [town]", and hands
over the assistant's prompt.

It will also ask **whether they want each team member's page in the knowledge base
too.** That one is optional and either answer is right; the skill records it so
nobody asks again.

**Defer it rather than fake it.** An agent with no listings yet has nothing to put
in there — put it on `content/OPEN-ITEMS.md` and pick it up when the first listing
lands, which is exactly when `listings-manager` calls it anyway.

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

### 5g. Tracking — do not set this up now. Say one line and move on.

**Skip it.** No pixel, no analytics tag, no heatmaps, no questions about ad
accounts. This is deliberate, and it is not laziness.

A tracking tag measures visitors. At this point in setup the site has no domain,
no visitors, and often is not deployed at all — so every tag you configure here
measures nothing, on an address that is about to change. What it does do is add
three vendor accounts, a privacy-policy dependency and a pile of unfamiliar words
to the longest conversation this agent will ever have with you.

The whole of what you say is one sentence, and only if it comes up naturally:

> "Once you're live on your own domain, ask me to set up your reporting — you'll
> get heatmaps of what people do on your pages, and a plain English report every
> Monday about what to change. Free, and it takes about twenty minutes."

Then move on. Do not describe it further and do not collect IDs "while we're
here" — an ID pasted today against a preview address is a thing you will have to
un-wire later.

**Nothing depends on this.** `site.config.ts` → `tracking` ships blank, and while
it is blank the site loads **no third-party script at all**. The launch gate is
happy: it only fails a site whose privacy policy omits a vendor that is actually
configured, so with nothing configured there is nothing to disclose. Leaving this
empty is a complete, passing, correct state — not an unfinished one.

**Which means Phase 7.1d writes the privacy policy naming only what is really
wired** — their CRM, the hosting, and the chat assistant if it has a key. Do not
name Meta, Google or Microsoft in a policy for a site that does not run them.
That is its own small untruth, and it is the kind the gate cannot catch.

**When it does belong:** after launch, on their own domain, once there is traffic
worth reading. The `reporting` skill owns all of it and holds their hand through
every screen. An agent with no visitors does not need a weekly report about no
visitors.

## Phase 6 — Spin up the site

```bash
npm install
npm run gate     # starts the site, runs every check, shuts down, reports in plain English
```

`npm run gate` replaces the old two-terminal dance. It boots the dev server itself,
runs the smoke test, schema validation, and the launch check, then tears down. One
command is one less thing for a non-technical owner to get wrong.

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

## Phase 7 — Content (the biggest phase — do not treat it as a handoff)

**Read this before you start it.** Every earlier phase collects information. This
phase is the one that produces the actual product. A site with a perfect config
and unwritten pages is not a partial success — to the agent looking at it, it is a
failure, because what they see is placeholder text where their business should be.

**The rule: you do not finish setup while a single page still renders a scaffold.**
Not "most pages." Not "the important ones." Every page the site generates.

### 7.1 — Import what they already have

Hand off to **`content-import`**: old blog posts become real posts in
`content/posts.ts`, interlinked to the money pages, with 301s captured if the old
URLs were live. Do this first — imported content shapes the voice for everything
written after it.

### 7.1b — Write `/process` BEFORE anything else

**This page comes first, and the order is not arbitrary.** Every seller-side page
on the site links into its six anchors, the `HowTo` schema lives here, and the
nav points at it. Writing it last means sixty pages spend the whole build
pointing at a scaffold.

It is also the page that decides how the rest of the site sounds, because it is
where the agent's actual method gets stated. Everything after it is that method
applied to a place or a situation.

- 2,000–2,800 words, six steps at 250–400 each.
- Fixed section ids, selling (E.P.I.C.): `overview` `equity` `presentation`
  `impact` `campaign`. Buying (`/process/buying`, R.E.A.L.): `overview` `ready`
  `educated` `aligned` `locked`. These are a contract with
  `components/editorial.tsx` and `lib/schema.ts`. Do not rename them.
- **The `market` step is the differentiator.** It is where "most agents list and
  wait, here is what we do instead" gets said concretely. Push the agent for
  specifics: what do they actually run, on what budget, to whom? Never write
  "maximum exposure" or any other word that cannot be counted.
- Ask what they genuinely do. If they do not run paid reach, do not write that
  they do. A smaller true claim beats an impressive false one, and this is the
  page a seller will quote back to them.

### 7.1c — Then write `/process/buying`, and confirm every step with them

Buyers get their own page and their own steps: `budget` `represent` `search`
`offer` `diligence` `financing` `closing`. **Never show a buyer the selling
track.** A first-time buyer handed a six step listing plan learns nothing about
what happens to them.

**This page has to be interviewed, not written from knowledge.** The buying
process varies by state far more than selling does, and the agent is the licensee
who carries the liability. Ask them directly:

> "A few on how buying actually works where you are, because it changes state to
> state and I would rather have yours than a generic version.
>
> - At closing, is there an attorney involved, or is it escrow and title?
> - What is the inspection window called here, and how long is it?
> - How much earnest money is typical, and who holds it?
> - What do buyers sign with you before you show them homes?"

One question at a time. Anything they are unsure of becomes
`[PLACEHOLDER: confirm with broker]` and an open item. **A plausible national
default is the failure mode**, because it will read as true and be wrong.

**On representation and compensation, write only what they confirm.** Never say
or imply a fee is standard, customary, or fixed. That is the exact language
antitrust cases turn on, and the gate warns on it. Read
`.claude/rules/legal-compliance.md` §5d before writing this section.

Close the page with the scope line: this describes their general process and is
not legal, tax, or lending advice.

### 7.1d — Privacy and Terms, written WITH them

Both pages ship as scaffolds and both block launch. They are not boilerplate and
you must not paste a generic policy in: an agent publishing a policy that
misdescribes where their clients' data goes is worse off than one with no policy.

**The split that makes this safe.** You know the technical facts because this
site was built here. State them as fact:

- The forms collect first name, last name, email, optional phone, an optional
  message, and whatever extra questions that form asks.
- Where a phone number is given, SMS consent and the exact wording shown are
  recorded with a timestamp.
- Submissions go to **GoHighLevel**. Hosting is **Vercel**. If the chat
  assistant is on, messages reach **Anthropic**. Rate limiting may use
  **Upstash**.
- **Name only what is actually wired.** Read `site.config.ts` rather than
  reciting a vendor list. During setup `tracking` is blank by design (5g), so
  **do not name Meta, Google or Microsoft** — a policy claiming a site shares
  data with companies it never contacts is its own small untruth, and the gate
  cannot catch that one because it only looks for the opposite mistake. The same
  goes for a CRM nobody connected and a chat assistant with no key set.
- **When tracking is added later**, the `reporting` skill rewrites this paragraph
  as part of its own setup and the launch check enforces it then. That is the
  right time, because that is when it becomes true.

They know the legal context. Ask, one at a time:

> "Four quick ones for your privacy page, and 'I'll check with my broker' is a
> perfectly good answer to any of them.
>
> - How long do you keep a lead in your CRM?
> - Do you send marketing email, or only reply to inquiries?
> - Does your brokerage have its own privacy policy this needs to match?
> - Which state's law governs your agreements?"

**Anything unconfirmed becomes `[PLACEHOLDER: confirm with broker]` and an open
item.** That is a better outcome than a confident guess, and the gate keeps
blocking until it is resolved.

**Do not tell them CCPA applies.** For an individual agent it almost never does.
**CalOPPA** is why the page is required and it has no revenue threshold. See
`.claude/rules/legal-compliance.md` §5.

**Say why this is not optional**, because it will feel like paperwork: every form
on their site already links to these pages in its consent text, and Meta and
Google will not run traffic to a page without a privacy policy. It is the
difference between being able to advertise and not.

### 7.2 — Write one page, then stop and show them

Pick the **highest-value page** (usually home, or their strongest service area).
Write it fully, to spec, through `realtor-content-writer`. Then show it and ask:

> "Here's the first real page. Before I write the rest in this same voice — does
> this sound like you? Anything that reads wrong, tell me now, because I'm about
> to write another sixty pages in whatever voice we agree on here."

**This checkpoint is mandatory.** Getting voice wrong once is a fix; getting it
wrong across the whole site is a rebuild. Wait for their answer.

### 7.3 — Write everything else, in batches, without stopping

Once the voice is approved, **keep going until the site is finished.** Do not ask
permission between pages. Do not ask whether they want you to continue. They
already said yes; asking again just makes a long job feel longer.

Enumerate the full page list first so nothing is missed:

```bash
npm run gate    # the scaffolded-page count in the output IS your worklist
```

Work in batches of roughly 5–8 pages, and after each batch say one line: what you
finished and what is left (*"That's the four Brentwood pages done — 38 to go."*).
That is enough to show progress without demanding anything of them.

Cover, at minimum:

- **`/process`** — first, per 7.1b. Every seller-side page links into it.
- **`/privacy`** and **`/terms`** — per 7.1d. Both block launch.
- **`/process/buying`** — second, per 7.1c. Every buyer-side page links into it.
- **Home**, **About**, **Contact**
- **One About page per team member** (`/team/<slug>`) — everyone, not just the
  lead. Real bio, real headshot, their own license and title. A team page listing
  four people that only has a real page for one reads worse than not listing them.
  Anyone missing a bio or photo goes on the open-items list and their page waits.
- **Every service area** and every neighborhood inside it
- **Every niche** — all of them, including the specialties, not just buy/sell
- **Every area × niche money page** the config generates
- **Blog** — at least the seeded posts, written for real

Word counts and structure come from `realtor-content-writer/content-model.md`.
Voice comes from `content/brand-voice.md`. Neither is optional.

### 7.4 — The finish line

**Look at the site before you say it is done.** Open it at 390, 768, 1100, 1440
and 1600, in both light and dark, and drive the interactive parts: open the
menu, hover a city, click Show all. `site-design-system` has the checklist and
what to look for. A passing gate means the HTML is right; it cannot see a nav
wrapping onto three lines or a button that disappeared into a photo.


`site-design-system` runs the gate. **Zero scaffolded pages, zero filler markers.**

If you are about to tell the agent setup is complete, run this first:

```bash
npm run gate
```

If it reports *any* page still showing the built-in outline, **you are not done** —
go back to 7.3. Reporting a site as finished while it renders placeholder text is
the single worst outcome this skill can produce, because it destroys the agent's
trust in everything else you told them.

### If you genuinely run out of room

Long content runs can hit a context limit. That is fine and expected — what is
not fine is stopping silently. Update `content/SETUP-PROGRESS.md` so its **Next**
line names the first unwritten page, tell them plainly which pages are still
outlines and that the next session picks up exactly there, and **never describe
the site as done.** Unwritten pages go in the progress file, not on the open-items
list: they are work still to do, not something waiting on the agent.

## Phase 7b — Write the open-items list (a real file, not a note)

**Write it to `content/OPEN-ITEMS.md`.** Both this skill and `listings-routine`
used to say "keep a written deferred list" without saying where, which is exactly
why it never existed. A list with no address is not a list.

Format — one row per item, so a later session can act on it without re-deriving
anything:

```markdown
# Open items

| Item | Why it matters | Asked on | Status |
|---|---|---|---|
| Office address unconfirmed | Map pin + Google match; two sources disagreed | 2026-07-31 | waiting on agent |
| Headshot — Jaynlin | Her About page can't publish without it | 2026-07-31 | waiting on agent |
| Google Business Profile URL | Feeds sameAs + settles NAP | 2026-07-31 | none found |
| IDX feed | Listings page shows only their own homes until wired | 2026-07-31 | deferred by agent |
```

**Every field left empty in Phase 2 or 3 goes here.** Not just what they said
"later" to — anything unconfirmed, unfound, or unanswered. An empty field that is
written down is a good outcome; an empty field nobody recorded is how a site stays
half-finished forever.

**How to raise it later** — as upside, never as a chore. `listings-routine` reads
this file at each recurring run:

> "Two things still open from setup that would help your search ranking — your
> Google Business Profile link and Jaynlin's headshot. Want to knock those out, or
> should I ask again next time?"

Mark an item **declined** when they say no, and stop asking. A deferral is a
decision to revisit; a decline is a decision. Both are answers — silence isn't.

### What can never be deferred: page content Phase 7 finishes. A page showing the
built-in outline is not a deferred item, it is unfinished work, and putting it on
this list instead of writing it is how an agent ends up with a site full of
placeholder text and a tidy note explaining why. If you are tempted to add a page
to this list, go write the page.

Deferrable: IDX, photos they don't have yet, socials, reviews, the domain, the
chat API key. Things that depend on **them** supplying something, not on you doing
work you could do now.

Agents say **"let's do that later"** constantly during setup — most often about
IDX, but also photos, socials, reviews, and the domain. Later never arrives unless
someone tracks it, which is what the file above is for.

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
