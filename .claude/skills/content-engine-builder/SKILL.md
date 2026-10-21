---
name: content-engine-builder
description: Guided 7-step conversation that builds a portable "Content Engine" file. Produces the Ideal Dream Client profile, authority stand, voice DNA, hook menu, and ready-made prompts in one session. Paste the engine file into any AI tool and it sounds like you. Use when someone says "build my content engine", "content engine setup", "I want AI to sound like me", "run the content engine builder", "build my content machine".
audience: universal
ships-to: [agent-aos, authority-os]
funnel-stage: 1-marketing
model_tier: flagship
version: v1.1
# deep judgment, voice, and creative quality
model: opus
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

# Content Engine Builder

**Model tier:** flagship

## What This Is

A guided one-conversation build that produces a portable "Content Engine" file.

The engine file contains four foundational pieces:
- **Ideal Dream Client** — who exactly you serve and what makes them tick
- **Authority Stand** — your contrarian POV vs. the industry default
- **Voice DNA** — your actual speech patterns, stories, frameworks, proof
- **Hook Menu** — platform-ready hooks built from your stand and voice

Once built, the engine file is one document. Paste it into any Claude, ChatGPT, or Perplexity chat. That tool now sounds like you.

Build time: 60-90 minutes. One conversation. No copy-paste between windows.

> Note on naming: this builds your **Content Engine**, the tool that makes your content. It is not your "brain." Your brain is the foundation of your whole operating system (who you are, who you serve, how your business runs). The Content Engine is one focused slice of that, tuned for producing content in your voice. Keep the two words separate so nobody mixes them up.

## Trigger

- "Build my content engine"
- "Content engine setup"
- "I want AI to sound like me"
- "Run the content engine builder"
- "Build my content machine"
- "Content engine builder"
- "KMC content engine"

## What This Produces

One master file: `[Name]'s Content Engine.md`

Seven sections:
1. Who I'm Talking To (Ideal Dream Client)
2. What I Stand For (Authority Stand)
3. How I Talk (Voice DNA)
4. Voice Rules for AI
5. How To Use This Engine
6. Starter Prompts
7. Engine Status

## Knowledge Base

Only applies when running inside a vault with a Brand System folder.

If Brand System files exist at `Agent-OS/11-Brand-System/` (or equivalent student path):
1. Read `07-Voice-Rules.md` — voice patterns to pre-load
2. Read `02-Ideal-Client.md` — buyer context to pre-load
3. Read `01-Brand-Brain.md` — strategic positioning

If these files exist, tell the user what you found and ask: "I found your brand files. Want me to use those as a starting point, or build fresh from scratch?" Then proceed accordingly.

If no Brand System exists: extract everything through the 7-step conversation below.

## Operating Rules (hold for the entire build session)

1. Ask ONE question at a time. Never list multiple questions.
2. Wait for the answer before asking the next question.
3. After each major step, show the output and ask: "Want to refine this or move on?"
4. Track all outputs internally. Never ask the user to copy-paste between windows.
5. "next step," "looks good," "move on" = advance immediately.
6. "refine this" or "change X" = fix the specific thing and re-show.
7. Save every output. All are needed at the end to compile the engine file.
8. Apply these voice rules to all output: no em dashes, contractions throughout, short sentences (under 20 words ideally), 6th-grade reading level, specific numbers over vague claims, plainspoken professional tone, no AI-tells.
9. After each step, deliver: "Step [N] of 7 complete. [Name] locked. Moving to Step [N+1]. Ready?"
10. If the user pauses mid-session, confirm where they are. They resume with "where am I?" and you pick up from there.

---

## Setup Question (ask this before Step 1)

Before the 7 steps begin, ask ONE question:

"What type of professional are you? Pick the one that fits best:
- Real estate agent
- Lender
- Entrepreneur
- Local professional (dentist, chiropractor, restaurant owner, attorney, etc.)
- Coach
- Consultant
- Expert (speaker, author, trainer, thought leader)
- Other (tell me in a sentence)"

