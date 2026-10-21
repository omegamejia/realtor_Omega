# How the daily article works

**What it is in one sentence:** every site built from this package writes,
fact-checks and publishes one new blog article a day, on its own, and tells the
owner when it cannot.

This document is the full mechanical description — what runs, in what order,
what each step refuses to let through, what it costs, and why it runs where it
runs. It assumes no prior knowledge of the codebase.

---

## 1. The shape of it

Seven steps, in order. Each one can stop the whole thing, and stopping is always
preferred to publishing something wrong.

```
 1. Pick a question nobody has answered yet        ← the topic gate
 2. Research it and write it                       ← one model call, web search on
 3. Check its own facts                            ← a second, separate model call
 4. Check it against the rules                     ← ~30 blocking checks, no warnings
 5. Check it is not a near-copy of an existing post ← the duplicate gate
 6. Build the whole website with it included        ← proves nothing broke
 7. Save it, publish it, then confirm a stranger can read it
```

Steps 1 and 5 are two different duplicate checks and both are needed. Step 7's
last clause is the one most publishing systems leave out, and leaving it out is
what let a real site go thirteen days committing articles nobody could read.

---

## 2. Picking the topic

### Where the questions come from

Every site has a **question bank** — a plain list of things its customers
actually ask. On a real-estate site that is `content/question-bank.json`, moving
to `content/questions.ts`, which is the better home because the same list also
feeds the FAQ sections, the FAQ structured data, the website chat widget and the
AI phone assistant. One list, five consumers, so they can never disagree.

The best source for that list is the owner's own phone. Someone who has sold
houses for eleven years can recite the forty things people ask every week
without thinking, and that beats keyword research because they are *reporting*
rather than guessing.

### The topic gate

Each question is written about **once, ever**. Before writing, the system
compares the candidate question against the title and summary of every post the
site already has, using word-overlap scoring (the higher of Jaccard similarity
and containment).

- Score **below 0.42** → considered a genuinely new subject, allowed through
- Score **0.42 or above** → skipped

0.42 was not chosen by taste. Below it, genuinely different questions about the
same town start colliding — *"what Brentwood costs"* and *"why Brentwood is
expensive"* score about 0.45 and really are the same article. Above it,
paraphrases slip through.

Of the remaining candidates, **the one furthest from anything already published
wins**. Questions too vague to write from (fewer than three meaningful words) are
discarded.

Some subjects are refused outright before a word is written. On a real-estate
site that is the mechanics of the transaction — commissions, buyer agreements,
closing costs, escrow, contingencies — because those vary by state and are the
licensed agent's to describe, not a writer's. On a site that might be a clinic,
it is anything clinical.

### When the bank runs out

Each question is used once, so the bank depletes. A bank smaller than
`articles-per-day × 45` runs dry inside a month. **Running dry is not an error
and is deliberately not reported as one** — it is the bank needing more
questions, and the message says exactly that, because telling an owner their
system is broken when it is working is how you lose their trust in it.

---

## 3. Writing it

### One call, research and writing together

A single request to **Claude Opus 5.5** with **web search enabled**, up to six
searches, at high reasoning effort. Research and drafting happen in the same
call rather than as two steps, because a writer that has just read the sources
writes from them more faithfully than one handed a summary.

### Structured output, not prose parsing

This matters more than it sounds. The model does not return an article as text
for us to parse. It returns the **exact data structure the website renders**,
enforced by a JSON schema on the request: slug, title, meta title, meta
description, the city, reading time, excerpt, primary keyword, secondary
keywords, the sections, the related links.

Asking for markdown and parsing it back is where unattended writers break. One
unexpected heading and the parser produces a malformed post, and there is nobody
watching. With a schema, a response that does not fit the website's shape cannot
be returned at all.

### The rules the writer is given

Stated as hard rules in the instructions, with the explicit note that the post
publishes **without a human reading it first**:

1. **Never state a statistic, price, percentage, date or market figure unless it
   was found by web search in this conversation and the source can be named
   inside the sentence.** If it cannot be sourced, write the sentence without
   the number. *A vaguer true sentence always beats a precise invented one.*
2. Never write about the mechanics of the transaction (real estate), or give
   clinical, legal or financial advice (service businesses).
