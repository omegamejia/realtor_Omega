---
name: hooks
description: Fast hook/headline/subject-line generator. Produces 10 ranked variations for any topic + audience + format combo using the Copywriter Brain's frameworks. Use when you say "give me hooks for X", "10 hooks for X", "headlines for X", "subject lines for X", "reel openers for X", "ad hooks for X", "carousel openers for X", "tiktok hooks for X", "youtube titles for X", or "linkedin hooks for X". Light, fast, voice-aware. Skips deep-process steps.
audience: universal
model_tier: workhorse
version: 1.0
# fast, well-defined, structured work
model: sonnet
---

> ## ⚠️ HOUSE RULES — realtor-site-seed (read first)
> This is **Krista's skill, copied verbatim** into this package. Her method stands;
> **this project's rules override hers wherever they conflict.**
> - Her vault paths (`Agent-OS/…`, `14-Confidential/`, `_Operations-Log.md`) **do not
>   exist here.** Voice/VOC/brand inputs come from **`content/brand-voice.md`**
>   (produced by `content-engine-builder`). Never invent a missing file's contents.
> - Output must land in the codebase (`content/pages.ts`, `content/posts.ts`,
>   `site.config.ts`) — not in chat, not in a vault.
> - Never fabricate facts/stats/results. Unknowns = `[PLACEHOLDER: ... to verify]`.
> - Never hand-write JSON-LD (`lib/schema.ts` generates it). FAQs go in `faqs`.
> - Nothing ships until `npm run validate:schema` + `npm run launch:check` pass and
>   `site-design-system` signs off.
> - Full detail: **`.claude/skills/_KRISTA-SKILLS-HOUSE-RULES.md`**

# Hooks

## Description

Speed skill. You need 10 hook variations constantly to A/B test. The full Copywriter Brain is overkill for that. This skill pulls the relevant pieces (awareness levels, hook styles, VOC, voice rules) and ships 10 hooks in one pass.

Read-only on the brand-system files. Never auto-sends. Just generates.

## Trigger

- `Give me hooks for [topic]`
- `Hooks for [topic]`
- `10 hooks for [topic]`
- `Headlines for [topic]`
- `Subject lines for [topic]`
- `Reel openers for [topic]`
- `Ad hooks for [topic]`
- `Carousel openers for [topic]`
- `TikTok hooks for [topic]`
- `YouTube titles for [topic]`
- `LinkedIn hooks for [topic]`

## Inputs

- **TOPIC** (required) — what the content is about.
- **AUDIENCE** (default: your ideal client, from `02-Ideal-Client.md`) — alternates: past client, referral partner, lender, homeowner. If unclear, infer from topic and state the inference.
- **FORMAT** (default: mixed across all) — if user names one (subject line, reel opener, ad hook, etc.), focus there. Match length to format:
  - Email subject line → under 50 chars
  - FB/IG/LinkedIn ad hook → under 25 words
  - Reel/TikTok opener → under 8 words
  - YouTube title → under 70 chars
  - Carousel cover → under 12 words
  - SMS opener → under 15 words

## Process (3 steps)

1. **Identify awareness level (Schwartz 1-5)** for this topic + audience combo. One sentence stating which level and why. Use the table in `Agent-OS/11-Brand-System/Copywriter-Brain.md` Step 1.

2. **Generate 10 hooks.** Span at least 4 of these styles, with no style used more than 3 times:
   - Call-out hook (`If you're a [role] and...`)
   - Result hook (specific outcome up front)
   - Story hook (one-line story tease)
   - Curiosity gap (open loop)
   - Pattern interrupt (jarring or unexpected first line)
   - Contrarian take (against the industry norm)
   - Specific number hook (Hopkins specificity)
   - Question hook (your client's own internal monologue)
   - "They don't want you to know" hook (insider reveal)
   - Future-pace hook (paint the after-state)

   Pull VOC verbatim from `Agent-OS/11-Brand-System/02b-Ideal-Client-VOC.md` wherever a pain, desire, or objection phrase fits. Don't paraphrase your client's words.

3. **Tag and rank.** For each hook, tag style + framework (PAS / AIDA / HSO / BAB / 4Ps / PASTOR / etc.) + VOC phrase pulled (if any). Then pick top 3 to A/B test with one-line reasoning each.

## Output Shape

```
HOOKS FOR: [topic] · AUDIENCE: [audience] · FORMAT: [format]
AWARENESS LEVEL: [1-5] · [one-line why]

1. [hook] · Style: [style] · Framework: [framework] · VOC: [phrase pulled if any]
2. [hook] · Style: [style] · Framework: [framework] · VOC: [phrase pulled if any]
3. [hook] · Style: [style] · Framework: [framework] · VOC: [phrase pulled if any]
4. [hook] · Style: [style] · Framework: [framework] · VOC: [phrase pulled if any]
5. [hook] · Style: [style] · Framework: [framework] · VOC: [phrase pulled if any]
6. [hook] · Style: [style] · Framework: [framework] · VOC: [phrase pulled if any]
7. [hook] · Style: [style] · Framework: [framework] · VOC: [phrase pulled if any]
8. [hook] · Style: [style] · Framework: [framework] · VOC: [phrase pulled if any]
9. [hook] · Style: [style] · Framework: [framework] · VOC: [phrase pulled if any]
10. [hook] · Style: [style] · Framework: [framework] · VOC: [phrase pulled if any]

TOP 3 TO A/B TEST:
- #X: [why]
- #X: [why]
- #X: [why]
```

## Hard Rules

1. **No em dashes.** Use periods, commas, or "..." instead. Pre-flight check every hook before output.
2. **No banned words.** Strip: delve, testament, tapestry, landscape, pivotal, crucial, vibrant, bustling, nestled, underscore, foster, cultivate, overarching, seamless, groundbreaking, revolutionary, profound, leverage, utilize, optimize, transformative, robust, unlock, empower, journey, elevate, disrupt, blueprint, innovative, synergy.
3. **No banned openers/structures.** Never: "In today's market," "Are you tired of," "Imagine a world where," "Let's dive in," "Real talk," "The bottom line," "Here's the thing," "Here's the truth," "Not only X, but also Y."
4. **No filler words.** Strip: just, really, very, actually, basically, literally.
5. **No "FREE" on buttons** (carry-over consistency rule, doesn't usually hit hooks but stays the standard).
6. **One person, not an audience.** Every hook reads like you talking to one ideal client, not a crowd.
7. **VOC verbatim where possible.** If a client pain/desire/objection phrase fits, use their exact words. Don't smooth them.
8. **Mechanism language banned.** No insider jargon or acronyms. Use outcome language.
9. **Match length to format** (see Inputs section). Cut to length, don't pad.
10. **Span styles.** At least 4 distinct styles in the 10. No style used more than 3 times.
11. **Reference, don't restate.** This skill reads from the Copywriter Brain and VOC files at run time. It does not duplicate their content.

## Voice

Direct. Punchy. Real, in-the-car energy. If a hook sounds like a LinkedIn thought leader, rewrite it. If it sounds like you leaning across the table saying "listen," ship it.