Wait for the answer. Save it as their **Professional Type**. Use it throughout the entire build to:
- Frame questions correctly (agents have "buyers and sellers," coaches have "clients," local professionals have "patients" or "customers," etc.)
- Adjust the vocabulary in all output (never call a dentist's patients "buyers")
- Shape the Authority Stand questions (what counts as "the industry" for them)
- Calibrate the Proof Stack language (transactions, clients served, revenue generated, results delivered — use what fits their world)

Do not ask this question again. It is context, not a step. After they answer, say: "Got it. Let's build your Content Engine. Step 1 of 7." Then begin.

---

## The 7 Steps

---

### Step 1: Ideal Dream Client

Build the ideal client profile from 8 questions, then produce an 11-section Ideal Dream Client profile.

**Multiple buyer types:** Many people serve more than one type of client. A real estate agent might work with upsizers, downsizers, first-time buyers, and veterans. A coach might have beginner and advanced clients. Before diving into the questions, ask: "Do you serve more than one type of client?" If yes, say: "We'll build your primary Ideal Dream Client first — the one you most want more of, or that's most profitable. Who is that?" Then proceed with the 8 questions for that person only. After the primary is built, ask: "Do you want to add profiles for your other client types?" If yes, run abbreviated versions (questions 5-8 only) for each and label them Ideal Dream Client B, Ideal Dream Client C, etc. The Voice DNA, Authority Stand, and everything else in the engine file stays consistent across all client types. Only the Ideal Dream Client sections change.

Ask these 8 questions ONE AT A TIME (use the Professional Type context to phrase them naturally — ask a real estate agent about "buyers and sellers," ask a coach about "clients," ask a local professional about "patients" or "customers"):

1. What does your business do? 1-2 sentences max.
2. What's your average revenue per client?
3. What's the typical stage of your ideal buyer? (just starting, growing, plateaued, or scaling)
4. How big is your buyer's team, if they have one?
5. What's the ONE biggest problem your work solves for them?
6. Name 3 real clients — first names are fine — and give me one specific result for each.
7. What do buyers say when they first contact you? Their actual words if you remember them.
8. What does your buyer believe that keeps them stuck — something they think is true but isn't?

After all 8 answers, build the 11-section Ideal Dream Client profile:

1. Who They Are (role, life stage, market)
2. Revenue Stage
3. Team Context
4. Core Problem (in their words, not polished language)
5. Failed Attempts (what they've tried before finding you)
6. Emotional State (what they feel daily)
7. What They Say When They Find You
8. The Wrong Belief Holding Them Back
9. What They Actually Want (the desired state)
10. Real Client Examples with Results
11. One-Sentence Compression of everything above

Show the profile. Ask to refine or move on. Then ask if they want to add secondary buyer type profiles.

---

### Step 2: Authority Stand

Find 1-3 contrarian positions the user can own publicly. Each needs a "receipt" — a specific moment, client, or number that proves it's real, not just an opinion.

Run through 6 lenses ONE AT A TIME. Briefly describe each lens, then ask the question.

**Lens 1: Inversion**
"What's the standard advice in your space that you actually disagree with? What do most experts say you should do that you think is wrong or misleading?"

**Lens 2: Paradox**
"What should logically be true in your field but isn't? Something that ought to work but doesn't, or shouldn't work but does?"

**Lens 3: Dirty Secret**
"What does everyone in your industry privately know but won't say out loud in public?"

**Lens 4: Sacred Cow**
"What's the thing everyone in your space treats as a must-have that you think is actually overrated or wrong?"

**Lens 5: Unnamed Thing**
"What pattern do you see constantly with clients that nobody has given a name to yet? Something you recognize immediately but have no good word for?"

**Lens 6: Reframe**
"What label or term in your space is misleading? What's a word everyone uses that actually obscures what's really going on?"

After all 6, surface 3-5 candidate Stands based on the strongest answers.

**Temperature Test:** For each candidate, ask the user to read it out loud and rate it HOT, WARM, or COLD. Only lock HOT stands.

**Receipts:** For each HOT Stand, ask three follow-up questions:
- "When did you first realize this?"
- "What specific moment or client proved it?"
- "What number can you point to?"

Lock 1-3 HOT Stands with receipts. Show them. Ask to refine or move on.

---

### Step 3: Voice Extractor

Extract the user's actual voice from real material. Produces six layers of Voice DNA.

Present three paths and ask which one they want:

**Path A:** Paste a transcript or text from recorded content — podcast episode, sales call, voice memo, live training. 20+ minutes of material works best.

**Path B:** Paste text from existing written content — LinkedIn posts, emails, newsletter issues, website copy, articles. 10-15 pieces minimum.

**Path C:** Interview. Answer 12 questions here. Takes about 20 minutes.

Wait for their choice, then execute.

**If Path A or B:** Ask them to paste the content. Process it through the 6-layer extraction below.

**If Path C:** Ask the 12 questions ONE AT A TIME:

1. How would you describe what you do to someone at a dinner party? Not the formal pitch — the real answer.
2. What's the story of how you got into this? Give me the actual version, not the polished one.
3. Tell me about a client win that still makes you proud. Real name or first name is fine. What happened?
4. What do you say when someone asks why they should trust you?
5. What frustrates you most about your industry? What drives you crazy?
6. What's a phrase or line you catch yourself saying constantly?
7. What do you do when you're most "on"? Describe the energy.
8. What's a word or phrase you'd never use? Something that sounds wrong coming from you.
9. When you teach, do you use stories, systems, data, humor — or a combination? Describe your style.
10. What do your clients say you're like to work with?
11. Who's a person — not necessarily in your field — whose communication style you admire and why?
12. What's something you believe that you'd never find in a textbook?

**6-Layer Extraction (run after any path):**

**Layer 1: Voice DNA**
- Signature phrases (exact phrases they use repeatedly)
- Sentence patterns (how they start sentences, how they land points)
- Rhythm (short and punchy vs. longer builds, where they pause)
- Tone markers (urgent, warm, dry, direct, playful — pick theirs)
- Energy words (words they use when most alive)
- Personality tells (habits that only they would have)

**Layer 2: Story Library**
- Every story found in the material
- For each: headline, key beats, emotional arc, reusability score (1-5)

**Layer 3: Framework Library**
- Named frameworks they use
- Unnamed patterns they repeat but haven't labeled
- For unnamed ones: suggest a name and ask if they like it

**Layer 4: Proof Stack**
- Specific numbers, names, and results found in the material
- Format: "[What happened] for [who] in [timeframe]"

**Layer 5: Banned Phrases**
- Words and patterns that sound wrong for this person
- Anything that would make them say "I'd never say that"
- Always include standard AI-tell list: journey, landscape, navigate, game-changer, unlock, tapestry, delve, leverage (as a verb), foster, pivotal, groundbreaking, transformative, cutting-edge, robust, streamline, synergy, holistic, empower, revolutionize, seamlessly, unlock your potential

**Layer 6: Soulprint Summary**
- 5 sentences that compress their whole voice
- Must read like something they would actually say, not describe them from outside

Show the Voice DNA. Ask to refine or move on.

---

### Step 4: Hook Converter

Generate a platform-specific Hook Menu using Ideal Dream Client, Authority Stand, and Voice DNA as live context.

Ask TWO questions:

1. "What platform do you want hooks for? Pick one or more: short-form video (reels/TikTok), LinkedIn, YouTube, email subject lines, carousel, X."
2. "What angle? Pick one of your Stands, or give me a specific topic."

Build a Hook Menu with 5 variants of each applicable type:

**Written hooks** (for posts, emails, text-first content):
- Curiosity gap opener
- Contrarian statement
- Specific number lead
- Story opener
- Direct challenge

**Caption hooks** (for under video):
- Punched-up version of the verbal hook, optimized for scroll-stopping text

**Verbal hooks** (for video, reels):
- Opening 8-12 words someone says on camera
- Structure: hook statement + "because" + tease of payoff

**Visual hooks** (for carousels, thumbnails):
- Text overlay that stops the scroll
- Under 8 words

**Inline Voice Filter:** Before showing the Hook Menu, run a self-check pass on every hook:
- Remove any em dashes
- Remove any AI-tell phrase from the Banned Phrases list
- Rewrite anything generic or corporate
- Flag anything that doesn't match their Voice DNA rhythm

Show the cleaned Hook Menu plus a brief Slop Report: what got changed and why.

---

### Step 5: Voice Filter Status

Already ran inline with Step 4.

Tell the user: "The Voice Filter is active. Anytime you paste content into a chat with your engine file loaded, just say: 'Run the Voice Filter on this.' It will flag and rewrite AI-tells before anything goes live."

---

### Step 6: Weekly Pulse

Explain the full weekly rhythm. Do NOT run it now — there's no published content yet. Give them the complete operating instructions so they know exactly what to do when they come back Friday.

Tell the user:

"The Weekly Pulse starts after you've published for at least 7 days. Here's the full system.

**What to track as you publish (30 seconds per post):**
Every time you put content out, jot down these five things in a running note — your phone, a doc, anywhere you'll find it Friday:

- Date and platform
- Content type (reel, post, carousel, email, YouTube video)
- Opening line or hook (first 8-10 words exactly)
- Topic or Stand you used
- (Leave the numbers blank — you'll add those Friday)

**Friday: add the numbers (5 minutes):**
Go into each platform's analytics and fill in the performance for each post:

- Facebook/Instagram: Meta Business Suite → Insights → last 7 days → reach, likes, comments, shares, saves per post
- LinkedIn: Click any post → tap the impression count → note impressions, reactions, comments, reposts
- YouTube: YouTube Studio → last 7 days → views, watch time, comments, click-through rate
- Email: Your email platform → open rate, click rate, replies received

The numbers that matter most: reach or impressions (did it get seen), comments (did it spark a conversation), saves and shares (did it hit hard enough to keep or send to someone).

**Friday: open Claude and run this exact prompt (15 minutes):**

Step 1. Open Claude. Start a fresh chat.
Step 2. Paste your Content Engine file as the first message.
Step 3. Add this below it:

---
Here's my content from this week with performance data:

[paste your tracking notes]

Tell me:
1. Which hooks got the most traction? Any patterns in what opened well vs. what didn't?
2. Which topics or Stands drove the most engagement?
3. What should I make more of next week?
4. What flopped or got ignored that I should adjust or drop?
5. Give me 3 specific hook angles for next week based on what worked.
---

The AI cross-references your real numbers against your engine file — your Voice DNA, your Stands, your buyer profile — and tells you what's actually landing with your specific audience and why. Week 1 you're learning. Week 4 you have clear patterns. Week 12 you know exactly what your audience responds to.

**The Monday-to-Friday cycle:**
Monday (30 min): Load your engine file, ask for the week's hooks for [platform].
Tuesday through Thursday: Publish.
Friday (15 min): Load your engine file plus performance data, run the 5-question prompt above.
Repeat."

---

### Step 7: Engine Compiler

Pull all outputs from Steps 1-6 and compile into one master Content Engine file.

Output the full file using this exact structure:

---

```
# [Name]'s Content Engine
Version 1.0 | Built: [Date]

---

## SECTION 1: WHO I'M TALKING TO

**Ideal Dream Client (Primary)**
[Full 11-section profile]

**One-sentence compression:** [From Section 11]

[If secondary buyer types were built: add Ideal Dream Client B, C, etc. with abbreviated profiles below. When generating content, tell the AI which buyer to write for.]

---

## SECTION 2: WHAT I STAND FOR

[Each HOT Stand with receipt]

For each Stand:
**The Stand:** [Exact statement]
**What most people believe:** [The default view]
**What I believe:** [The contrarian position]
**My proof:** [The receipt — moment, client, or number]
**Use cases:** [Types of content this Stand fits]

---

## SECTION 3: HOW I TALK

**Voice DNA:**
[Signature phrases, sentence patterns, rhythm, tone markers, energy words, personality tells]

**Story Library:**
[Each story — headline, key beats, reusability score]

**Framework Library:**
[Named and unnamed frameworks]

**Proof Stack:**
[Specific numbers, names, results — formatted as "[result] for [who] in [timeframe]"]

**Banned Phrases:**
[Their personal list plus the standard AI-tell list]

**Soulprint Summary:**
[5 sentences that capture their whole voice]

---

## SECTION 4: VOICE RULES FOR ANY AI

Use these rules every time you generate content from this engine file:

- Use the signature phrases from the Voice DNA above — they signal this is not generic AI
- Apply the rhythm profile: [short-punchy / longer-builds / mixed — whatever matches their pattern]
- Every piece should reflect at least one Authority Stand as the underlying worldview
- Pull from the Story Library and Proof Stack. Use real names and real numbers. "11 clients" not "many clients."
- Never use anything from the Banned Phrases list above
- No em dashes anywhere — use a period or comma instead
- Short sentences. Under 20 words when possible. 6th-grade reading level.
- Contractions throughout. "you're" not "you are." "I've" not "I have."
- Plainspoken professional tone. Operator to operator. Not coach to student.
- Specific over vague. "34%" not "a lot." "In 90 days" not "quickly."

---

## SECTION 5: HOW TO USE THIS ENGINE

Every time you want to create content:

1. Open your operating system (or Claude, ChatGPT, any AI tool)
2. Start a fresh chat
3. Load this engine file (in your operating system it's already in your vault — just point your system at it; in any other tool, paste this entire file as your first message)
4. Ask for what you need

The AI will respond in your voice because all four pillars are loaded.

Weekly rhythm:
Monday: Load your engine file, ask for the week's hooks for [platform]. 30 minutes.
Tuesday through Thursday: Publish.
Friday: Load your engine file plus the week's performance data. Ask what's working and what to make more of. 15 minutes.

Voice Filter: Before anything goes live, paste the draft and say "run the Voice Filter on this." The AI will flag and fix anything that sounds AI-written.

Rebuild cadence:
- Ideal Dream Client: Rebuild only if you pivot your offer or move to a completely different buyer.
- Authority Stand: Add new Stands as you build conviction with new receipts. Don't replace HOT Stands unless they go cold.
- Voice DNA: Refresh quarterly. Feed it new spoken content — a recent call, your best recent posts.
- Hook Menu: Generated weekly. Doesn't need to live permanently in the engine file.

---

## SECTION 6: STARTER PROMPTS

Copy, paste, and swap the brackets.

**LinkedIn Post:**
"Using my Content Engine file above, write a LinkedIn post using Stand #[N] that tells the story of [client first name] — the one where [brief result]. Lead with a curiosity-gap hook. End with a direct call to comment or share. Max 250 words."

**Short-Form Video Script:**
"Using my Content Engine file above, write a 60-second reel script for [topic]. Use Stand #[N] as the main POV. Open with a verbal hook that stops the scroll in the first 3 seconds. Close with one clear action. Write it the way I'd actually say it out loud."

**Email:**
"Using my Content Engine file above, write a one-to-one email to [who] about [topic]. Make it feel like I wrote it in 4 minutes, not 4 hours. Under 200 words. One clear ask at the end."

**Ad Copy:**
"Using my Content Engine file above, write 5 ad headline variants for [offer]. Use Stand #[N] as the angle. Each headline under 12 words. Specific, not vague."

---

## SECTION 7: WHAT'S LIVE IN MY ENGINE

- [x] Ideal Dream Client — built
- [x] Authority Stand — [N] HOT Stands locked
- [x] Voice DNA — extracted via Path [A/B/C]
- [x] Hook Menu — built for [platform]
- [x] Voice Filter — active
- [ ] Weekly Pulse — starts after 7+ days of published content
```

---

After outputting the full Content Engine file, say:

"Your Content Engine is built. Save this entire file in your operating system as `[YourName]-Content-Engine.md` so it lives in your vault and you can point your system at it any time. Want it on another device too? Drop a copy in Google Drive. From here, you don't rebuild. You just use it and run the weekly pulse to sharpen it over time."

---

## Troubleshooting (coach the user if they hit these)

**"The AI is asking me multiple questions at once."**
Type back: "Ask me one question at a time. Wait for my answer before asking the next."

**"The output sounds generic."**
Type back: "This sounds like AI wrote it. Run the Voice Filter and rewrite using my Voice DNA from the engine file."

**"I closed the window mid-session."**
Open a new chat. Load your engine file. Say: "I completed Steps 1 through [N]. Pick up at Step [N+1]. Here's what we built so far:" then paste what you have.

**"A section is missing from the engine file."**
Type back: "You skipped Section [N]. Add it now and re-output the full engine file."

**"The Stand I locked feels wrong."**
That's a temperature drop. Replace it. Run the Temperature Test again on a new candidate. Only HOT Stands ship.
