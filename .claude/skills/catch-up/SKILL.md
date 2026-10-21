---
name: catch-up
description: Show the agent what their site could be doing and isn't — reporting, pixels, heatmaps, the AI caller's knowledge base, IDX, listing coordinates, local facts — then switch on whichever ones they pick. Use when someone says "catch me up", "what am I missing", "what's new", "did I miss any updates", "what else can my site do", "am I using everything", or after an engine update has landed.
model: sonnet
---

# Catch up

## What this is for

`launch:check` answers *"is anything here wrong?"*. This answers the other
question: ***"is anything here switched off?"*** — and nothing else asks it.

The gap is structural. An engine update ships **files**. Some are complete the
moment they land: canonical tags and social previews started working on every
site the day they arrived and nobody had to know. Others arrive **inert** —
reporting, pixels, heatmaps, the AI caller, IDX. Every one of those needs a
person to create an account, paste an ID, or set a secret before a single line
of the shipped code does anything.

So an agent can accumulate six months of improvements and be sitting on three
switched-off features with no way to find out. The gate won't say anything,
because nothing is broken.

## How to run it

```bash
npm run catchup
```

It reads the config and content and reports three groups: already working,
switched off, and *cannot check from here*. It changes nothing.

## The conversation

**Lead with upside, never with a list of chores.** These are opportunities the
agent already paid for and hasn't collected. "Three things your site can do
that it isn't" beats "you have 9 issues."

1. **Run it and read the output yourself first.** Decide which two or three
   actually matter for this agent right now. Do not read all nine aloud.
2. **Lead with the one with the best ratio of value to effort.** Usually that
   is analytics or the pixel: ten free minutes, and without them every
   marketing decision after today is a guess.
3. **Name what it gives them, not what the field is called.** The script's
   wording is written for reading aloud — use it.
4. **Say the cost honestly, including the slow ones.** IDX is two minutes of
   our work and *days to weeks* of MLS and broker approval, and it does not
   help them rank. Local facts are real writing, about twenty minutes an area.
   An agent who finds that out afterwards stops trusting the rest.
5. **Offer, then stop.** They pick. Route to the skill named in "To do it".
6. **Write down what they declined** in `content/OPEN-ITEMS.md`, with the word
   "declined". The script reads that back and stops offering it. Nagging is how
   this becomes something they avoid running.

## The three items that need more than a mention

**Tracking.** Switching on a pixel changes what the privacy policy has to
disclose, and `launch:check` fails a site whose policy never names a configured
vendor. Do both in the same sitting or neither. See
`.claude/rules/legal-compliance.md` §9 — and note most solo agents are *not*
subject to CCPA, so don't tell them they are.

**Local facts.** This is the only item on the list that is real work, and it is
also the one that decides whether a few hundred area pages rank or get read as
one page with the town name swapped. Don't bury it under the ten-minute items,
and don't pretend it is quick.

**Where the leads go.** The script cannot read environment variables, so it
never claims the CRM is broken. If the agent has never seen a test lead arrive,
run `npm run test:ghl` and find out. A site that accepts a form and drops the
lead looks perfect from the outside — it returns a thank-you either way.

## What it deliberately does not do

- **It never fixes anything.** Every item is the agent's decision: their money,
  their accounts, their clients' data.
- **It never reports a declined item as missing.**
- **It never guesses at what it cannot see.** GitHub secrets and host
  environment variables are reported as "cannot check from here", never as
  "missing" — a confident wrong answer about the CRM is worse than no answer.

## After an engine update

Run this immediately after. An update's changelog describes what changed in
the *engine*; this describes what is missing from *their site*, which is the
only one of the two they can act on.
