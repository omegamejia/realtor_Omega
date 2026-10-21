# Image sourcing rules

Referenced by `image-creator` (Krista's skill, copied verbatim). The authoritative
ladder lives in **`.claude/skills/image-manager/SKILL.md` → "Sourcing"**. Summary:

## Where an image may come from — in order, stop at the first that works

1. **The agent's own photos** — theirs, their brokerage's, or their photographer's
   (confirm usage rights).
2. **Properly-licensed free stock** — Unsplash, Pexels, Openverse. Verify the
   license per image; commercial use must be permitted.
3. **Paid stock** the agent buys.
4. **AI-generated** — generic/abstract only (textures, backgrounds, concepts).

## Approved AI image tools

`image-creator` produces the *prompt*; the agent runs it in one of the free tools
that skill lists (Google Gemini/Imagen and the alternatives named there). This repo
does not generate or host images itself.

## The hard line

**Never present a stock or AI image as a real photo of a real place.** Not in the
image, caption, alt text, filename, or placement. On a real-estate site that's a
trust problem and potentially a compliance one — the same "never fabricate" rule
that governs stats and reviews.

When a real local photo isn't available, prefer an honest alternative: a map embed,
a clearly generic scene, or an empty slot. Tell the agent which images are stock.

## Provenance

Every non-agent image gets a line in `public/images/CREDITS.md` (source + license),
so nothing untraceable ships.
