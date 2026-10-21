---
name: reporting
description: >-
  Set up and run the agent's measurement: their own Meta pixel, Google tag and
  Microsoft Clarity heatmaps, the conversion events that make a report worth
  reading, and the weekly report itself — what happened, whether last week's
  suggestions worked, and the two or three things to change next. Use when
  someone says "set up tracking", "add a pixel", "add heatmaps", "set up
  reporting", "how did my site do", "walk me through this week's report", "why
  aren't my ads working", or when the weekly report issue is opened.
# Deep judgement: a recommendation here sends an agent to spend time or ad money,
# and a number read wrong is worse than no number at all.
model: opus
---

# Reporting

Two jobs, and they arrive months apart. **Setting the measurement up**, usually
long after the site launched, from a nudge that says "there was an update". And
**reading it every week**, which is the part that changes anything.

## What this package actually is

| Piece | What it does | Cost |
|---|---|---|
| **Meta pixel** | Their Facebook and Instagram ads can see which visits and leads came from which ad | Free |
| **Google tag** | GA4 traffic, or Google Ads conversions, or both from one tag | Free |
| **Microsoft Clarity** | Heatmaps, scroll maps, session recordings, rage clicks and dead clicks | Free, no traffic limit, recordings kept 90 days |
| **Conversion events** | Form leads, phone taps, email taps, directions taps, guide opens | Free |
| **The weekly job** | Collects the numbers into `content/reports/<date>.json` and opens an issue | Free |
| **The report** | What you write from those numbers, weekly | — |

All of it is **the agent's own accounts**. Nothing reports to KMC.

## The first question, every time

**"Do you run ads, or want to know what your site is doing?"** An agent who does
neither needs none of this, and a site with no IDs configured loads no
third-party script at all. Do not talk somebody into measurement they will never
open.

---

## Setting it up

**Read this before you start, because it changes how the whole walkthrough goes.**

You are almost certainly talking to somebody who has never opened Events Manager
and does not know what a pixel is. They do not have to learn. **Your job is to do
every part that can be done from here, and to make the three or four parts only
they can do take one click each.**

### The six rules of this walkthrough

1. **When they ask what something is, the answer is the whole next reply.**
   Nothing goes before it — not a question, not a next step, not a thing you need
   from them — and **no new term enters that reply unexplained.** In testing, an
   agent asked "what is a pixel?" and got back three sentences about GitHub
   accounts, running commands, and approving a prompt, and never got told what a
   pixel is. She had to ask twice. That one turn costs more than the rest of the
   setup put together, because after it she is guessing at your words as well as
   at theirs. Answer, then continue.
2. **One screen at a time.** Never hand them a list of three things to go and
   fetch. Ask for one thing, wait, wire it, confirm it, then ask for the next.
   A list of three produces zero.

   **The one allowed pair is a delegation plus one live step**, because the
   delegation is only sending a message and then waiting on somebody else:
   *"forward that to Rob — and while he's getting back to you, let's do the
   Clarity one, it takes two minutes."* **The step they do themselves is always
   Clarity**, and it is the one you name first. Forwarding a message is not a win
   they can see; a live recording of their own site is.

   **Never ask them to do something you cannot see them do** — if the next move
   depends on a permission prompt or a button in their Claude window, and they
   say they cannot find it, take the other route rather than describing the
   button again.
3. **Never ask them to identify anything.** Do not say "find your pixel ID" and
   expect an ID back. Say: *"whatever is on that screen, send it to me — the
   whole code snippet, the whole web address, or a screenshot. I'll pick out the
   bit I need."* Then do exactly that. This one rule removes most of the failure.
4. **Never ask them to paste code into anything.** Every vendor ends its setup by
   offering a snippet for the site's `<head>`. That screen is where non-technical
   people stop. Say, before they get there: *"it's going to offer you some code —
   ignore it completely, your site doesn't need it."*
