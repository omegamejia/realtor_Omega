# Krista's skills in this repo — house rules

Four of Krista's marketing skills ship inside this package **verbatim**, so her
method stays exactly as she teaches it: `copywriter`, `hooks`,
`content-engine-builder`, `image-creator` (plus `krista-aeo-geo-writer`, which was
adapted rather than copied).

**Method: hers. Rules: ours.** Where her skill and this project conflict, this
project wins. This file is the binding layer. Read it before running any of them.

## 1. The vault problem, and how it's solved here

**First: check whether the agent actually HAS Agent-OS.** Most agents using this
seed have been through Krista's onboarding, and their vault really does contain
`11-Brand-System/` — including a filled `Copywriter-Brain.md`, `07-Voice-Rules.md`,
and `02b-Ideal-Client-VOC.md`. When it's there, **read it** (see
`realtor-site-setup` Phase 2a) — that's the real brain these skills were written
against, and it beats any substitute.

The table below applies when there's **no Agent-OS**, or a given file is missing or
still a template. These paths don't exist *inside this repo* — but they may well
exist on the agent's machine:

| Her path | What it held | Here |
|---|---|---|
| `Agent-OS/12-Knowledge-Library/Copywriter-Brain/*` | Frameworks, awareness levels, rubric | The rubric + process are **inline in `copywriter/SKILL.md`** — use those, don't chase the path |
| `Agent-OS/11-Brand-System/02b-Ideal-Client-VOC*.md` | The client's verbatim pain/desire/objection language | **`content/brand-voice.md`** (see below) |
| `Agent-OS/11-Brand-System/07-Voice-Rules.md` | Banned words/structures, voice rules | **`content/brand-voice.md`** |
| `Agent-OS/11-Brand-System/03-Offers.md`, `05-Funnel-Map.md`, `06-Funnel-Execution-Engine.md` | Offers + funnel map | `site.config.ts` (`funnels[]`, niches, areas) |
| `Agent-OS/14-Confidential/`, `_Operations-Log.md`, External-Playbooks | Krista-internal | **Not present. Don't look for them, don't ask for them.** |

**If a referenced file is missing, do not invent its contents.** Use what's inline
in the skill plus `content/brand-voice.md`, and say plainly which input was
unavailable.

**Never read `14-Confidential/`** — in this repo or in the agent's own vault.

## 1b. Known dangling references inside the copied skills

Because these were copied verbatim, they point at siblings and files that **were
not copied**. This is expected — here is the full list and what to do:

| Referenced in | Points at | Do this |
|---|---|---|
| `copywriter` | `email-drafter`, `newsletter-alchemist`, `linkedin-editor`, `daily-followup-drafter`, `content-distribution`, `email-reply`, `challenge-funnel-hacker`, `webinar-architect` | **Not in this package.** They're Krista's other Agent-OS skills. Ignore the routing lines; `copywriter` still works standalone. Don't try to invoke them. |
| `copywriter` | `.claude/CLAUDE.md` (Messaging Control Sequence, Model Routing, Communication Style) | **That's her repo's CLAUDE.md, not ours.** Ours is at the repo root and has different rules. Use **our** `CLAUDE.md` + this file. |
| `image-creator` | `.claude/rules/image-sourcing.md` | Now exists here — it points at `image-manager`'s sourcing ladder. |

If any of them is present in the agent's own Agent-OS vault, reading it there is
fine. What's forbidden is **inventing** what a missing file said.

## 2. `content/brand-voice.md` is this repo's Brand System

`content-engine-builder` is the skill that **creates** it: run it once per agent
and write its output (Ideal Dream Client, authority stand, voice DNA, banned
words, VOC phrases, hook menu) to `content/brand-voice.md`. From then on,
`copywriter`, `hooks`, `krista-aeo-geo-writer`, `realtor-content-writer`, and
`funnel-builder` all read that file for voice — it replaces her vault's
Brand-System folder.

Until it exists, the seed ships a bracketed placeholder version. Voice-dependent
work should say so rather than guessing at the agent's voice.

## 3. Non-negotiable overrides (this repo's rules win)

- **Never fabricate.** No invented stats, market data, rankings, reviews, or
  client results. Unknowns are `[PLACEHOLDER: ... to verify]` — that exact marker,
  because `npm run launch:check` detects it.
- **Content lives in the codebase**, not in chat and not in a vault:
  `content/pages.ts`, `content/posts.ts`, `site.config.ts`. Copy produced by these
  skills has to land in one of those to exist.
- **Never hand-write JSON-LD.** `lib/schema.ts` generates all schema. FAQs go in a
  page's `faqs` array.
- **Interlinking is enforced**: every page links home + `/contact`, 5–8 internal
  links, keyword-rich anchors. Placeholder links fail the gate.
- **The gate is the finish line**: `npm run validate:schema` + `npm run launch:check`
  against a running `npm run dev`, then `site-design-system`. Nothing ships un-gated.
- **Design/UX is governed by `site-design-system`** and the `frontend-design`
  plugin — not by ad-hoc styling inside a copy skill.
- **No third-party names** (gurus, competitors, other coaches) in output.
- **Never surface Krista's internal systems** — her automated site-build engine,
  article-content-engine, blog auto-publish pipeline, or `14-Confidential/`. If
  asked how she does it at scale: that's a separate internal system; these are the
  manual versions anyone can run.

## 4. How they fit together here

```
content-engine-builder  →  content/brand-voice.md   (voice DNA, once per agent)
                                    ↓
        copywriter  ·  hooks  ·  krista-aeo-geo-writer  ·  image-creator
                                    ↓
   realtor-content-writer / funnel-builder  →  content/*.ts  →  GATE  →  ship
```

- **`copywriter`** — the voice + quality layer (8-step process, 14-criteria rubric,
  Humanizer pass) for persuasive copy: funnel pages, CTAs, opt-in copy, home hero.
- **`hooks`** — fast headline/subject/hook variations for funnel headlines, blog
  titles, meta titles, CTA buttons.
- **`content-engine-builder`** — run once at setup; produces `content/brand-voice.md`.
- **`image-creator`** — produces image *prompts*; `image-manager` still owns getting
  the resulting file into `public/images/` and wiring the path.

## 5. Drift

These are **copies** taken 2026-07-30 from `~/.claude/skills/` (themselves copies
of Krista's `upstream/main` Agent-OS product skills, pulled 2026-07-27). When she
updates the originals, these go stale. To refresh: re-copy the skill body and
re-apply the house-rules block at the top. Don't paraphrase her method while
refreshing — copy it, then bind it.
