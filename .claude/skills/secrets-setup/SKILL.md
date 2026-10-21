---
name: secrets-setup
description: Put a key, token or password somewhere safe and get it to the places that need it — Vercel for the live site, GitHub for the scheduled jobs — using a free Doppler account. Use whenever a key is about to be handed over or is missing: the Anthropic key for chat and daily articles, the GoHighLevel token, Clarity, or any other secret. Also use when someone says "where do I put my key", "it says my key is missing", or "I need to change my key".
model: sonnet
---

# Where the keys live

## Do it, don't offer it

**Walk them through Doppler as the way this works. Do not present it as a
choice.** An agent has no basis to choose between secret managers and asking
them to turns a two-minute step into a decision they will postpone.

Only when they push back — *"I don't want another account"*, *"we already use
1Password / AWS / something else"* — do you say **"okay, cool"** and take the
fallback below. Then write it on `content/OPEN-ITEMS.md` as declined and never
raise it again.

## Why it is this and not a file on their laptop

In their language, once:

> "Your keys go in one place called Doppler — think of it as the safe. The
> website and the automatic jobs both get handed what they need from there, so
> the key itself never sits in your files, never gets emailed, and never ends up
> somewhere public by accident. If you ever need to change it, you change it
> once in the safe and everything updates."

The real reasons, for you rather than them: a key in `.env.local` reaches
production by somebody pasting it a second time; a key pasted into a chat is in
a transcript forever; a key committed once is in git history forever even after
it is deleted; and a key in three places is a key that gets rotated in one.

**Be honest about the limit if they ask.** Doppler does not make a key invisible
to Claude — a session running on their machine with their logins could read it
back. What it does is keep it out of chats, out of files, out of git history,
and rotatable in one place. Do not claim more than that.

## The split: what you do, what only they can do

Four things are genuinely theirs. Everything else is yours.

| Theirs | Yours |
|---|---|
| Create the free account | Install the CLI |
| Paste the key into the dashboard | `doppler login` (one browser click) |
| Authorise the Vercel app | Create the project and configs |
| Authorise the GitHub app | Open the exact page they need |
| | Verify afterwards, without reading the value |

There is **no `doppler integrations` command** — syncs are dashboard-only, so
those two authorisations cannot be done for them. Everything else can.

## The walkthrough

**1. Is it already there?**

```bash
doppler --version && doppler me
```

Installed and logged in — skip to step 4.

**2. Install, without needing their password.**

```bash
brew install dopplerhq/cli/doppler          # macOS
# Windows: scoop install doppler   (or winget install doppler)
```

**3. Log in.** `doppler login` opens a browser. Say what it is before it
appears: *"this is you telling the safe it's okay for me to put things in it —
you can revoke it any time."* If they have no account, that same screen makes
one; the free plan is ample and no card is asked for.

**4. Create the project and the three configs.**

```bash
doppler projects create "<repo-name>"
doppler setup -p "<repo-name>" -c dev --no-interactive
```

That is the whole step. **Creating the project creates the environments and
configs for you** — `dev`, `stg` and `prd`, verified against a real account.
Do not run `doppler configs create`: `dev` already exists so it errors, and
asking for `staging` or `prod` makes a second, wrongly-named config sitting
beside the real `stg` and `prd`.

Those short names matter everywhere else in this skill — the production config
is **`prd`**, not `prod`.

Name the project after the repository, so it matches every other project in the
org.

**If project creation fails with "reached its limit of 10 projects"**, the free
plan is full. Hit for real on an account with exactly ten. Do not start deleting
things to make room — say what it is and give them the two honest options:

> "Your Doppler account is at its free limit of ten projects. Either we reuse an
> existing one and keep this site's keys in their own config inside it, or you
> clear out a project you've finished with. Which would you rather?"

Reusing is usually right for an agent with one site: a config inside an existing
project is just as isolated as a project of its own. **An agent setting up their
first site will never see this** — ten projects is a lot for someone who owns
one website. It is the person who runs many sites who hits it.

**5. They paste the key.** Open the page for them:

```bash
doppler open -p "<repo-name>" -c prd
```

Then say exactly what to add — the name, not the value:

> "Add one called `ANTHROPIC_API_KEY` and paste your key in. I won't see it and
> I don't need to."

**Never ask them to paste a key into the chat, and never type one yourself.**
If they paste one anyway, tell them plainly that it is now in the transcript and
should be rotated, then carry on.

**6. Sync it to the two places that need it.** Both are dashboard steps, so walk
them through rather than narrate clicks blindly — open the page and tell them
what they are looking for.

- **Vercel** → Integrations → Vercel → authorise → pick the Vercel project, pick
  **Production**, pick the `prd` config. Repeat for Preview if they use it.
  This is what makes the chat widget work for visitors.
- **GitHub** → Integrations → GitHub → authorise → **Actions** → pick the repo →
  pick the `prd` config. Doppler writes into GitHub's own secrets, so the
  scheduled jobs read them normally. This is what makes the daily articles run.

A free account allows **5 syncs**; this uses two.

**7. Verify without reading anything.**

```bash
doppler secrets --only-names -p "<repo-name>" -c prd
```

Then confirm the real thing rather than the setting: `GET /api/chat` should
return `"configured": true`, and the widget should answer a real question.
**A key that is set and a chat that works are not the same claim** — check the
second one.

## The directory mapping does not travel with the repo

`doppler setup` records which project and config a folder uses in
`~/.doppler`, keyed by the absolute path — **not** in a file inside the repo.
Verified: after setup, `doppler secrets --only-names` resolves in that folder
with no flags, and nothing new appears in `git status`.

So it is per machine and per checkout. A second person cloning the site, or the
same person on a new laptop, runs `doppler setup -p <repo-name> -c dev` once.
Worth saying out loud, because the failure looks like Doppler forgetting rather
than a mapping that was never shared.

## Running locally

Local development reads from the same safe, so there is nothing to copy:

```bash
doppler run -- npm run dev
```

If `.env.local` already exists with a key in it, move the value into Doppler and
delete the file. Leaving both means the next person edits the wrong one.

## If they say no

Fine, and say so without friction. Then:

1. The key goes in **Vercel** (project → Settings → Environment Variables) and
   as a **GitHub repo secret** (`gh secret set ANTHROPIC_API_KEY`, which prompts
   so the value never becomes a command argument).
2. Tell them the one consequence, once: the key now lives in two places and
   changing it means changing both.
3. Record it on `content/OPEN-ITEMS.md` as **declined** so nothing asks again.

## What goes in the safe

Everything. `ANTHROPIC_API_KEY` (chat and the daily articles), `GHL_API_TOKEN`,
`CLARITY_API_TOKEN`, and anything added later. One place, or it is not a safe.

Never: a key in `site.config.ts`, in `content/`, in a commit message, in a
comment, or in a screenshot.