5. **Confirm after every single step**, out loud, in their words: *"that's in and
   working — Facebook can now see your visitors."* An unconfirmed step feels
   unfinished and they go back and do it twice. **Run
   `npm run launch:check -- --tracking-only` after each ID you wire**, before you
   say it is in. Saving a value to a file is not evidence that it works — a
   pasted ID with a stray space loads nothing at all while everybody believes it
   is running, and that check is the only thing that catches it. If you have not
   run it, say "saved" rather than "working".
6. **Every step has a way out.** If they are stuck, the answer is never "try
   again". It is *"send it to whoever runs your ads"* (templates below), or
   *"skip it, here's exactly what you lose, we can add it any time."* Nothing
   here is a prerequisite for anything except itself.

### What you cannot do for them, and why — say this once, up front

Be straight about this at the start so it never feels like you are being lazy:

> "Three of these live inside your own Facebook and Google accounts. I can't sign
> in as you — those companies only let their own approved apps do that, and this
> isn't one. So for each one I'll tell you exactly which screen to open, and you
> send me whatever you see. That's the whole of your job."

Then do the work. **Do not narrate clicks you could have avoided asking for.**

**Two things not to promise while you are selling the idea.**

- **Never offer output the pipes cannot yet produce.** "I can pull your numbers
  any time you ask" is false on day one: there is no Clarity history, no token,
  and often no CRM connection. Say what is true — *"once this has been running a
  week or two, there will be something worth reading"* — because the first time
  they ask and get nothing, they stop asking.
- **Stay in the job they came for.** A tracking setup surfaces other things that
  are wrong — a CRM that was never connected, a site with no domain. Say each one
  **once**, then get back to what they asked for. In testing a session pushed the
  CRM three turns running; it was a fair point and it still read as a sales pitch
  from someone who had been asked to do something else.

### The order, and why

Do them in this order and stop wherever they run out of steam. Each one is
useful on its own and none of them depends on the next.

| Order | Piece | Why here |
|---|---|---|
| 1 | **Clarity** | No ads needed, no existing account, useful the same day. It is the easiest possible first win and it teaches them that this works. |
| 2 | **Meta pixel** | Only if they run Facebook or Instagram ads. Usually already exists. |
| 3 | **Google tag** | Only if they run Google ads or want traffic numbers. |
| 4 | **Google Ads conversion** | Only if they run Google ads. This is the hardest step — it is last for a reason. |
| 5 | **Privacy policy** | Required the moment any of the above is live. You write it. |
| 6 | **The weekly job** | Tokens and GitHub. Can be done weeks later. |

---

### Step 1 — Clarity (start here, always)

Free forever, no traffic limit, no ad account needed. It answers the question an
agent actually has: *what do people do on my page?*

**What to say:**

> "First one is the easiest and it's the one you'll actually enjoy. It records
> what visitors do on your site — where they scroll, where they click, where they
> get stuck — and it plays it back like security-camera footage. It's free from
> Microsoft, permanently, with no limit. Takes about two minutes."

**The exact path — give them one line at a time:**

1. Go to **clarity.microsoft.com** and click **Sign up**. They can use a
   Microsoft, Google, or Facebook login — whichever they already have.
