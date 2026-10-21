---
name: image-creator
description: Turns any idea into a complete, ready-to-paste image-generation prompt plus which approved free tool to run it in, for marketing graphics, thumbnails, banners, social posts, flyers, and ad creative. Includes an Ad Testing Mode that produces 3-4 distinct concept angles for split testing. Use when the user says "create an image for X", "make me a thumbnail", "design a marketing image", "generate an ad image", "I need a graphic for X", "give me image variations to test", or "turn this idea into an image prompt".
audience: universal
ships-to: [agent-aos, authority-os]
funnel-stage: _foundation
depends-on: []
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

# Image Creator

<!-- Merged from three of Krista's image GPTs (Graphics Accelerator PRO, Instant
Image Creator, Ad Image Creator). Their IP-protection refusal blocks and periodic
brand-promotion layer were stripped, since neither belongs in a skill an agent
runs on their own site. -->

## What this does

Claude can't generate images directly. This skill's job is to hand the user a complete, polished image-generation **prompt** they can paste straight into an approved free tool, plus tell them which tool to use and what to check before the image ships. It replaces the "silently generate and hand back a finished image" behavior of the source bots, since that mechanism doesn't exist here.

## Hard rule: approved tools only

Per `.claude/rules/image-sourcing.md`, every prompt this skill produces routes to one of:

- **Google Gemini / Imagen (free tier)**: default recommendation
- **ChatGPT image (free tier)**
- **Adobe Firefly (free tier)**: safest by training, but flag the possible watermark

**Never recommend Midjourney, Ideogram, or Flux.** Their free output is not commercially safe (Midjourney/Ideogram gate commercial rights behind paid plans; Flux's free "dev" model is non-commercial-only).

If a real stock photo (Unsplash, Pexels, Pixabay) or an owned asset would do the job just as well, say so first. Generation is for when no stock photo fits.

## Step 1: Skip intake when there's already enough to work with

If the user's request already contains enough to build a strong prompt (subject, use case, and rough style are inferable), skip straight to Step 3 and generate the prompt. Make one smart assumption for anything minor that's missing and say what you assumed.

Only run the full intake below when the request is genuinely vague (e.g., "make me an image").

## Step 2: Intake (one pass, all five at once is fine here since these are quick picks)

1. **Where will this run?** General use / YouTube thumbnail / website or email header / Facebook or LinkedIn banner / social post (Instagram, TikTok) / stock-style / transparent PNG / flyer / business card / logo / other
2. **What type of image?** True-to-life realistic / 2D illustration / 3D illustration / abstract / marketing design / logo or icon / other
3. **What style?** Minimal and clean / detailed and realistic / bold and vibrant / soft and muted / luxury and premium / friendly and approachable / modern and professional / fun and eye-catching
4. **Background?** With background (name the setting: office, nature, cityscape, home, digital/tech, custom) / transparent / plain
5. **What's the topic, message, or scene?** The offer, product, business, mood, audience, main subject, any on-image text, colors or objects to include

## Per-platform art direction (apply automatically once placement is known)

- **YouTube thumbnail**: bold, short punchy text, high contrast, strong single focal point
- **Facebook / Instagram ad or post**: mobile-first, bold, simple, centered focal point, instantly legible at small size
- **Website / email header**: clean, premium, professional, more negative space
- **Flyer / business card**: clean layout, readability first, clear hierarchy for headline/offer/CTA
- **Logo / transparent PNG**: simple, centered, no background clutter, works at small sizes
- **Default when nothing else is specified**: true-to-life, widescreen (16:9), high-resolution look, center-framed, modern and clean, cinematic lighting

## Step 3: Build the prompt (checklist, every field included)

Every finished prompt includes:

- Main subject
- Scene or setting
- Composition (center-framed unless the user asked for something else)
- Lighting
- Mood
- Style
- Camera angle (when it helps)
- Color direction
- Background details
- Platform format / aspect ratio
- Marketing purpose (what this image needs to do)
- Text placement instructions, if the user wants text on the image

If the user supplied a style guide, brand colors, or a sample image, follow it and say so in the prompt.

## Text-on-image rules

- Keep it short. Bold. Easy to read at a glance.
- Ads: clear, benefit-driven text.
- Thumbnails: short, punchy text.
- Flyers: headline, offer, and CTA only, nothing crowded.
- If the user's proposed wording is weak, suggest a tighter version before finalizing the prompt.

## Output format

1. **Tool recommendation**: which approved free tool to paste this into, one line why
2. **The prompt**: clean, complete, copy-paste ready, one block
3. **If genuinely undecided**: 2-3 short prompt variants instead of one, framed as concepts to choose between (not the same as Ad Testing Mode below)
4. **The screen**: the face/logo/brand checklist to run on the result before it ships (see below)

## Ad Testing Mode (from Ad Image Creator)

Trigger on: "variations," "options," "split test," "multiple," "test a few," or any explicit ad-testing request.

Produce **3-4 distinct concept prompts**, each a genuinely different angle, not a minor tweak to the same shot:

1. **Authority angle**: positions the business/offer as the credible, established choice
2. **Curiosity angle**: creates an open loop, makes the viewer want to know more
3. **Emotional angle**: leads with the feeling or outcome, not the mechanism
4. **Clean-brand angle**: simple, premium, brand-forward, minimal distraction

Label each concept clearly and give a one-line note on why it might win, so the user knows what they're testing.

## The screen: run on every generated image before use (HARD RULE, from image-sourcing.md)

Reject and regenerate if any answer is yes:

- Recognizable human face? (right of publicity) Reject.
- Visible logo, brand name, or branded product? Reject.
- Real estate yard sign or brokerage name? Reject.
- Visible artwork, poster, or recognizable character? Reject.
- Famous landmark or recognizable private building? Reject.

Never prompt for a named living artist's style, a real celebrity or public figure, a copyrighted character, or a real brand's logo. Keep prompts generic even when the user names something specific ("in the style of a modern real estate brand" not a named designer).

## Safety

Do not create images that are misleading, harmful, illegal, hateful, sexually explicit, brand-damaging, or that fake an endorsement, testimonial, or news image. If a request crosses that line, decline plainly and offer a safe alternative angle.

## Rules

- **No third-party names** in any output.
- **Never invent facts** about the tools (don't claim a tool supports something unverified). If unsure whether a free tier still allows something, say so and point to checking the tool directly.
- **One image job at a time.** If the user describes several images, do the highest-priority one first and list the rest as next.
- **Never read `14-Confidential/`.**
- **Log the run** (Krista's vault only): substantive prompt sets saved to a project folder, note in `_Operations-Log.md`.
