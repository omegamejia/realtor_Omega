# Where this skill came from

`website-health` is shipped into this seed **verbatim** from its own
repository, so the engine that grades a site is the same engine everywhere
rather than several drifting copies of it.

**It is a copy.** When the original changes, this one goes stale. Refresh it by
re-copying the whole folder, never by editing a file here. A local edit is the
bug, because the next refresh silently discards it.

That is not hypothetical. A copy of this skill kept outside version control sat
four hundred lines behind the original and was missing three files, and nobody
noticed until a report came back without checks the newer engine had been
running for days.

## What it needs on the computer

**Python 3.9 or newer, and nothing else.** No install, no package, no key, no
account. Node is used only for Google's Lighthouse test, and this seed already
installs Node.

Chrome makes Lighthouse run locally. Without Chrome the skill falls back to
Google's free service for any public site, which is the case that matters when
grading somebody's existing site.

**If Python is missing**, `run.sh` exits 3 with a message ending "Tell me 'run a
diagnostic'". That phrase routes to a skill that **does not exist in this
seed**. Do not go looking for it. Say plainly that one thing is missing, offer
`xcode-select --install` on a Mac, and if they would rather not, skip the
reading and carry on. A missing baseline costs a comparison later; a stalled
setup costs the whole site.

## References inside the copy that do not resolve here

| Referenced in | Points at | What to do |
|---|---|---|
| `SKILL.md`, "How to talk about it" | `.claude/rules/plain-words.md` | Not in this seed. The rule it states is in the same paragraph: describe what a visitor, Google or an AI assistant experiences, and never say status code, HTML, DOM, JSON, schema, crawler, server, SSL, DNS or Lighthouse category to the owner unless they ask how it works. Follow that, and do not invent what the missing file said. |
| `SKILL.md`, "How to run it" | an `Agent-OS/` vault folder for reports | Not where they go here. Reports belong in `content/website-health/`, under `before/` and `after/`. |
| `SKILL.md`, "What has to arrive with it" | a ship-check naming vault folders | Belongs to another kit's CI. Inert here. |

## Where the reports go, and why they are committed

`content/website-health/before/` and `content/website-health/after/`.

`content/` is never overwritten by a seed update, so a baseline taken during
setup survives every future refresh. The reports are committed on purpose: the
whole point is that the comparison is still there in a year, on a different
laptop, in a different session. An ignored file is not.

They embed the owner's own site's words and a screenshot of their own pages, in
their own repository, so there is nothing to protect them from.

**A report for a site that is not theirs does not go in the repo.** Checking a
competitor is a good use of this skill, but point `--out-dir` somewhere outside
the project when you do.

## Its rules and this project's rules

Where the two disagree, this project wins. In particular: the skill is
read-only against every website and must stay that way, and its trade flags are
things to look at, never a legal ruling. If the owner asks whether something is
"legal", say plainly that this does not answer that.

## Industry flag

This seed builds real estate sites, so it is always `--industry real-estate`.
Add `--state XX` when you know it: without it, the state advertising rules are
guessed from whatever address is on the site being graded.