2. On the **Projects** screen, click **New project**. It asks for a name and
   their website address. Name: their business name. Website: their domain (or
   the Vercel address if the domain isn't live yet).
3. **Warn them before it happens:** "The next screen offers you three ways to
   install it and some code to copy. Ignore all of it. Close it. Your site
   already knows how to load this from the ID alone."
4. Go to **Settings → Overview**. The **Project ID** is there — a short string of
   letters and numbers.
5. **"Send me whatever's on that screen."**

**Then you:** put it in `site.config.ts` → `tracking.clarityProjectId`. Run the
site, load a page, and tell them to refresh Clarity — **live sessions appear
within about a minute**, so they can see it working immediately. That first
confirmation does more for the rest of the setup than anything else you say.

**If they get stuck:** the sign-up is the only part that needs them. If Clarity
refuses their login, skip it and come back — nothing else here depends on it.

**Two things to tell them plainly**, because both surprise people later:

- **Recordings are kept 90 days.** Watch what matters now; it does not pile up.
- **Clarity masks what visitors type by default**, and this site never turns that
  off. It records behaviour, not personal details. Microsoft also says not to use
  Clarity on sites aimed at under-18s.

---

### Step 2 — The Meta pixel (only if they advertise on Facebook or Instagram)

**Ask first, in plain words:** *"Do you run any ads on Facebook or Instagram —
yourself, or through someone?"* If no, skip the whole step and say why: the pixel
does nothing useful without ads running.

**The rule that matters most here: get the pixel they already have. Never make a
new one.** Most agents who advertise already have one — an assistant or a past
agency created it, and it holds the history their ad account optimises against.
A second pixel splits that history and quietly makes their ads worse. So the
first question is never "let's create a pixel", it is:

> "Who runs your Facebook ads — you, or someone else?"

**If someone else runs them, stop and delegate.** Send them this to forward, word
for word:

> Hi — I'm setting up tracking on my new website. Could you send me the **Dataset
> ID** (it used to be called the Pixel ID) for the pixel we already use on my ads?
> It's in Events Manager under Data Sources — it's a 15- or 16-digit number.
>
> **Please don't create a new one**, and there's no code to install anywhere —
> my website only needs the number.

That last line matters. Without it, a helpful assistant tries to install a
snippet on a site they cannot access, and the whole thing stalls for a week.

**If they run the ads themselves, the exact path:**

1. Go to **business.facebook.com/events_manager**.
2. In the left sidebar, click **Data sources**.
3. Their pixel is in the list. **Tell them about the rename before they look:**
   "Facebook renamed this recently — what used to be called a Pixel ID now says
   **Dataset ID**. Same thing. It's a long number, 15 or 16 digits."
4. **"Send me whatever's on that screen — the number, or a screenshot of the
   list, or the whole web address from the top of the browser. I'll find it."**
   The URL itself usually contains the ID, which is why a screenshot or a pasted
   address is enough. Never make them decide which number is the right one.

**If the list is empty**, they genuinely have no pixel. Only then create one:
Data sources → **Connect data** → **Web** → name it their business name → and
when it offers installation instructions, **skip them entirely**; come back for
the Dataset ID.

**Then you:** `site.config.ts` → `tracking.metaPixelId`, confirm the shape (digits
only, 15–16 of them), and say what it now does in their language: *"Facebook can
see visits to your site now, so your ads can find more people like the ones who
come."*

**If they get stuck:** skip it. Say exactly what it costs — *"your Facebook ads
won't be able to tell which ones produced leads"* — and move on. It can be added
in thirty seconds any time.

---

### Step 3 — The Google tag (traffic numbers, or Google Ads)

**Ask:** *"Do you run Google ads, or has anyone ever set up Google Analytics for
you?"* If both are no, skip it — Clarity already tells them more about their own
site than Analytics will.

Two different IDs can go in this field, and it matters which they have:

| Looks like | It is | Gives them |
|---|---|---|
| `G-XXXXXXXXXX` | Google **Analytics** (GA4) | Traffic, sources, which pages get read |
| `AW-123456789` | Google **Ads** | Ads conversion tracking |

Either one goes in `tracking.googleTagId`. **If they have both, use the `G-` one**
and handle Ads through step 4 — one tag serves both.

**The exact path for the Analytics ID:**

1. Go to **analytics.google.com**.
2. Bottom-left **Admin** (the gear).
3. **Data collection and modification → Data streams**.
4. Click the **Web** stream — usually the only row.
5. The **Measurement ID** is in the first row of the panel that opens, top right.
6. **"Send me whatever that panel says."**

**The permission trap, worth warning about first:** viewing that screen needs
Editor access to the Analytics account. If somebody set Analytics up *for* them,
they may only have Viewer, and the Data streams screen will be missing. That is
not them doing it wrong. When it happens, delegate:

> Hi — could you send me the **Measurement ID** for my website's Google Analytics?
> It's in Admin → Data collection and modification → Data streams → click the web
> stream → it starts with **G-**. (Or add me as an Editor and I'll get it myself.)
> Nothing needs to be installed on the site.

**A warning to give them when an old Analytics account turns up:** a tag somebody
set up years ago may have been watching a site that no longer exists. Worth one
sentence: *"the numbers in there may be from your old site — we'll start clean
from today."*

---

### Step 4 — The Google Ads conversion (the hard one — expect to delegate)

**Only if they run Google Ads.** Skip entirely otherwise.

This is where beginners abandon, so handle it differently from the others:
**assume it goes to whoever runs their ads, and treat them doing it themselves as
the bonus case.**

**Why it cannot be skipped if they run Ads** — say this, because it is the whole
reason to bother:

> "Google Analytics counts a lead the moment the tag is on your page. Google
> **Ads** does not — it has to be told separately. If we skip this, everything
> works, real leads come in, and your Ads account still says zero conversions.
> That's the trap: people turn off ads that were actually working."

**Two ways to do it. Prefer the second if they already have GA4.**

**Option A — the conversion label.** The exact path:

1. **ads.google.com** → **Goals** → **Conversions** → **Summary**.
2. Click the conversion action for leads. (If the list is empty, one has to be
   created first — that is a genuine ads-manager job, delegate it.)
3. Open **Tag setup**.
4. **The trick that saves this step:** choose **"Use Google Tag Manager"**. They
   do not have Tag Manager and are not going to install it — but it is the only
   screen that *displays* the Conversion ID and Conversion label as plain text
   instead of burying them in a code snippet. Say so: *"pick the Tag Manager
   option even though you don't use it — it's the one screen that shows the two
   numbers in readable form."*
5. It shows a **Conversion ID** (`AW-123456789`) and a **Conversion label**
   (`AbC-D_efGh`).
6. **"Send me both, or a screenshot of that screen."**

**Then you:** join them with a slash — `AW-123456789/AbC-D_efGh` — and put the
whole string in `tracking.googleAdsConversion`. Never ask them to join it.

**Option B — import it from Analytics.** Ads → **Goals** → **Conversions** →
**New** → **Import** → **Google Analytics 4** → pick `generate_lead`. Cleaner when
they already have GA4, and it keeps one source of truth. It takes a few hours to
start showing, and this repo has not verified the screen, so walk it with them
rather than asserting each click.

**Do one of the two. Skipping both is the quiet failure.**

**The delegation message**, which is the likeliest path:

> Hi — my new website is live and sending lead events to Google. Could you send me
> the **Conversion ID and Conversion label** for our lead conversion action?
>
> Google Ads → Goals → Conversions → Summary → click the lead action → Tag setup →
> choose "Use Google Tag Manager" — that's the one view that shows both values as
> plain text, it isn't asking you to set Tag Manager up. It looks like **AW-123456789** and **AbC-D_efGh**.
>
> Nothing needs installing on the website — it already sends the event and only
> needs to know which conversion to attach it to.

**If nobody can produce it:** say plainly what they lose — *"your Google Ads
account won't count your leads, so judge those ads on the leads in your CRM, not
on the Ads dashboard, until we get this"* — and leave it open. Do not leave them
thinking it is done.

**Every lead carries where it came from, regardless.** `lib/attribution.ts` records
the campaign tags and the ad platforms' click IDs on the first page of a session,
and `/api/lead` writes them into the contact's source line and timeline. So the
CRM answers "which advert produced this person?" without anyone opening an ad
dashboard. Tell them to leave the platforms' own link tagging on (Meta's is on by
default; Google's autotagging supplies `gclid`) and the rest happens by itself.

---

### Step 5 — The privacy policy (you write it, the same session)

**The moment any tag is live, the site's privacy policy has to name every company
receiving visitor data — Meta, Google, Microsoft.** `npm run launch:check` fails a
launched site whose policy does not, and Meta and Google will not run ads to a
page without a policy at all.

Do not leave this for later and do not make them write it. Write it with them
there and then (setup 7.1d), ask the handful of questions it genuinely needs, and
have them read it before it ships. Tell them plainly it is a solid standard policy
and not a substitute for their broker's compliance officer.

**Name only what is actually wired.** Read the config rather than reciting the
vendor list: a policy that names a CRM nobody connected, or a chat assistant with
no key set, is as wrong as one that omits a live tag.

**A privacy policy is disclosure, not consent** — and if they ask whether their
visitors agreed to being recorded, say so rather than reaching for "it's normal
and legal". If Clarity is on, this is also where the three Clarity facts belong,
including the one that gets forgotten: **Microsoft says not to use Clarity on
sites aimed at under-18s.** For a real-estate site that is almost never a
problem, which is exactly why nobody remembers to check.

---

### Step 6 — The weekly job (can wait weeks; say so)

**Check the site is on GitHub first.** The job runs there, so a folder with no
remote gets no Monday report however well the rest is configured. If there is no
remote yet, say so plainly and set the expectation: the numbers can still be
collected on demand with `npm run report`, and the Monday routine starts working
the day the site is pushed. Promising a weekly report that cannot arrive is worse
than saying "not yet".

`.github/workflows/report.yml` runs every Monday whether or not their computer is
on. It needs two optional tokens. **Both are real secrets — never accept either in
chat, never put them in `site.config.ts`, never commit them.** Set them yourself
once the values exist:

```bash
gh secret set CLARITY_API_TOKEN     # paste when prompted
gh secret set GHL_API_TOKEN         # the same token the contact form uses
```

| Token | Where they get it | Without it |
|---|---|---|
| `CLARITY_API_TOKEN` | Clarity → **Settings → Data Export → Generate new API token** | "Clarity unavailable — no token set" |
| `GHL_API_TOKEN` | GoHighLevel → **Settings → Private Integrations → Create** (View/Edit Contacts, View/Edit Custom Fields) | "Leads unavailable — no token set" |

**If their `main` branch is protected**, the job cannot commit the numbers file.
That is handled — it warns and carries on, and the figures are in the issue — but
it means there is no history to compare against next week. Either let the job
push, or paste the figures into `content/reports/<date>.json` yourself when you
write the report, because the week-on-week comparison is the part that makes this
worth doing.

---

### Prove it works before you say it works

Never tell an agent tracking is live on the strength of having edited a config
file. Run these.

- **`npm run launch:check -- --tracking-only`** — the fastest check, and it runs
  in CI before launch too. It fails if an ID is the wrong shape (a value pasted
  with a space, or a whole dashboard URL, loads nothing at all while the agent
  believes it is working), if an Ads conversion has no Google tag to send it, or
  if the privacy policy names none of the vendors now running.
- **Open the site and confirm in the browser** that `window.fbq` and
  `window.gtag` exist, and that submitting the contact form fires exactly one
  lead event per platform.
- **Clarity shows live sessions within a minute** of the first visit — load the
  site and look. This is the one an agent can see for themselves, so show them.
- `npm run report` — it prints the week's figures. Every source that could not be
  read says so, with the reason. **A missing number must never read as zero.**
- **The lead count is the one to verify by hand.** This repo has verified
  GoHighLevel's contact create, read and delete; the search call the report uses
  to count new contacts is not verified here. Run `npm run report` with the token
  set and confirm the number matches what they see in GoHighLevel. If it errors,
  say so and record what did work — do not leave a report that quietly reports
  no leads forever.

### Close by telling them what is done and what is still open

End every setup session with two short lists in their language: what is now
watching (and what each one gives them), and what is still missing (and exactly
what that costs). Anything delegated goes on `content/OPEN-ITEMS.md` with who was
asked, so the next session can pick it up instead of starting over.

**Then go back and correct `content/OPEN-ITEMS.md` for anything you cleared in
this same session.** In testing, a session wrote "privacy policy is unwritten"
and "Clarity — ID received, not yet installed, held until the policy is written",
then did both things later in the same conversation and never touched the file.
The handoff note then told the next session that tracking was off and the policy
missing, both false. A stale open-items file is worse than none, because it is
believed.

**The "what's left" list has to be complete, and the privacy policy is the one
that gets dropped.** In testing, a session correctly called the policy a hard
blocker — *"the site has a built-in check that will refuse to publish until it's
written"* — and then left it out of the closing summary five turns later,
because by then the conversation had moved on to ad IDs. Build the list from the
six steps above, in order, and say what each missing one costs. A blocker you
mentioned once and never again is a blocker they will meet at the worst moment.

**And say it once.** If they have said they have had enough, do not close by
pitching the next project — not building the site, not the steps they skipped.
Name the phrase that reopens this (*"say 'let's finish my tracking'"*), and stop.
A session that ends with five nudges reads as pressure, and the project rule is
the same everywhere: mention it once, then drop it.

---

## Reading it, weekly

The job collects; **you write the report.** Read the newest
`content/reports/<date>.json` and the previous report's markdown, then write
`content/reports/<date>.md` and give them the short version in chat.

### The shape, in this order

1. **Last week's suggestions, graded.** Name each one, say whether it was done,
   and what the numbers did after. This is the loop, and it is the reason the
   report is worth reading at all. Nothing done? Say so plainly, once, without
   scolding.
2. **What happened.** Leads, traffic, the pages people actually read, where they
   came from. Numbers with the period attached: Clarity covers the **last three
   days**, not the week — never present it as a week.
3. **What it means.** Two or three sentences. A page with traffic and no leads is
   a different problem from a page with no traffic.
4. **What to change next: at most three things**, each tied to a number in this
   report, each small enough to do in a week, and each something Claude can do
   with them now if they say yes.

### When the numbers and the site disagree, still write the report

**Never withhold the report to ask a question first.** In testing, the figures
described a live site while the config was still half-built, and the session
stopped, asked which site the numbers belonged to, and wrote nothing. The agent
asked for their report and got a query — and the discrepancy was worth one line,
not the whole answer.

So: **write the report from the numbers you have**, put the mismatch at the top
in one sentence ("these figures look like they came from a different site than
this folder — worth checking before you act on them"), and carry on. A report
that flags a doubt is more useful than no report.

Two related habits:

- **Don't audit the site to write a weekly report.** Read the newest JSON and
  the previous report, and stop. Reading half the repo to reconcile a number
  turns a two-minute routine into an expensive investigation, and the number was
  never going to be settled from inside the folder anyway.
- **Never spend a recommendation on bookkeeping.** "Work out where these files
  came from" is not one of the three things that will get them more business.
  Say it as a caveat, and keep the three for changes to the site.

### Rules that keep it honest

- **Never invent a number, and never turn an unavailable source into a zero.**
  "Leads unavailable — the GoHighLevel token expired" is a useful sentence.
  "0 leads" when the token expired is a lie that changes what they do next.
- **Small numbers are noise.** Under about 100 sessions or 5 leads, say the
  sample is too small to conclude anything, and suggest the one thing that would
  grow it. Agents make expensive decisions on four data points.
- **Never claim a cause you cannot see.** Traffic went up the week they posted a
  reel — that is a coincidence worth testing, not a finding.
- **Rage clicks and dead clicks are the most actionable thing Clarity gives you.**
  They point at a specific element on a specific page: something that looks
  clickable and is not, usually. Fix it the same day, and grade it next week.
- **Compare like with like.** Week against week, not against a month.
- **No jargon.** Not "bounce rate" — "people who left from the page they landed
  on without going anywhere else".

### When a number is missing every week

Fix the plumbing rather than writing around it. A report whose leads section has
said "unavailable" three weeks running is not a report; it is a broken pipe
nobody is looking at.

## Google Analytics

Its API needs service-account credentials that a non-technical agent will not
set up, so the weekly job does not read GA4, and no report should pretend it did.
When their GA numbers matter, **walk the dashboard with them** — ask them to open
Reports → Engagement → Pages, read out the top rows, and interpret it with them.
If they are technical enough to want the API wired up, that is a real project and
it belongs in its own conversation.

## Hard rules

- **Never enable tracking nobody asked for**, and never put a KMC-owned tag on an
  agent's site.
- **Never put personal data in an event** — see `lib/tracking.ts`.
- **Never let a site launch with a tag its privacy policy does not name.** The
  gate enforces it; do not argue with it.
- **Never present three days of Clarity data as a week.**
- **Never recommend more than three things.** A list of ten is a list nobody
  does.
