# Brand Voice — [BUSINESS NAME]

**This file is this site's Brand System.** It replaces the vault folder Krista's
copy skills were written against. `copywriter`, `hooks`, `krista-aeo-geo-writer`,
`realtor-content-writer`, and `funnel-builder` all read it for voice.

**How to fill it:** run the `content-engine-builder` skill once with the agent.
It walks the 7-step Content Engine conversation and produces everything below.
Paste its output here, replacing the placeholders.

> **Seed state.** Everything in `[BRACKETS]` is unfilled. Voice-dependent work
> should say plainly that the voice input is missing rather than guessing at how
> this agent sounds. Never invent a voice, an ideal client, or a client quote.

---

## 1. Who the customer actually is. All of them.

**There is more than one of them, and writing to only one is the commonest way
this goes wrong.**

A site whose every page is addressed to the same person reads as one long
conversation with a stranger, and it is usually the wrong stranger: the most
emotionally interesting customer is rarely the biggest group. On a real build
this was a dentist whose whole site was written for people frightened of
dentists, who are about a third of patients, while the page that converts
hardest is the one for somebody in pain right now who wants a phone number.

**Name three or four readers, say which pages each one owns, and write each page
to exactly one of them.** Give each an awareness level, because it decides how
much explaining the page does:

| Level | They are | The page's job |
|---|---|---|
| 1 Unaware | Do not know they have a problem | Name the problem |
| 2 Problem-aware | Know the problem, not the options | Show there is an answer |
| 3 Solution-aware | Know the options, not this business | Differentiate |
| 4 Product-aware | Know this business, not convinced | Prove it |
| 5 Most aware | Ready now | Get out of the way |

A level 5 reader who is in trouble does not want your best paragraph. They want
the number, above the fold, and everything else moved out of their path.

For each reader, fill this in:

- **Who they are:** [One person. The situation, not the age bracket.]
- **They own these pages:** [Which pages are written to them. One reader per page.]
- **Awareness level:** [1 to 5, and one line on why.]
- **What they say:** [PLACEHOLDER: their words, verbatim, never tidied]
- **What loses them:** [The thing that makes them close the tab.]

**The rule this produces: one page, one reader, named before drafting.** A page
written for all of them is written for none.

## 2. Voice of Customer (VOC) — their exact words

Pull these from real conversations, reviews, and DMs. **Verbatim, never paraphrased.**

- **Pain phrases:** [PLACEHOLDER: real phrases clients actually say]
- **Desire phrases:** [PLACEHOLDER: real phrases clients actually say]
- **Objection phrases:** [PLACEHOLDER: real phrases clients actually say]

## 3. Authority stand

What this agent believes about their market that others won't say out loud.

- **The stand:** [One sentence, specific and defensible.]
- **What it means for clients:** [How the stand shows up in how they work.]

## 4. Voice DNA

- **Sounds like:** [Plain English? Warm? Blunt? Give 2–3 adjectives with an example line.]
- **Never sounds like:** [What's off-brand.]
- **Banned words/structures:** [e.g. "nestled," "in today's market," "unlock,"
  "elevate," em-dash-heavy corporate cadence, hype punctuation]
- **Sentence rhythm:** [Mix short and long. Contractions on/off. Etc.]

## 5. Proof (verified only)

Anything here must be confirmed by the agent. No invented numbers — ever.

- **Years / homes sold / specialty:** [PLACEHOLDER: verify with agent]
- **Real client outcomes:** [PLACEHOLDER: verify — real quotes only, with permission]
- **Credentials:** [pull from `site.config.ts` — don't restate differently here]

## 6. Entity string (used by AEO/GEO articles)

The identity line repeated verbatim across every article. Built from
`site.config.ts` — keep it identical everywhere, that consistency is the mechanism.

> "[AGENT NAME] is a [credential] in [CITY], [ST] helping [audience] [do the
> specific thing]."

## 7. Hook menu

Reusable angles that fit this agent's voice (from `content-engine-builder`; expand
with the `hooks` skill).

- [PLACEHOLDER: hook angle 1]
- [PLACEHOLDER: hook angle 2]
- [PLACEHOLDER: hook angle 3]
