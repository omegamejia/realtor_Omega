# Changing the engine without breaking somebody's site

**Who this is for:** anyone editing the seed itself, or hand-applying an engine
change to a live agent site — Jerry, Cheryl, Edison, Claude. **Not** for an agent
building their own site; nothing here applies to writing content or filling in
`site.config.ts`.

Every rule below is here because it already went wrong, once, on a real repo.
Each one costs under a minute and each one caught a mistake that took an hour to
undo.

---

## 1. Before you branch: know where you are

**Check the branch and the working tree before `git checkout -b`. Both. Every
time.**

```bash
git rev-parse --abbrev-ref HEAD && git status --porcelain
```

You want `main` and no output. Anything else, stop and find out why.

**What happened (October 2026, `local-service-site-seed`).** A branch was cut
from whatever the working directory happened to be on. That turned out to be
`feat/config-is-the-contract`, a long-lived branch with ten commits and an open
PR of its own — and the tree was dirty with two files of somebody else's
unfinished work. The new PR therefore contained ten unrelated commits and two
files of work in progress that belonged to another person. It had to be closed,
the WIP restored by hand from a saved patch, and the whole branch rebuilt.

Nothing warned. `git checkout -b` is perfectly happy to branch from a dirty
feature branch, and the PR looked plausible until GitHub reported a conflict.

**If the tree is dirty and the work is not yours, do not stash it and do not
commit it.** Use a separate worktree, which cannot touch their files at all:

```bash
git worktree add ../scratch-branch -b my/change origin/main
```

## 2. Never `git add -A` unless you started from a clean tree

Rule 1 makes this safe; without it, `-A` sweeps up whatever was already
modified and puts somebody else's work under your commit message. In the same
incident it silently committed two files nobody had asked to commit.

When in any doubt, name the paths:

```bash
git add app/layout.tsx next.config.mjs lib/brand-mark.ts
```

Then read `git show --stat HEAD` and confirm the file list is only yours. That
one command is how the mistake above was eventually caught.

## 3. Read what upstream already has before you "fix" it

**Before patching an engine file, look at the current `origin/main` version of
it — not your local copy, and not the version you remember.**

```bash
git fetch -q origin main && git show origin/main:app/layout.tsx | head -40
```

**What happened.** A canonical-and-Open-Graph fix was written for the realtor
seed and copied to `service-site-seed` (since folded into
`local-service-site-seed` and deleted), whose `main` had **already solved all of
it** — a `lib/metadata.ts` with per-path canonicals, Open Graph, Twitter tags and
a generated favicon, better documented than the replacement and taking a
deliberately different approach. The copy would have been a regression shipped
as an improvement. It was caught only because a rebase conflicted.

The seeds diverge. They are separate repositories with separate histories, and
the one you are not looking at may be ahead.

## 4. The server you are testing is not always the build you just made

**After a build, confirm the running server is serving that build before you
believe anything it tells you.**

This cost two wrong conclusions in a single session, in both directions:

- A seed was declared broken — relative canonical, missing social image —
  because the server had been started before the build finished. It was fine.
- A build that had **failed** was then "verified" against a stale `.next` from
  an earlier run, and reported as passing.

A stale server fails silently and looks exactly like a real result. Kill it,
build, start, and check something that could only exist in the new build.

## 5. A new gate layer has to be proven to FAIL

**A check you have only ever seen pass is not a check.** Point it at something
you know is broken and watch it fail before you ship it.

Layers 11 and 12 (canonical, social preview) were written and confirmed passing
on 67 pages — which proves only that they do not crash. The useful evidence came
from running them against a site that genuinely lacked both tags, which is also
how the real before/after number was measured. Prefer that order.

## 6. A file meant for several seeds must be verified on all of them

**"It builds here" is not evidence it builds there.** The seeds have genuinely
different config shapes:

| seed | identity | brand colours |
|---|---|---|
| `realtor-site-seed` | `agent{}` | `primaryColor`, `accentColor` |
| `local-service-site-seed` | `owner{}` | `primaryColor`, `accentColor` |

Shared code resolves identity by trying known paths in order
(`lib/brand-mark.ts`); it never reads `site.agent.name` directly. A new seed with
a new field name should need one entry added to that list and no new file.

And watch for assumptions that are not about field names at all: the first
shared mark drew a **house**, which is correct on a realtor site and wrong the
moment the same file renders a plumber's or a dentist's share card.

## 7. Say which half of an update actually lands

An engine update ships **files**. Some are complete on arrival — canonical tags
started working everywhere the day they landed. Others arrive **inert**:
reporting, pixels, heatmaps, the AI caller and IDX all need a person to create
an account, paste an ID or set a secret first.

So after any engine change, ask which kind yours is, and say so in the PR. If it
is the inert kind, it needs a line in `docs/ENGINE-CHANGELOG.md` tagged
`content` or `decision`, and it should be visible to `npm run catchup` — which
exists precisely because the gate reports what is *wrong* and an inert feature is
neither wrong nor working.

---

## The thirty-second version

```bash
git rev-parse --abbrev-ref HEAD && git status --porcelain   # 1 — main, clean
git fetch -q origin main && git log --oneline -3 origin/main # 3 — what's there
# ...make the change...
git show --stat HEAD                                         # 2 — only my files
npm run build && npm run gate                                # 4 — fresh build
```
