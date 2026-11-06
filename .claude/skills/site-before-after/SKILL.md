---
name: site-before-after
description: >-
  Show the owner what their new site scored against their OLD one, side by
  side. Use when they say "give me the before and after on my site", "how does
  my new site compare to my old one", "was it worth it", "show me the
  improvement", "did my site actually get better", or ask what changed since
  they switched. Reads the two saved health reports and names what improved,
  what went backwards, and what is still broken on both.
# plain language about somebody's own business, and a judgement about what matters
model: opus
---

# Before and after

The owner paid for a new site. This is the one place they find out whether it
was worth it, in numbers rather than reassurance.

```bash
node .claude/skills/site-before-after/scripts/compare.mjs
```

It reads the newest report in `content/website-health/before/` and the newest
in `content/website-health/after/`, and prints the categories side by side.

## Where the two readings come from

| | when | who takes it |
|---|---|---|
| **before** | during setup, while their old site is still up | `<the setup skill>`, at the point it learns they have an existing site |
| **after** | once the new site is live on the real domain | `domain-setup`, after the cutover checks pass |

**The before reading can only ever be taken once.** The moment their domain
points at the new site, the old one is gone and no comparison is possible. If
somebody asks for this and there is no baseline, say that plainly rather than
implying it can be reconstructed. It cannot.

## Taking the readings by hand

If either is missing and the site still exists:

```bash
# the old site, while it is still up
bash .claude/skills/website-health/scripts/run.sh https://their-old-site.com \
  --out-dir content/website-health/before --open

# the finished site, after the domain has moved
bash .claude/skills/website-health/scripts/run.sh https://their-domain.com \
  --out-dir content/website-health/after --open
```

See `.claude/skills/website-health/SHIPPED-FROM.md` for the right `--industry`
flag for this seed, and why `--state` matters.

Run the after reading only **after** `npm run check:domain` passes. Until the
site is rebuilt on the new domain its sitemap and schema still name the old
one, and the check reads that as a real fault. It is a real fault, but it
belongs to the missing redeploy, not to the new site.

## How to report it

**Lead with the overall number and the letter.** That is the question they
asked. Then the two or three categories that moved most.

**Say what went backwards first, if anything did.** The script prints those at
the top for that reason. A site can gain fifteen points of speed and lose a
compliance check, and the compliance check is the one that needs a decision
today.

**Do not average the two into one "improvement" figure.** It hides exactly the
thing somebody needs to act on, and it is the kind of number that reads as
marketing rather than measurement.

**Some categories will show as "only in the after reading".** That means the
checker gained a check since the baseline was taken, so there is no honest
before number for it. Say that, rather than counting it as an improvement they
earned.

**A low before score is not an insult.** Most of these sites were built by
somebody doing their best with a page builder years ago. The comparison is
about what the new one does, not about what the old one failed at. If the
owner starts apologising for the old site, move them along.

## When it has nothing to compare

The script exits with a clear message and the exact command to take whichever
reading is missing. Read that message out rather than guessing at why.

If no baseline was ever taken and the domain has already moved, the honest
answer is: we cannot compare, here is what the site scores now, and the reason
the baseline matters is so this is not a gap next time.