3. **Fair Housing** (real estate): describe the property and the place, never
   the people who live there or who would "fit". Banned outright: *great for
   families*, *family-friendly*, *safe neighborhood*, *good schools*,
   *exclusive*, *ideal for young professionals*.
4. No em dashes. American spelling. Every sentence has a subject and a verb.

Plus structure: 900–1,400 words, the town named in the title and the first
paragraph, the first mention of the business linked to the home page, at least
two links to pages that actually sell something, and a closing call to action.

**Voice:** if the site has a `content/brand-voice.md` that has actually been
filled in, it is passed through verbatim so the writing sounds like the owner.
If it is still a scaffold, it is ignored rather than used — a template voice is
worse than a neutral one.

The writer is also handed the titles of up to 40 existing posts and told to pick
a genuinely different angle.

### Then it checks its own work — in a separate call

The draft goes to a **second, independent model call** with web search on, asked
to do one thing: find every claim a reader could check, search for it, and report
only the ones it **could not verify or found to be wrong**.

Separate on purpose. A model checking its own output in the same breath tends to
agree with itself.

If anything comes back unverified, **the article is held back, not edited**. A
wrong number quietly replaced by a different wrong number is worse than a post
that did not publish.

---

## 4. The checks, every one of which blocks

About thirty checks. **There are no warnings.** A warning in an unattended
pipeline is a thing that scrolls past.

| Group | What it refuses |
|---|---|
| **Length** | under 900 words, or over 1,600 |
| **Sourcing** | any placeholder text, any `[bracketed]` marker that survived |
| **Advertising claims (FTC)** | nine shapes: *#1 in town*, *voted best*, *guaranteed*, *100% satisfaction*, *cheapest*, *risk-free*, health-outcome claims, absolutes about outcomes. A specific sourced figure passes; the claim shape does not |
| **Fair Housing** (real estate only) | eight steering patterns, matching the launch gate exactly |
| **HIPAA / clinical** (service sites only) | diagnosing, prescribing, side effects, customer stories with identifying detail |
| **Transaction** (real estate only) | commissions as a fee, buyer agreements, closing costs, escrow |
| **Links** | no link home, no call to action, fewer than three internal links, more than four outbound |
| **Place** | the town missing from the title or body, where the business is local |
| **Markup** | headings in the wrong place for that site's template, inline styles or CSS classes |
| **House voice** | em dashes |

Two notes on how these are written, because both were learned the hard way:

**A word is not a claim; a word in context is.** Three separate times a
reasonable-looking pattern held back a good article. `commission` caught *"the
Planning Commission voted"*. `diagnose` caught *"a plumber will diagnose the
leak"*. Each fix was the same: put the context into the pattern, and strip proper
nouns before looking for the common noun.

**Not every ambiguity resolves toward permitting.** *"Our warranty is
guaranteed"* reads innocent, but the writer cannot know whether the business
offers a warranty, so holding it for a human is correct. The test is not "does
this sentence sound fine" but "could the writer possibly know this".

### The second duplicate gate

Step 1 compared a *question* to a *title*. It cannot see text that does not
exist yet. So after writing, the finished article's full body is compared against
the full body of every existing post, and anything scoring **0.55 or above** is
held back.

This is the gate that catches a genuinely different question that produced
genuinely the same article — the failure that builds a doorway-page site one
honest-looking day at a time. 0.55 matches the launch gate's own threshold, so an
article that passes today is not flagged by the site's own checks tomorrow.

---

## 5. Where it goes

### Its own file, which the machine owns

The article is appended to **`content/posts-generated.json`**. That file belongs
entirely to the automated job. Hand-written posts live in `content/posts.ts`,
where people edit them. The two merge into one list that every part of the site
reads.

**The merge happens at the single source, not further down**, and that detail is
load-bearing. On a live site the merge was done inside the sorted accessor while
the function that renders an individual post read the raw list — so a generated
article appeared on the blog index and its own page returned 404. The title card
still returned an image from a fallback, which made it look like it was working.

### What the website does with it

Nothing special, which is the point. A generated post is an ordinary post:

- its own page at `/blog/<slug>`
- listed on `/blog`, newest first
- a generated share image for social and search, built from the title
- `BlogPosting` structured data, produced from the post's own fields by
  `lib/schema.ts` — **never hand-written**, so it can never disagree with the
  visible page
