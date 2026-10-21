---
name: site-updates
description: Pull Krista's latest skills, rules and docs into this site, then say what arrived and what it needs from the agent. Use when someone says "check for updates", "pull the latest", "any updates from Krista", "is there a new version", "update my instructions", "get me the latest", or "bring my site up to date".
model: sonnet
---

# Getting Krista's updates

## First: are we even in the right folder?

**Students have at least two of Krista's repositories open on their machine** —
their website (built from `realtor-site-seed`) and
`Agent-Authority-Operating-System`, which has its own separate updater. The
update prompt gets pasted into whichever window is open, and about half the
time that is the wrong one.

So before anything, check:

```bash
test -f site.config.ts && test -f scripts/update-engine.mjs && echo "website"
```

- **Both present** → this is their website. Carry on.
- **Neither** → say so plainly and point them at the right window. Do **not**
  say "there is no website update available", which is what it looks like from
  the inside and is the wrong answer. Say:

  > "This folder is your *operating system*, not your website — they update
  > separately. Open your website folder and paste the same thing there. If
  > you are not sure which one it is, it is the folder with `site.config.ts`
  > in it."

- **Agent-OS specifically** (there is an `Agent-OS/` directory or a
  `GET-UPDATES.md`) → name it, so they know where they are:
  *"You're in Agent-Authority-Operating-System. That one keeps itself updated
  too — ask there with 'check for updates'. For the website, open the other
  folder."*

Never guess, and never run `npm` in a folder with no `package.json` just to
see what happens.

## Finish the install — the mechanism cannot deliver itself

**Do this check every time, before anything else.** The daily auto-update is a
hook plus an npm script, and neither can arrive by update, because the two
files they live in are the two the updater must never overwrite:
`.claude/settings.json` holds the agent's own permissions, and `package.json`
holds their dependencies. Replacing either to install an updater would be the
exact kind of damage this whole design exists to prevent.

So the skill installs them, by **merging two entries**, never by replacing a
file. On a site that has had an update but still has no hook, this is the
reason, and it is silent: the skills look current and nothing is running.

**1. Is the script there?** `.claude/scripts/skills-update.sh` arrives with the
instruction layer. If it is missing, the update has not run yet — do that first.

**2. Is it executable?** `chmod +x .claude/scripts/skills-update.sh`.

**3. Does `package.json` have the script?** If `scripts["update:skills"]` is
absent, add exactly this one key, leaving everything else untouched:

```json
"update:skills": "node scripts/update-engine.mjs --skills"
```

**4. Does `.claude/settings.json` have the hook?** If there is no `SessionStart`
entry pointing at `skills-update.sh`, add this, merging into whatever is
already in the file:

```json
"hooks": {
  "SessionStart": [{
    "matcher": "startup",
    "hooks": [{
      "type": "command",
      "command": "/bin/bash -c 'nohup /bin/bash \"${CLAUDE_PROJECT_DIR}/.claude/scripts/skills-update.sh\" >/dev/null 2>&1 &' || true",
      "timeout": 10
    }]
  }]
}
```

**5. Tell them it is on.** One line: *"From now on this checks for Krista's
updates once a day on its own, in the background, when you open the project."*

Then commit all of it, so the next session starts clean.

## Why this is a skill and not a line in CLAUDE.md

Because **CLAUDE.md does not auto-update and this does.**

The background updater (`.claude/scripts/skills-update.sh`) syncs
`.claude/skills`, `.claude/rules` and `docs` — deliberately not `CLAUDE.md`,
which every site customises. So routing that lives only in CLAUDE.md reaches
nobody who already has a site. Any instruction that has to reach existing
agents has to live in the instruction layer, which means in here.

## The command may not exist yet, and that is the normal case

`update:skills` ships in this update. **A site that has not had it yet does
not have it** — the thing that delivers the fix cannot be delivered by itself.
So never assume the npm script is there:

```bash
grep -q '"update:skills"' package.json && echo have-it || echo use-plain-git
```

**If it is missing, use plain git.** No remote to add, no script required:

```bash
git fetch https://github.com/Krista-Mashore-Coaching/realtor-site-seed.git main
git checkout FETCH_HEAD -- .claude/skills .claude/rules docs
```

Those three paths are the whole instruction layer. Verified on a real old
clone with no `update:skills` and no `seed` remote: 15 files updated, nothing
outside those folders, no site file touched. The clone gets `update:skills`
as part of what arrives, so this fallback is needed exactly once.

Check the tree is clean first, and afterwards show `git status` and commit.

## The one command, once they have it

```bash
npm run update:skills            # preview, changes nothing
npm run update:skills -- --apply # writes
```

Scoped to `.claude/skills`, `.claude/rules` and `docs`. It **cannot** reach
`site.config.ts`, `content/`, `app/`, `components/`, `lib/`, `public/`,
`scripts/` or `CLAUDE.md`. That is enforced by the scope list in
`scripts/update-engine.mjs`, not by convention.

Most of the time it has already run on its own — the hook fires once a day in
the background. Running it by hand is for when somebody asks.

## Never reach for `update:engine` on a site somebody has designed

`update:engine` is the **wide** update: app code, components, lib, scripts.
On a real site built from this seed and then designed, applying it replaces
`app/globals.css` (729 lines different), `app/page.tsx` (422) and
`app/layout.tsx` (63) with the seed's generic versions.

It now refuses when it would overwrite files the agent has edited, and that
refusal is the safety net rather than the plan. **Default to
`update:skills`.** Only use the wide one when the agent has asked for a
specific engine fix that is not a skill, and say plainly what it will replace
before running it. Never pass `--force` on their behalf.

## What to do, in order

1. **Preview it.** `npm run update:skills` and read the output yourself first.
2. **Say what changed in their language.** The preview prints the changelog.
   Entries tagged `content` or `decision` are the ones that involve them:
   *"there's a new check that makes sure your page headings match their web
   addresses"* beats a list of file paths. Do not read 21 filenames aloud.
3. **Apply it**, unless they say no. This is instructions, not their site —
   there is nothing of theirs to lose, so there is nothing to weigh up.
4. **Run `npm run catchup`.** This is the half people forget. An update ships
   files, and some arrive **inert** — reporting, pixels, heatmaps, the AI
   caller and IDX all need an account or an ID before the shipped code does
   anything. `catchup` is the only thing that reports what is switched off.
   Telling somebody they are "up to date" right after pulling a feature that
   needs an API key is wrong.
5. **Then run the gate** (`npm run gate`) if anything tagged `content` landed.
   A new rule flagging an old page is the gate working, not the update
   breaking their site — say that out loud, because it does not look that way
   to somebody who just ran an update and now sees failures.
6. **Never fix flagged content silently.** Show them, explain why it matters,
   let them choose.

## What the agent should hear at the end

Two sentences, not a report:

> "Pulled in Krista's latest — mostly improvements to how I write your area
> pages, plus a new rule about photo captions. Nothing you need to do, except
> one thing: your site can send you a weekly report and it isn't switched on.
> Want me to set that up?"

## If they ask for it to happen automatically

It already does, once a day, in the background, when they open the project.
`.claude/state/last-skills-update.log` is the record — *"what did my last
update bring in?"* reads it back. If that file is missing or stale, the hook
is not running: check `.claude/settings.json` has the `SessionStart` entry and
that `.claude/scripts/skills-update.sh` is executable.
