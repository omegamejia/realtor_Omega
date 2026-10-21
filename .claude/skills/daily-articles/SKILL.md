---
name: daily-articles
description: The blog that writes and publishes itself. Use when the agent asks how many articles a day, wants more or fewer, wants it paused, asks whether it ran, says no article appeared, or asks what it costs. Not the writer — this is the dial.
model: sonnet
---

# The blog that writes itself

**What to say first, because it is the part nobody believes:** their website
writes a new article every day and puts it live, and they do not press anything.

> "It's like having a writer who comes in before you wake up. They pick a
> question your buyers actually ask, go look up the answer, write it, check
> their own facts, and publish it. You find out it happened because the article
> is there."

It runs on GitHub, not on their laptop, so it does not care whether their
computer is open or they are on holiday.

## Before anything else: is it on?

One thing turns it on, and without it nothing runs.

```bash
npm run catchup
```

If that says the Anthropic key is missing, **go to `secrets-setup` and stop
here.** No key means no articles, and the job opens an issue on their repo
saying exactly that rather than failing somewhere nobody looks.

To see whether it actually ran:

```bash
gh run list --workflow "Daily article" --limit 7
```

## How many a day

**It ships at one. Leave it at one on a new site.**

This is the question that comes up every time, usually as "can it do five?" It
can. It should not, yet, and the reason is worth saying out loud rather than
just refusing:

> "It can do five. On a site this new I wouldn't. Five a day is 150 articles by
> Christmas, and your pages about actually selling a house get buried under
> them. Google has a word for a site that's 90% blog posts and it isn't a good
> one. Let's get your real pages ranking first, then turn it up."

When they genuinely want more, it is a repository variable and takes a second:

```bash
gh variable set ARTICLE_COUNT --body "3"
```

Sensible ladder, and say which rung they are on:

| Rung | When |
|---|---|
| **1/day** | A new site. The default. Stay here for the first month or two. |
| **2–3/day** | The money pages are written and ranking, and the question bank has 60+ questions in it |
| **5/day** | A site with real traffic, a deep question bank, and a reason |

**Check the bank before raising it.** `content/question-bank.json` is the list of
questions it writes from, and it writes each one once. Three a day against
twenty questions is dry in a week, and a dry bank opens an issue every morning.

```bash
node -e "console.log(require('./content/question-bank.json').questions.length + ' questions')"
```

Fewer questions than `count × 45`, add questions first. The question bank is
the spine — it also feeds the FAQ schema and the AI phone assistant, so time
spent there is never only for the blog.

## Pausing and stopping

Pausing is legitimate and they should not have to feel clever to do it:

```bash
gh workflow disable "Daily article"      # pause
gh workflow enable  "Daily article"      # resume
```

To remove an article that already published, it is a normal undo:

```bash
git revert <the commit>   # the commit is named "post: 2026-10-12"
```

Never hand-edit `content/posts-generated.json`. The job owns that file and will
write over an edit.

## "No article showed up today"

In order, because the first one is almost always it:

1. **The question bank ran dry.** Every question already has a post. Not a bug.
   Add questions.
2. **The key is gone or out of credit.** `npm run catchup`.
3. **The article was held back.** It said something it could not source, or
   wandered into commissions, buyer agreements or closing costs, which are the
   agent's licence to describe and not ours. The run log says which.
4. **The build broke**, so publishing was skipped on purpose. The article was
   fine; something else on the site was not.

In every one of those four the job opens an issue on their repo. **A silent day
cannot happen, and that is the design.** If they say "it just stopped saying
anything", check the workflow is still enabled — GitHub switches off a schedule
after 60 days with no activity in the repo.

## What it costs

Measured on real runs, not estimated: **about 38¢ an article.**

| Rate | Per month |
|---|---|
| 1/day | ~$11 |
| 3/day | ~$34 |
| 5/day | ~$56 |

Say this part plainly, because it is the one that surprises people: **this is
Anthropic API credit, which is not the same as a Claude subscription.** A Claude
Pro plan includes none of it. It is the same key that runs the chat bubble on
their site, so it is one key and one bill, not two.

## What it will not do

Worth saying unprompted, because it is what makes it safe to leave alone:

- **Never a statistic it could not source.** It cuts the sentence instead of
  softening it. A vaguer true sentence beats a precise invented one.
- **Never the mechanics of the transaction** — commissions, buyer agreements,
  closing costs, escrow, contingencies. Those vary by state and belong to the
  licensee.
- **Never Fair Housing steering language.** Same list the launch gate enforces.
- **Never a near-duplicate.** It checks the question against existing titles
  before writing, and the finished article against every existing body after.
- **Never publishes into a broken site.** It builds first. A failed build skips
  the commit.

## Hard rules

- **Never raise `ARTICLE_COUNT` without checking the question bank.** It is the
  one change that looks free and produces a month of daily issue emails.
- **Never turn it on without the key.** Say what it needs and route to
  `secrets-setup`; do not leave them with a job that cannot run.
- **Never promise five a day on a new site just because they asked.** Say why,
  offer the ladder, and let them choose. They usually choose one.