- a canonical URL, a sitemap entry, and links into the pages that sell

---

## 6. How it actually gets posted, every day

This is the part worth the most attention, because it is where automated
publishing usually fails quietly.

### Where it runs

**On GitHub's servers, on a schedule, not on anybody's computer.**

```
.github/workflows/daily-article.yml     cron: 0 13 * * *
```

One setting controls volume: a repository variable `ARTICLE_COUNT`, **default 1**.

One thing turns the whole system on: the site owner's Anthropic API key, kept in
**Doppler** (a free secrets manager) and synced into GitHub automatically. The
same key runs the website's chat widget, so it is one key and one bill, not two.
With no key, the job does not fail silently — it opens a single issue on the
repository explaining what to do, and does not open it again while it is still
open.

### The sequence, and what each guard is for

1. **Is the key wired up?** No key → one issue, then stop. A job that cannot
   work should say why once, not retry into the void for sixty days until GitHub
   disables the schedule for inactivity.
2. **Write the article** (everything in sections 2–4 above).
3. **Does the site still build?** The entire website is built with the new
   article included. **If the build fails, nothing is committed.** This is
   non-negotiable: without it, a malformed article lands, the deploy fails, and
   the site is down until a person happens to look. This guard has already
   earned itself once — a perfectly good article was written and the build step
   failed, and publishing was correctly skipped.
4. **Save it.** A commit named `post: 2026-10-12`, authored by the job, with the
   undo instruction in the commit message (`git revert HEAD`).
5. **Get it onto the website.** Three routes, in order of how little setup they
   need: the host watching the repository (most sites — nothing to configure), a
   deploy hook, or a direct publish with a token. The second and third exist
   because a publisher that depends on something outside itself has to be able
   to finish the job when that something stops.
6. **Confirm a stranger can read it.** The job fetches the article from the
   site's real public address and checks the content is on the page. **A 200 is
   not proof** — a catch-all route, a custom 404 page and a stale cached index
   all answer 200.
7. **If anything failed, say so in plain language**, as an issue on the
   repository, which emails the owner.

### Why step 6 exists

A real site ran this pipeline correctly every morning for thirteen days: topic
chosen, article written, claims sourced, checks passed, build proven, commit
made. Its web host had quietly lost its link to the repository days earlier.
**Twelve commits accumulated and the website never changed, and every single
check was green**, because every check asked whether the article was good and
none asked whether anybody could read it.

A commit is not a publication.

The failure message also distinguishes the two causes, because they look
identical from outside — both are a 404 on the article — and need opposite
fixes. Before blaming the deploy it fetches the home page: if that address is
serving a *different website*, the problem is the domain, not the deploy. On the
site this was built for, that was exactly the case.

### What it costs

Measured on real runs, not estimated. Opus 5.5 at $4 per million input tokens
and $20 per million output. A typical article: about 47,000–66,000 tokens in
(most of it web search results), 5,500–7,500 out.

| Rate | Per article | Per month |
|---|---|---|
| 1/day | ~$0.34 | **~$10–11** |
| 3/day | ~$0.34 | **~$31–34** |
| 5/day | ~$0.34 | **~$51–56** |

This is **Anthropic API credit, which is not the same as a Claude subscription.**
A Claude Pro plan includes none of it. Max plans include a monthly credit
allowance that a one-a-day site sits comfortably inside.

### Why it ships at one a day

It can do five. On a new site it should not, and the reason is worth saying out
loud rather than just refusing: five a day is 150 articles by Christmas, and the
pages that actually sell — the town pages, the seller pages — get buried
underneath. Search engines have a name for a site that is 90% blog posts and it
is not a flattering one. The sensible ladder is one a day for the first month or
two, two or three once the money pages are ranking and the bank holds 60+
questions, five only with real traffic and a reason.

### One more detail: it runs one at a time, deliberately

Both duplicate gates re-read the generated-posts file on every pass, and the loop
writes that file at the end of each one. So when five articles are requested,
article five is checked against articles one through four **from the same run**.
Running them in parallel would look like an obvious speedup and would silently
defeat both gates: each article would check against the same stale snapshot,
each would correctly avoid yesterday's posts, and nothing would stop them being
near-copies of each other. Five sequentially takes about seven minutes against a
six-hour limit, so there is nothing to win.

