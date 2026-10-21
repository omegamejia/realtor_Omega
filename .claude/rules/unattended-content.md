# Unattended content — what has to be true before a machine publishes

Referenced by the `daily-articles` skill and by `scripts/lib/check-article.mjs`.
This is the rule for anything that reaches the public **without a person reading
it first**. It governs machine-published writing the way
`legal-compliance.md` governs claims and `truth-verification.md` governs data.

**The whole rule in one line: a human reviewing it is the only guardrail that
scales down, so everything else has to scale up — and that includes checking
that the thing actually got published, which is the one nobody writes.**

A draft a person reads is allowed to be wrong, because the person catches it. A
post that publishes itself at 6am has no such step, and it carries a licensed
professional's name. So every check is **blocking**, never a warning: a warning
in an unattended pipeline is a thing that scrolls past.

---

## 1. Silence must never read as success

The failure that matters is not a bad article. It is a day that produced
nothing and said nothing, because that is indistinguishable from a day that
worked, and nobody finds out for a month.

- Every outcome is reported. Published, held back, or failed.
- A failed day **opens an issue** on the repository. Not a log line.
- One issue, not one a day. Thirty identical issues is how somebody learns to
  ignore the one that matters.
- A permanently broken job must say *why* once and stop, because GitHub
  disables a schedule after 60 days of repo inactivity and it then dies quietly.

## 2. Never publish into a site that does not build

Build first, commit second. A malformed record otherwise lands, the deploy
fails, and the site is down until a person happens to look.

This is not hypothetical: the first live run wrote a perfectly good article and
failed the build, the guard skipped publishing, and the fault turned out to be
in the job's own install step. The guard caught a bad commit on its first
opportunity. **Non-negotiable in every pipeline that writes to a repo.**

## 2b. A commit is not a publication

**Build, commit, and then prove a stranger can read it.** Everything in §2 is
about whether the work is *good*. This is about whether it *arrived*, and they
are not the same question.

A real site went thirteen days like this. The daily job picked a topic, wrote
the article, sourced its claims, passed every content check, proved the site
still built, and committed — correctly, every single morning. The host had
quietly lost its link to the repository days earlier. Twelve commits accumulated
and the website never changed. **Not one check noticed, because every check was
about the article.**

So the last step of any unattended publisher is to fetch its own output from the
public address and confirm it is there:

- **A 200 is not proof.** A catch-all route, a custom 404 page or a stale cached
  index all answer 200. Check that the content is actually on the page.
- **Say the right thing when it fails.** "Written but not published" and
  "nothing was written" have different causes and different fixes. One issue
  covering both sends somebody to look at their question bank while their deploy
  is down.
- **A site with no public address yet is skipped, not failed.** Otherwise every
  pre-launch site reports a failure every morning.
- **Do not try to fix the deploy from inside the job.** It cannot, and a job
  that retries a broken pipeline silently is how the thirteen days happen.

## 3. A word is not a claim. A word in context is.

**This is the rule most often got wrong, and it has now been got wrong three
times in one feature.**

| Pattern | What it caught | What it was for |
|---|---|---|
| `commission` | "the Planning **Commission** voted" | a fee being described |
| `diagnos\w*` | "a plumber will **diagnose** the leak" | a medical diagnosis |
| `guarantee` | *(kept — see below)* | a promise nobody made |

Each time, a correct-looking regex held back a good article, and each time the
fix was the same: **put the context in the pattern.** A fee sense needs a
money word near it. A clinical sense needs a medical word near it. A proper
noun gets stripped before the common noun is looked for.

Two corollaries worth stating, because they are not obvious:

- **A false positive upstream is worse than one downstream.** The body check
  reports what it held back. A topic filter *drops the question silently*, and
  nobody ever learns the subject was skipped. Fix the upstream copy first.
- **Not every ambiguity should be resolved toward permitting.** "Our warranty is
  guaranteed" reads innocent, but the writer cannot know whether the business
  offers a warranty, so holding it for a human is correct. Ask what the writer
  could possibly know, not whether the sentence sounds fine.

## 4. Never a number it did not look up

Not softened. Not hedged. **Cut.**

An uncited market statistic is already a launch blocker
(`legal-compliance.md` §4), and a writer producing one a day is the fastest way
to put a licensed professional's name on a figure nobody can source.

- Every factual claim is either cited in the sentence or removed.
- **A vaguer true sentence always beats a precise invented one.**
- The fact-check is a **separate call**, because a model checking its own output
  in the same breath tends to agree with itself.
- A claim that cannot be verified means the article is **held back**, never
  silently edited. A wrong number quietly replaced by a different wrong number
  is worse than a post that did not publish.

## 5. The FTC reaches every business, so claims are checked everywhere

An unattended writer produces unsubstantiated superlatives *by default*, because
that is what marketing copy sounds like in its training data. "#1 in town",
"voted best", "guaranteed results", "cheapest", "risk-free", "100% satisfaction"
are advertising claims a real business has to be able to back up, and the writer
can back up nothing.

This is shared across every seed. **What is NOT shared:** Fair Housing is
housing law and belongs to real estate. HIPAA belongs to the seeds that serve
health practices. Putting either in the shared layer sends the wrong law to the
wrong business.

## 6. Two duplicate gates, because one cannot see the other's failure

- **Before writing**, compare the question to existing titles. Cheap, and it
  stops the obvious repeat before a penny is spent.
- **After writing**, compare the finished body to every existing body. This is
  the one that catches a genuinely different question that produced genuinely
  the same article, which is how a doorway-page site gets built one
  honest-looking day at a time.

The second threshold matches the launch gate's own, so an article that passes
today is not flagged by `npm run launch:check` tomorrow.

## 7. The topic bank is a resource that depletes

Each question is written once and never again. A bank smaller than
`articles per day × 45` runs dry inside a month, and a dry bank opens an issue
every single morning.

**Running out is not a bug and must not be reported as one.** It is the bank
needing more questions, and the message has to say so, or an agent files a
support request about a working system.

Volume is also not free in the other direction. **Ship at one a day.** Five a
day on a new site is 150 posts by Christmas with the money pages buried
underneath, and that pattern reads as a content farm. Raise it when there is a
site worth burying.

## 8. Never let the machine own a human's field

A generated record goes in its own file (`content/posts-generated.json`) that
the job owns completely. Hand-written content stays where people edit it. The
two merge at the **single source** every accessor reads.

Merging further down the chain is a real bug that shipped: the index listed the
article and its own page 404'd, while the title card still returned 200 from a
fallback, so it read as working.

---

## Applying it

Any new unattended writer — a different seed, a different medium, a social
post, an email — starts from this file, not from the last implementation. The
shared engine is `scripts/daily-article.mjs` and friends; what differs goes in
`scripts/lib/article-profile.mjs`. If you are about to copy the engine instead
of writing a profile, read §3 and §5 again and reconsider.