---

## 7. Why GitHub rather than a Claude routine

Both approaches are real and we use both. For *this* job GitHub is correct, and
the reasons are specific rather than ideological.

### A scheduled routine on a laptop does not run

This is measured, not assumed. A daily routine on a real machine, scheduled since
early September:

```
7 runs in ~40 scheduled days  =  17.5% delivery
  5 succeeded
  1 killed mid-run (the machine slept)
  1 still "running" 38 hours later, blocking every run after it
```

The laptop was shut, or asleep, or the process was killed, or a hung run blocked
the next one. **A schedule that depends on a computer being awake is not a
schedule, it is a hope.**

GitHub's servers have no such dependency. Its scheduled runs are *late* — we
measured 5 to 8 hours past the requested time, because free scheduled jobs queue
behind paid work — but they **arrive**, which for a blog post is the only
property that matters. Nobody cares what minute an article appears.

### The job's output is a commit, and a commit needs the repository

The article must land in the website's files for the site to rebuild and publish.
GitHub Actions already has those files checked out with permission to write them.
Any other scheduler has to reach *back into* GitHub to do the same thing, with
its own credential, stored in a second place.

### The build-before-publish guard needs a real build

Step 3 builds the entire website before anything is committed. That needs a full
build environment, not a short-lived function. **It is the single most valuable
guard in the pipeline and it exists because of where the job runs.**

### Everything is auditable afterwards

The script is a file in the repository, reviewed through a pull request, with its
history. Every run keeps a log. Every failure is an issue that emails the owner.
A routine's instructions are a prompt, which is harder to review and harder to
diff.

### Fewest moving parts for the person who owns it

For the site owner this is: **one scheduler** (GitHub, which they already have
because their website's files live there), **one secret** (the Anthropic key,
which also runs their chat widget), **one place it reports** (an issue on their
own repository, which already emails them). Any second platform doubles each of
those, and a site owner who sells houses will not debug a second platform.

### Where a routine is still the right tool

A routine has the whole assistant available — judgment, the full repository,
every skill. So the division is:

| The work | Where |
|---|---|
| Must happen on a schedule, produces a file | **GitHub** |
| Collecting numbers from APIs | **GitHub** |
| Reading those numbers and deciding what to change | **A routine, or on demand** |
| Anything needing judgment across many files | **A routine** |

The weekly reporting job already splits exactly this way: the scheduled job
*collects* the figures and commits them, and the interpretation — what they mean,
whether last week's changes worked — is a conversation, because that is judgment
and the other is a cron.

---

## 8. What this suggests for everything else being built

The pattern here generalises, and most of our other recurring work currently
sits on the weaker side of it.

**The principle: anything that must happen on a schedule should not depend on a
particular computer being awake, connected and willing to answer.** If it does,
its real delivery rate is not what the schedule says — ours measured 17.5%.

Four pieces are reusable as they stand:

1. **Put the schedule where the machine is always on.** Any recurring job whose
   output is a file, a commit, a message or an API call can move to a hosted
   runner. The daily morning routines, the pull-request sweep, the weekly
   figures, reminders, anything on a cron.
2. **Separate collecting from interpreting.** Collecting is mechanical and
   belongs on a schedule. Interpreting needs judgment and belongs in a
   conversation, with the collected data waiting. This also means a late
   collection costs nothing.
3. **Silence must never read as success.** Every scheduled job should report
   every outcome, including "nothing to do", and should open exactly one issue
   per problem rather than one per day. A job that produces nothing and says
   nothing is indistinguishable from one that worked, and that is how a fortnight
   disappears.
4. **Verify the outcome, not the attempt.** This is the one almost everything is
   missing. Confirm the email arrived, the record was written, the page is
   readable. Every check we had was about whether the work was *good*; none was
   about whether it *landed*. That gap cost thirteen days on a live site and
   nobody noticed, because everything was green.

A hung run is worth calling out on its own: one of our routines has been stuck
"running" for 38 hours and is blocking every run behind it. Any scheduled job
needs a timeout and a watchdog that notices a run which started and never
finished — something the listing pipeline in this same repository already
implements and which could be lifted straight across.

None of this requires new tooling. It is the same four habits applied to work
that currently assumes somebody's laptop is open.
